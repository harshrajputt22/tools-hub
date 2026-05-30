"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";
import {
  Key,
  List,
  MessageSquare,
  ArrowDown,
  FileText,
  File,
  Anchor,
  Link
} from "lucide-react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { Minimize2 } from "lucide-react";

// ============================================================
// YAML FORMATTER ENGINE
// Pure JS — no external dependency
// Handles: mappings, sequences, scalars, anchors, aliases,
// multi-line strings, comments, directives, nested structures
// ============================================================

// ── YAML Tokenizer ────────────────────────────────────────────
const YT = {
  COMMENT:     "COMMENT",
  DIRECTIVE:   "DIRECTIVE",
  DOC_START:   "DOC_START",
  DOC_END:     "DOC_END",
  KEY:         "KEY",
  VALUE:       "VALUE",
  SEQ_ENTRY:   "SEQ_ENTRY",
  ANCHOR:      "ANCHOR",
  ALIAS:       "ALIAS",
  TAG:         "TAG",
  BLANK:       "BLANK",
};

// ── YAML scalar type detection ────────────────────────────────
function detectScalarType(val) {
  if (!val || val === "null" || val === "~")   return "null";
  if (val === "true"  || val === "false")       return "boolean";
  if (val === "yes"   || val === "no")          return "boolean-compat";
  if (val === "on"    || val === "off")         return "boolean-compat";
  if (/^-?[0-9]+$/.test(val))                  return "integer";
  if (/^-?[0-9]*\.[0-9]+$/.test(val))          return "float";
  if (/^0x[0-9a-fA-F]+$/.test(val))            return "hex";
  if (/^0o[0-7]+$/.test(val))                  return "octal";
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}/.test(val))return "date";
  if (val.startsWith("&"))                      return "anchor";
  if (val.startsWith("*"))                      return "alias";
  if (val.startsWith("!!"))                     return "tag";
  return "string";
}

// ── Needs quoting? ────────────────────────────────────────────
function needsQuotes(val) {
  if (!val) return false;
  // Already quoted
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) return false;

  const dangerous = [
    /^[\s]|[\s]$/,          // leading/trailing whitespace
    /^[{}\[\]|>&*!,%@`]/,   // YAML special chars at start
    /:/,                     // colon (potential key confusion)
    /#/,                     // comment char
    /^(true|false|yes|no|on|off|null|~)$/i, // YAML booleans/null
    /^[0-9]/,                // number-like
    /\n/,                    // newline
  ];
  return dangerous.some((r) => r.test(val));
}

// ── Quote a string value ──────────────────────────────────────
function quoteString(val, style = "double") {
  if (!val) return '""';
  if ((val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))) return val;

  if (style === "single") {
    // Single quotes — escape ' by doubling
    return `'${val.replace(/'/g, "''")}'`;
  }
  // Double quotes — escape special chars
  return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t")}"`;
}

// ── Parse YAML into structured lines ─────────────────────────
function parseYamlLines(raw) {
  const lines   = raw.split("\n");
  const parsed  = [];

  for (let i = 0; i < lines.length; i++) {
    const raw_line = lines[i];
    const trimmed  = raw_line.trim();

    // Blank line
    if (!trimmed) {
      parsed.push({ type: YT.BLANK, indent: 0, raw: raw_line });
      continue;
    }

    // Directives (%YAML, %TAG)
    if (trimmed.startsWith("%")) {
      parsed.push({ type: YT.DIRECTIVE, indent: 0, value: trimmed, raw: raw_line });
      continue;
    }

    // Document markers
    if (trimmed === "---") {
      parsed.push({ type: YT.DOC_START, indent: 0, value: "---", raw: raw_line });
      continue;
    }
    if (trimmed === "...") {
      parsed.push({ type: YT.DOC_END, indent: 0, value: "...", raw: raw_line });
      continue;
    }

    // Comment
    if (trimmed.startsWith("#")) {
      const indent = raw_line.length - raw_line.trimStart().length;
      parsed.push({ type: YT.COMMENT, indent, value: trimmed, raw: raw_line });
      continue;
    }

    const indent = raw_line.length - raw_line.trimStart().length;

    // Sequence entry
    if (trimmed.startsWith("- ") || trimmed === "-") {
      const rest = trimmed.slice(1).trim();

      // Inline comment on seq entry
      let value   = rest;
      let comment = null;
      const hashIdx = findCommentHash(rest);
      if (hashIdx !== -1) {
        comment = rest.slice(hashIdx).trim();
        value   = rest.slice(0, hashIdx).trim();
      }

      parsed.push({
        type: YT.SEQ_ENTRY,
        indent,
        value,
        comment,
        raw: raw_line,
      });
      continue;
    }

    // Block scalar indicators (| or >)
    const blockMatch = trimmed.match(/^([^:]+):\s*([|>][+-]?\d*)\s*(#.*)?$/);
    if (blockMatch) {
      const key      = blockMatch[1].trim();
      const indicator= blockMatch[2];
      const comment  = blockMatch[3] || null;

      // Collect subsequent indented lines as block content
      const blockLines = [];
      let j = i + 1;
      while (j < lines.length) {
        const bl = lines[j];
        const bt = bl.trim();
        if (!bt || bl.length - bl.trimStart().length > indent) {
          blockLines.push(bl);
          j++;
        } else break;
      }

      parsed.push({
        type:       "BLOCK_SCALAR",
        indent,
        key,
        indicator,
        comment,
        blockLines,
        raw:        raw_line,
      });
      i = j - 1;
      continue;
    }

    // Key: value pair
    const colonIdx = findMappingColon(trimmed);
    if (colonIdx !== -1) {
      const key   = trimmed.slice(0, colonIdx).trim();
      const rest  = trimmed.slice(colonIdx + 1).trim();

      let value   = rest;
      let comment = null;

      // Inline comment
      const hashIdx = findCommentHash(rest);
      if (hashIdx !== -1 && !isInsideQuotes(rest, hashIdx)) {
        comment = rest.slice(hashIdx).trim();
        value   = rest.slice(0, hashIdx).trim();
      }

      // Empty value (next lines are nested)
      parsed.push({
        type: YT.KEY,
        indent,
        key,
        value,
        comment,
        raw: raw_line,
      });
      continue;
    }

    // Plain value (continuation or scalar)
    parsed.push({
      type:   YT.VALUE,
      indent,
      value:  trimmed,
      raw:    raw_line,
    });
  }

  return parsed;
}

// Find the colon that separates a mapping key from value
// Avoids colons inside quotes or URLs
function findMappingColon(str) {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === ":" && !inSingle && !inDouble) {
      // Valid mapping colon: followed by space, end of string, or nothing
      if (i + 1 >= str.length || str[i + 1] === " " || str[i + 1] === "\t") {
        return i;
      }
    }
  }
  return -1;
}

// Find a # comment that's not inside quotes
function findCommentHash(str) {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "#" && !inSingle && !inDouble) {
      // Comment only valid if preceded by whitespace
      if (i === 0 || /\s/.test(str[i - 1])) return i;
    }
  }
  return -1;
}

function isInsideQuotes(str, pos) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < pos; i++) {
    if (str[i] === "'" && !inDouble) inSingle = !inSingle;
    if (str[i] === '"' && !inSingle) inDouble = !inDouble;
  }
  return inSingle || inDouble;
}

// ── Format YAML ───────────────────────────────────────────────
function formatYaml(raw, options = {}) {
  const {
    indentSize      = 2,
    useTabs         = false,
    quoteStyle      = "preserve",  // preserve | single | double | minimal
    sortKeys        = false,
    removeComments  = false,
    addDocumentStart= false,
    compactSequences= false,       // - items on same level as key
    normalizeBoolean= false,       // yes/no/on/off → true/false
    normalizeNull   = false,       // ~ → null
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  const indentStr = useTabs ? "\t" : " ".repeat(indentSize);

  try {
    const lines  = parseYamlLines(raw.trim());
    const output = renderYaml(lines, {
      indentStr,
      quoteStyle,
      sortKeys,
      removeComments,
      addDocumentStart,
      compactSequences,
      normalizeBoolean,
      normalizeNull,
      originalIndentSize: detectIndentSize(raw),
    });

    return {
      success: true,
      output:  output.trimEnd(),
      stats:   computeStats(raw, output, lines),
    };
  } catch (e) {
    return { success: false, output: "", error: `Format error: ${e.message}` };
  }
}

function detectIndentSize(raw) {
  const lines   = raw.split("\n");
  const indents = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    if (indent > 0) indents.push(indent);
  }
  if (indents.length === 0) return 2;
  // GCD of all indents
  const gcd  = (a, b) => b === 0 ? a : gcd(b, a % b);
  return indents.reduce((a, b) => gcd(a, b));
}

function renderYaml(lines, opts) {
  const {
    indentStr,
    quoteStyle,
    sortKeys,
    removeComments,
    addDocumentStart,
    normalizeBoolean,
    normalizeNull,
    originalIndentSize,
  } = opts;

  let out          = "";
  let prevWasBlank = false;
  let hasDocStart  = lines.some((l) => l.type === YT.DOC_START);

  if (addDocumentStart && !hasDocStart) {
    out += "---\n";
  }

  function normalizeValue(val) {
    if (!val) return val;
    let v = val.trim();

    if (normalizeNull && (v === "~")) v = "null";
    if (normalizeBoolean) {
      if (/^(yes|on)$/i.test(v))  v = "true";
      if (/^(no|off)$/i.test(v))  v = "false";
    }

    if (quoteStyle === "minimal") {
      // Only quote if necessary
      if (needsQuotes(v) && !v.startsWith('"') && !v.startsWith("'")) {
        v = quoteString(v, "double");
      }
    } else if (quoteStyle === "double") {
      const type = detectScalarType(v);
      if (type === "string" && !v.startsWith('"') && !v.startsWith("'") &&
          !v.startsWith("&") && !v.startsWith("*") && !v.startsWith("!")) {
        v = quoteString(v, "double");
      }
    } else if (quoteStyle === "single") {
      const type = detectScalarType(v);
      if (type === "string" && !v.startsWith('"') && !v.startsWith("'") &&
          !v.startsWith("&") && !v.startsWith("*") && !v.startsWith("!")) {
        v = quoteString(v, "single");
      }
    }
    // "preserve" — leave as-is

    return v;
  }

  function pad(indentLevel) {
    return indentStr.repeat(Math.max(0, indentLevel));
  }

  function indentToLevel(rawIndent) {
    if (originalIndentSize === 0) return 0;
    return Math.floor(rawIndent / originalIndentSize);
  }

  // If sortKeys is enabled, we need to group and sort
  // For now, render in order (sorting requires full AST)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const level = indentToLevel(line.indent);

    switch (line.type) {

      case YT.BLANK: {
        // Suppress multiple consecutive blanks
        if (!prevWasBlank) {
          out += "\n";
          prevWasBlank = true;
        }
        continue;
      }

      case YT.DIRECTIVE: {
        out += `${line.value}\n`;
        prevWasBlank = false;
        break;
      }

      case YT.DOC_START: {
        out += "---\n";
        prevWasBlank = false;
        break;
      }

      case YT.DOC_END: {
        out += "...\n";
        prevWasBlank = false;
        break;
      }

      case YT.COMMENT: {
        if (removeComments) break;
        out += `${pad(level)}${line.value}\n`;
        prevWasBlank = false;
        break;
      }

      case YT.KEY: {
        const key     = line.key;
        const rawVal  = line.value || "";
        const val     = normalizeValue(rawVal);
        const comment = line.comment && !removeComments ? `  ${line.comment}` : "";

        if (val === "" || val === null || val === undefined) {
          // Key with empty value (nested follows)
          out += `${pad(level)}${key}:${comment}\n`;
        } else {
          out += `${pad(level)}${key}: ${val}${comment}\n`;
        }
        prevWasBlank = false;
        break;
      }

      case YT.SEQ_ENTRY: {
        const rawVal  = line.value || "";
        const val     = normalizeValue(rawVal);
        const comment = line.comment && !removeComments ? `  ${line.comment}` : "";

        if (val === "") {
          out += `${pad(level)}-${comment}\n`;
        } else {
          out += `${pad(level)}- ${val}${comment}\n`;
        }
        prevWasBlank = false;
        break;
      }

      case "BLOCK_SCALAR": {
        const key       = line.key;
        const indicator = line.indicator;
        const comment   = line.comment && !removeComments ? `  ${line.comment}` : "";

        out += `${pad(level)}${key}: ${indicator}${comment}\n`;

        // Re-indent block content
        const blockLevel = level + 1;
        for (const bl of line.blockLines) {
          if (!bl.trim()) {
            out += "\n";
          } else {
            // Calculate original block indent
            const origIndent = bl.length - bl.trimStart().length;
            out += `${pad(blockLevel)}${bl.trimStart()}\n`;
          }
        }
        prevWasBlank = false;
        break;
      }

      case YT.VALUE: {
        const val = normalizeValue(line.value);
        out += `${pad(level)}${val}\n`;
        prevWasBlank = false;
        break;
      }
    }

    if (line.type !== YT.BLANK) prevWasBlank = false;
  }

  return out;
}

function computeStats(raw, output, lines) {
  const keys     = lines.filter((l) => l.type === YT.KEY).length;
  const seqItems = lines.filter((l) => l.type === YT.SEQ_ENTRY).length;
  const comments = lines.filter((l) => l.type === YT.COMMENT).length;
  const blanks   = lines.filter((l) => l.type === YT.BLANK).length;
  const docs     = lines.filter((l) => l.type === YT.DOC_START).length;

  return {
    inputLength:  raw.length,
    outputLength: output.length,
    inputLines:   raw.split("\n").length,
    outputLines:  output.split("\n").length,
    keys,
    seqItems,
    comments,
    docs: docs || 1,
  };
}

// ── YAML Minifier ─────────────────────────────────────────────
function minifyYaml(raw) {
  if (!raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    // YAML can't truly be "minified" like JSON — we convert to compact flow style
    // Best approach: remove comments and blank lines, normalize whitespace
    const lines = raw.split("\n");
    const out   = lines
      .filter((l) => {
        const t = l.trim();
        return t && !t.startsWith("#");
      })
      .map((l) => {
        // Remove inline comments
        const hashIdx = findCommentHash(l);
        if (hashIdx !== -1) return l.slice(0, hashIdx).trimEnd();
        return l;
      })
      .filter((l) => l.trim())
      .join("\n");

    return {
      success: true,
      output:  out,
      stats: {
        inputLength:  raw.length,
        outputLength: out.length,
        saved:        raw.length - out.length,
        savedPct:     Math.round(((raw.length - out.length) / raw.length) * 100),
      },
    };
  } catch (e) {
    return { success: false, output: "", error: e.message };
  }
}

// ── YAML Validator ────────────────────────────────────────────
function validateYaml(raw) {
  const errors   = [];
  const warnings = [];

  if (!raw.trim()) {
    return { valid: false, errors: ["Input is empty."], warnings: [] };
  }

  try {
    const lines = raw.split("\n");
    const indentStack = [0];
    let inBlock      = false;
    let blockIndent  = -1;
    let docCount     = 0;
    let anchorMap    = new Map();
    let aliasRefs    = new Set();

    for (let i = 0; i < lines.length; i++) {
      const lineNum  = i + 1;
      const raw_line = lines[i];
      const trimmed  = raw_line.trim();

      if (!trimmed) continue;
      if (trimmed.startsWith("#")) continue;

      if (trimmed === "---") { docCount++; inBlock = false; blockIndent = -1; continue; }
      if (trimmed === "...") { continue; }

      const indent = raw_line.length - raw_line.trimStart().length;

      // Check for tabs (YAML forbids tabs for indentation)
      if (raw_line.match(/^\t/)) {
        errors.push(`Line ${lineNum}: Tab character used for indentation — YAML requires spaces.`);
      }

      // Check indentation is consistent
      if (indent > 0 && indent % 1 !== 0) {
        // Any indent is fine, but track consistency
      }

      // Block scalar
      if (trimmed.match(/^[^:]+:\s*[|>]/)) {
        inBlock     = true;
        blockIndent = indent;
        continue;
      }

      if (inBlock && indent > blockIndent) continue;
      else inBlock = false;

      // Duplicate key detection (simple — same indent level)
      const colonIdx = findMappingColon(trimmed);
      if (colonIdx !== -1) {
        const key = trimmed.slice(0, colonIdx).trim();

        // Anchor definition
        if (key.includes("&")) {
          const anchor = key.match(/&([a-zA-Z_][a-zA-Z0-9_]*)/)?.[1];
          if (anchor) {
            if (anchorMap.has(anchor)) {
              warnings.push(`Line ${lineNum}: Anchor "&${anchor}" is redefined.`);
            }
            anchorMap.set(anchor, lineNum);
          }
        }

        // Check key for obvious issues
        if (key.includes(":") && !key.startsWith('"') && !key.startsWith("'")) {
          warnings.push(`Line ${lineNum}: Key "${key}" contains a colon — consider quoting it.`);
        }
      }

      // Alias reference
      const aliasMatch = trimmed.match(/\*([a-zA-Z_][a-zA-Z0-9_]*)/);
      if (aliasMatch) {
        const alias = aliasMatch[1];
        aliasRefs.add(alias);
        if (!anchorMap.has(alias)) {
          // Might be defined later — track as warning
          warnings.push(`Line ${lineNum}: Alias "*${alias}" references anchor "&${alias}" which hasn't been defined yet.`);
        }
      }

      // Boolean compatibility warning
      if (trimmed.match(/:\s*(yes|no|on|off)\s*$/i)) {
        const val = trimmed.split(":").pop().trim();
        warnings.push(`Line ${lineNum}: Value "${val}" is a YAML 1.1 boolean — use "true"/"false" for YAML 1.2 compatibility.`);
      }

      // Colon in unquoted string value
      const valPart = colonIdx !== -1 ? trimmed.slice(colonIdx + 1).trim() : trimmed;
      if (valPart && valPart.includes(": ") &&
          !valPart.startsWith('"') && !valPart.startsWith("'") &&
          !valPart.startsWith("|") && !valPart.startsWith(">")) {
        warnings.push(`Line ${lineNum}: Unquoted value contains ": " — may cause parsing issues. Consider quoting the value.`);
      }
    }

    // Check for unresolved aliases
    for (const alias of aliasRefs) {
      if (!anchorMap.has(alias)) {
        errors.push(`Undefined anchor "&${alias}" referenced by alias "*${alias}".`);
      }
    }

    return {
      valid:    errors.length === 0,
      errors,
      warnings,
      lineCount: lines.length,
    };

  } catch (e) {
    return {
      valid:    false,
      errors:   [`Parse error: ${e.message}`],
      warnings: [],
    };
  }
}

// ── YAML Analyzer ─────────────────────────────────────────────
function analyzeYaml(raw) {
  try {
    const lines    = parseYamlLines(raw.trim());
    const allLines = raw.split("\n");

    const keys       = lines.filter((l) => l.type === YT.KEY);
    const seqItems   = lines.filter((l) => l.type === YT.SEQ_ENTRY);
    const comments   = lines.filter((l) => l.type === YT.COMMENT);
    const blanks     = lines.filter((l) => l.type === YT.BLANK);
    const docs       = lines.filter((l) => l.type === YT.DOC_START);
    const blockScalars = lines.filter((l) => l.type === "BLOCK_SCALAR");
    const anchors    = allLines.filter((l) => /&[a-zA-Z_]/.test(l)).length;
    const aliases    = allLines.filter((l) => /\*[a-zA-Z_]/.test(l)).length;
    const tags       = allLines.filter((l) => /!![a-zA-Z]/.test(l)).length;

    // Max depth
    let maxDepth  = 0;
    const origIndentSize = detectIndentSize(raw);
    for (const l of lines) {
      if (l.indent > 0 && origIndentSize > 0) {
        const depth = Math.floor(l.indent / origIndentSize) + 1;
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    // Key frequency at top level
    const topLevelKeys = keys
      .filter((l) => l.indent === 0)
      .map((l) => l.key);

    // Scalar type distribution
    const typeCount = { string: 0, integer: 0, float: 0, boolean: 0, null: 0, date: 0, other: 0 };
    for (const k of keys) {
      if (k.value) {
        const t = detectScalarType(k.value);
        if (t === "string")            typeCount.string++;
        else if (t === "integer")      typeCount.integer++;
        else if (t === "float")        typeCount.float++;
        else if (t === "boolean" || t === "boolean-compat") typeCount.boolean++;
        else if (t === "null")         typeCount.null++;
        else if (t === "date")         typeCount.date++;
        else                           typeCount.other++;
      }
    }

    return {
      totalKeys:    keys.length,
      seqItems:     seqItems.length,
      comments:     comments.length,
      blanks:       blanks.length,
      documents:    Math.max(1, docs.length),
      blockScalars: blockScalars.length,
      anchors,
      aliases,
      tags,
      maxDepth,
      topLevelKeys,
      typeCount,
    };
  } catch {
    return null;
  }
}

// ── JSON to YAML ──────────────────────────────────────────────
function jsonToYaml(json, indentStr = "  ") {
  function convert(val, depth = 0) {
    const pad = indentStr.repeat(depth);
    const pad1 = indentStr.repeat(depth + 1);

    if (val === null)              return "null";
    if (typeof val === "boolean")  return String(val);
    if (typeof val === "number")   return String(val);
    if (typeof val === "string") {
      if (needsQuotes(val)) return quoteString(val, "double");
      return val;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      return val.map((item) => {
        const converted = convert(item, depth + 1);
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          // Object in array — first key on same line as -
          const entries = Object.entries(item);
          if (entries.length === 0) return `${pad}- {}`;
          const [fk, fv] = entries[0];
          let out = `${pad}- ${fk}: ${convert(fv, depth + 2)}`;
          for (const [k, v] of entries.slice(1)) {
            out += `\n${pad1}  ${k}: ${convert(v, depth + 2)}`;
          }
          return out;
        }
        if (typeof item === "object" && Array.isArray(item)) {
          return `${pad}-\n` + convert(item, depth + 1);
        }
        return `${pad}- ${converted}`;
      }).join("\n");
    }
    if (typeof val === "object") {
      const entries = Object.entries(val);
      if (entries.length === 0) return "{}";
      return entries.map(([k, v]) => {
        const convertedV = convert(v, depth + 1);
        if (typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length > 0) {
          return `${pad}${k}:\n${convertedV}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${k}:\n${convertedV}`;
        }
        return `${pad}${k}: ${convertedV}`;
      }).join("\n");
    }
    return String(val);
  }

  try {
    const parsed = JSON.parse(json);
    return {
      success: true,
      output:  convert(parsed),
    };
  } catch (e) {
    return { success: false, error: `Invalid JSON: ${e.message}` };
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  dockerCompose: `version: '3.9'
services:
  api:
    image: node:21-alpine
    container_name: devtools_api
    working_dir: /app
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://postgres:secret@db:5432/devtools
      REDIS_URL: redis://cache:6379
      JWT_SECRET: \${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  db:
    image: postgres:16-alpine
    container_name: devtools_db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: devtools
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
  cache:
    image: redis:7-alpine
    container_name: devtools_cache
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
volumes:
  postgres_data:
  redis_data:`,

  githubActions: `name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: Target environment
        required: true
        default: staging
        type: choice
        options: [staging, production]
env:
  NODE_VERSION: '21'
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}
jobs:
  lint-and-test:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run linter
        run: npm run lint
      - name: Run tests
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  build-and-push:
    name: Build & Push Docker image
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:latest`,

  kubernetesDeployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: devtools-api
  namespace: production
  labels:
    app: devtools-api
    version: v1.0.0
    managed-by: helm
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devtools-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: devtools-api
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: api
          image: ghcr.io/example/devtools-api:latest
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: devtools-secrets
                  key: database-url
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5`,

  appConfig: `# Application Configuration

auth:
  jwt:
    secret: \${JWT_SECRET}
  oauth:
    providers:
      - name: github
        client_id: \${GITHUB_CLIENT_ID}
      - name: google
        client_id: \${GOOGLE_CLIENT_ID}`,
};

const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
];

const QUOTE_STYLE_OPTIONS = [
  { value: "preserve", label: "Preserve" },
  { value: "minimal",  label: "Minimal"  },
  { value: "double",   label: "Double"   },
  { value: "single",   label: "Single"   },
];

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Toggle ────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

// ── Panel header ──────────────────────────────────────────────
function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        {meta && <span className="text-xs text-gray-400 tabular-nums">{meta}</span>}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Stats bar ─────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {[
        { label: "Input",    value: `${stats.inputLength?.toLocaleString()} chars`  },
        { label: "Output",   value: `${stats.outputLength?.toLocaleString()} chars` },
        { label: "Lines",    value: stats.outputLines?.toLocaleString()              },
        { label: "Keys",     value: stats.keys?.toLocaleString()                    },
        { label: "List items", value: stats.seqItems?.toLocaleString()              },
        ...(stats.comments > 0 ? [{ label: "Comments", value: stats.comments }] : []),
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Size comparison ───────────────────────────────────────────
function SizeComparison({ original, minified }) {
  if (!original || !minified) return null;
  const saved    = original.length - minified.length;
  const savedPct = Math.round((saved / original.length) * 100);
  const miniPct  = Math.round((minified.length / original.length) * 100);

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size Reduction</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {savedPct}% smaller
        </span>
      </div>
      <div className="space-y-2">
        {[
          { label: "Original", size: original.length, pct: 100,     color: "bg-gray-400"  },
          { label: "Compact",  size: minified.length, pct: miniPct, color: "bg-green-500" },
        ].map(({ label, size, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{label}</span>
              <span className={`font-mono font-semibold ${label === "Compact" ? "text-green-600" : "text-gray-600"}`}>
                {size.toLocaleString()} chars
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: "Original", value: `${original.length.toLocaleString()} chars`, color: "text-gray-700"  },
          { label: "Compact",  value: `${minified.length.toLocaleString()} chars`, color: "text-green-600" },
          { label: "Saved",    value: `${saved.toLocaleString()} chars`,            color: "text-blue-600"  },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Line numbers ──────────────────────────────────────────────
function LineNumbers({ text }) {
  if (!text) return null;
  const count = text.split("\n").length;
  return (
    <div
      className="select-none text-right pr-3 pt-3.5 pb-3.5 text-xs font-mono text-gray-300 leading-relaxed bg-gray-50 border-r border-gray-200 min-w-[44px] overflow-hidden flex-shrink-0"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1} className="leading-relaxed">{i + 1}</div>
      ))}
    </div>
  );
}

// ── Validation panel ──────────────────────────────────────────
function ValidationPanel({ yaml }) {
  if (!yaml.trim()) return null;
  const result = validateYaml(yaml);

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${
      result.valid ? "border-green-300" : "border-red-300"
    }`}>
      <div className={`flex items-center gap-3 px-5 py-3.5 ${
        result.valid ? "bg-green-50" : "bg-red-50"
      }`}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          result.valid ? "bg-green-100" : "bg-red-100"
        }`}>
          {result.valid ? (
            <svg width="18" height="18" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div>
          <p className={`text-sm font-bold ${result.valid ? "text-green-800" : "text-red-800"}`}>
            {result.valid
              ? `✓ Valid YAML — ${result.lineCount} lines`
              : `✗ Invalid YAML — ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`}
          </p>
          {result.warnings.length > 0 && (
            <p className={`text-xs mt-0.5 ${result.valid ? "text-green-600" : "text-red-500"}`}>
              {result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="px-5 py-3 bg-white border-t border-red-100 space-y-2">
          {result.errors.map((err, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-red-600">{idx + 1}</span>
              </div>
              <p className="text-xs font-mono text-red-700 leading-relaxed">{err}</p>
            </div>
          ))}
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 space-y-2">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            Warnings
          </p>
          {result.warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <svg width="13" height="13" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700 leading-relaxed">{warn}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analysis panel ────────────────────────────────────────────
function AnalysisPanel({ yaml }) {
  if (!yaml.trim()) return null;
  const a = analyzeYaml(yaml);
  if (!a) return null;

  const typeEntries = Object.entries(a.typeCount).filter(([, v]) => v > 0);
  const maxTypeCount = Math.max(...typeEntries.map(([, v]) => v), 1);

  const typeColors = {
    string:  "bg-blue-400",
    integer: "bg-green-400",
    float:   "bg-teal-400",
    boolean: "bg-purple-400",
    null:    "bg-gray-400",
    date:    "bg-orange-400",
    other:   "bg-rose-400",
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Document Analysis
        </span>
      </div>

     {/* Stats grid */}
<div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
  {[
    { label: "Keys",          value: a.totalKeys,    color: "text-blue-600",   icon: Key },
    { label: "List items",    value: a.seqItems,     color: "text-green-600",  icon: List },
    { label: "Comments",      value: a.comments,     color: "text-gray-500",   icon: MessageSquare },
    { label: "Max depth",     value: a.maxDepth,     color: "text-purple-600", icon: ArrowDown },
    { label: "Block scalars", value: a.blockScalars, color: "text-indigo-600", icon: FileText },
    { label: "Documents",     value: a.documents,    color: "text-amber-600",  icon: File },
    { label: "Anchors",       value: a.anchors,      color: "text-teal-600",   icon: Anchor },
    { label: "Aliases",       value: a.aliases,      color: "text-rose-600",   icon: Link },
  ].map(({ label, value, color, icon }) => {
    const Icon = icon;
    return (
      <div
        key={label}
        className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl"
      >
        <Icon size={16} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
          <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
        </div>
      </div>
    );
  })}
</div>

      {/* Value type distribution */}
      {typeEntries.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Value type distribution
          </p>
          <div className="space-y-1.5">
            {typeEntries.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-16 flex-shrink-0 capitalize">
                  {type}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${typeColors[type] || "bg-gray-400"} rounded-full transition-all`}
                    style={{ width: `${(count / maxTypeCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-level keys */}
      {a.topLevelKeys.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Top-level keys ({a.topLevelKeys.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {a.topLevelKeys.map((key) => (
              <span
                key={key}
                className="text-xs font-mono px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg"
              >
                {key}:
              </span>
            ))}
          </div>
        </div>
      )}

      {/* YAML 1.1 vs 1.2 notice */}
      {(a.anchors > 0 || a.aliases > 0) && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
            <svg width="13" height="13" className="flex-shrink-0 mt-0.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-indigo-700">
              Document uses <strong>{a.anchors} anchor{a.anchors !== 1 ? "s" : ""}</strong> and{" "}
              <strong>{a.aliases} alias{a.aliases !== 1 ? "es" : ""}</strong> for value reuse.
              Ensure all alias references appear after their anchor definitions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── JSON to YAML converter panel ──────────────────────────────
function JsonToYamlPanel({ indentSize }) {
  const [json,   setJson]   = useState("");
  const [result, setResult] = useState("");
  const [error,  setError]  = useState(null);

  function handleConvert() {
    if (!json.trim()) {
      setError("Please enter JSON to convert.");
      setResult("");
      return;
    }
    const indentStr = " ".repeat(indentSize === "tab" ? 2 : indentSize);
    const res = jsonToYaml(json, indentStr);
    if (res.success) {
      setResult(res.output);
      setError(null);
    } else {
      setResult("");
      setError(res.error);
    }
  }

  useEffect(() => {
    if (!json.trim()) return;
    const t = setTimeout(handleConvert, 400);
    return () => clearTimeout(t);
  }, [json, indentSize]);

  return (
   <div className="space-y-4">
  <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
    <ArrowRightLeft size={16} className="flex-shrink-0 mt-0.5 text-blue-500" />
    <p className="text-xs text-blue-700 leading-relaxed">
      Converts valid JSON to equivalent YAML — auto-updates as you type.
      Handles objects, arrays, strings, numbers, booleans, and null values.
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <div className="flex flex-col">
      <PanelHeader
        label="JSON Input"
        meta={json ? `${json.length.toLocaleString()} chars` : null}
        actions={
          json && (
            <button
              onClick={() => { setJson(""); setResult(""); setError(null); }}
              className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Clear
            </button>
          )
        }
      />
      <textarea
        value={json}
        onChange={(e) => { setJson(e.target.value); if (error) setError(null); }}
        placeholder={'{\n  "name": "DevTools",\n  "version": "2.0.0",\n  "features": ["format", "validate", "convert"],\n  "config": {\n    "debug": false,\n    "port": 3000\n  }\n}'}
        spellCheck={false}
        autoCorrect="off"
        className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[300px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
      />
    </div>

    <div className="flex flex-col">
      <PanelHeader
        label="YAML Output"
        meta={result ? `${result.length.toLocaleString()} chars` : null}
        actions={result && <CopyButton text={result} />}
      />
      <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[300px] relative">
        {result ? (
          <textarea
            value={result}
            readOnly
            spellCheck={false}
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[300px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <RefreshCw size={28} className="opacity-20" />
            <p className="text-xs text-gray-300">YAML output appears here</p>
          </div>
        )}
      </div>
    </div>
  </div>

  <ErrorBanner message={error} />
</div>
  );
}

function EmptyOutput({ mode }) {
  const Icon = mode === "compact" ? Minimize2 : FileText;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <Icon size={28} className="opacity-20" />
      <p className="text-xs text-gray-300">
        {mode === "compact"
          ? "Compact YAML appears here"
          : "Formatted YAML appears here"}
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function YamlFormatter() {
  const [activeTab,        setActiveTab]        = useState("format");
  const [input,            setInput]            = useState("");
  const [output,           setOutput]           = useState("");
  const [error,            setError]            = useState(null);
  const [stats,            setStats]            = useState(null);
  const [mode,             setMode]             = useState("format");
  const [indentSize,       setIndentSize]       = useState(2);
  const [quoteStyle,       setQuoteStyle]       = useState("preserve");
  const [removeComments,   setRemoveComments]   = useState(false);
  const [sortKeys,         setSortKeys]         = useState(false);
  const [addDocStart,      setAddDocStart]      = useState(false);
  const [normalizeBoolean, setNormalizeBoolean] = useState(false);
  const [normalizeNull,    setNormalizeNull]    = useState(false);
  const [showLines,        setShowLines]        = useState(true);
  const [showValidation,   setShowValidation]   = useState(false);
  const [showAnalysis,     setShowAnalysis]     = useState(false);
  const [autoProcess,      setAutoProcess]      = useState(false);
  const [activeSample,     setActiveSample]     = useState(null);

  // ── Tabs ─────────────────────────────────────────────────────
 const TABS = [
  { value: "format",  label: "Format",      icon: FileText },
  { value: "convert", label: "JSON → YAML", icon: ArrowRightLeft },
];

  // ── Process ──────────────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter YAML to process.");
      setOutput("");
      setStats(null);
      return;
    }

    if (mode === "compact") {
      const result = minifyYaml(trimmed);
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    } else {
      const result = formatYaml(trimmed, {
        indentSize:     indentSize === "tab" ? 2 : indentSize,
        useTabs:        indentSize === "tab",
        quoteStyle,
        removeComments,
        sortKeys,
        addDocumentStart: addDocStart,
        normalizeBoolean,
        normalizeNull,
      });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    }
  }, [input, mode, indentSize, quoteStyle, removeComments, sortKeys, addDocStart, normalizeBoolean, normalizeNull]);

  // Auto process
  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 400);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  // Re-run on option change
  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, quoteStyle, removeComments, sortKeys, addDocStart, normalizeBoolean, normalizeNull, mode]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
    setActiveSample(null);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]);
    setOutput("");
    setError(null);
    setStats(null);
    setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines`   : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars · ${output.split("\n").length} lines`  : null;

  return (
    <div className="space-y-4">

      {/* ── Top tabs ─────────────────────────────────────────── */}
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {TABS.map((tab) => {
    const Icon = tab.icon; // 👈 THIS is what you missed

    return (
      <button
        key={tab.value}
        onClick={() => setActiveTab(tab.value)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
          activeTab === tab.value
            ? "bg-white text-blue-700 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon size={16} /> {/* 👈 render component properly */}
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>

      {/* ── JSON → YAML tab ──────────────────────────────────── */}
      {activeTab === "convert" && (
        <JsonToYamlPanel indentSize={indentSize} />
      )}

      {/* ── Format tab ───────────────────────────────────────── */}
      {activeTab === "format" && (
        <>
          {/* Mode */}
         <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {[
    { value: "format",  label: "Format / Prettify", icon: FileText },
    { value: "compact", label: "Compact",           icon: Minimize2 },
  ].map((m) => {
    const Icon = m.icon;

    return (
      <button
        key={m.value}
        onClick={() => {
          setMode(m.value);
          setOutput("");
          setError(null);
          setStats(null);
        }}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
          mode === m.value
            ? "bg-white text-blue-700 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon size={16} />
        <span>{m.label}</span>
      </button>
    );
  })}
</div>

          {/* Options toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

            {/* Primary action */}
            <button
              onClick={handleProcess}
              data-primary="true"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {mode === "compact" ? "Compact YAML" : "Format YAML"}
            </button>

            {/* Format options */}
            {mode === "format" && (
              <>
                {/* Indent */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Indent:</span>
                  <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                    {INDENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setIndentSize(opt.value)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                          indentSize === opt.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quote style */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Quotes:</span>
                  <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
                    {QUOTE_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setQuoteStyle(opt.value)}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                          quoteStyle === opt.value
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Toggle
                  checked={removeComments}
                  onChange={setRemoveComments}
                  label="Remove comments"
                  description="Strip all # comments from output"
                />
                <Toggle
                  checked={addDocStart}
                  onChange={setAddDocStart}
                  label="Add --- marker"
                  description="Add document start marker if not present"
                />
                <Toggle
                  checked={normalizeBoolean}
                  onChange={setNormalizeBoolean}
                  label="Normalize booleans"
                  description="Convert yes/no/on/off to true/false (YAML 1.2)"
                />
                <Toggle
                  checked={normalizeNull}
                  onChange={setNormalizeNull}
                  label="Normalize null"
                  description="Convert ~ to null"
                />
              </>
            )}

            <Toggle
              checked={showLines}
              onChange={setShowLines}
              label="Line numbers"
              description="Show line numbers in output"
            />
            <Toggle
              checked={autoProcess}
              onChange={setAutoProcess}
              label="Auto format"
              description="Format automatically as you type"
            />
            <Toggle
              checked={showValidation}
              onChange={setShowValidation}
              label="Validate"
              description="Show YAML validation results"
            />
            <Toggle
              checked={showAnalysis}
              onChange={setShowAnalysis}
              label="Analysis"
              description="Show document analysis panel"
            />

            {/* Sample buttons */}
            <div className="flex items-center gap-1 ml-auto flex-wrap">
              {[
                { key: "dockerCompose",        label: "Docker Compose" },
                { key: "githubActions",        label: "GitHub Actions" },
                { key: "kubernetesDeployment", label: "Kubernetes"     },
                { key: "appConfig",            label: "App config"     },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => loadSample(key)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors whitespace-nowrap ${
                    activeSample === key
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "text-blue-600 hover:bg-blue-50 border-blue-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Kbd hint */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
            </div>
          </div>

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Input */}
            <div className="flex flex-col">
              <PanelHeader
                label="YAML Input"
                meta={inputMeta}
                actions={
                  input && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  )
                }
              />
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={`Paste YAML to ${mode === "compact" ? "compact" : "format"}...\n\nSupports:\n• Mappings (key: value)\n• Sequences (- item)\n• Block scalars (| and >)\n• Anchors (&anchor) and aliases (*alias)\n• Multi-document files (---)\n• Inline comments (#)\n• Docker Compose, GitHub Actions, Kubernetes\n• Ansible playbooks, CI/CD configs`}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[420px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
              />
            </div>

            {/* Output */}
            <div className="flex flex-col">
              <PanelHeader
                label={mode === "compact" ? "Compact YAML" : "Formatted YAML"}
                meta={outputMeta}
                actions={
                  <>
                    {output && <CopyButton text={output} />}
                    {output && (
                      <button
                        onClick={() => downloadText(
                          output,
                          mode === "compact" ? "compact.yaml" : "formatted.yaml",
                          "application/x-yaml"
                        )}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    )}
                  </>
                }
              />
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[420px] relative">
                {output && showLines && (
                  <LineNumbers text={output} />
                )}
                {output ? (
                  <textarea
                    value={output}
                    readOnly
                    spellCheck={false}
                    className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[420px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
                  />
                ) : (
                  <div className="flex-1 relative">
                    <EmptyOutput mode={mode} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          <ErrorBanner message={error} />

          {/* Stats */}
          {stats && mode === "format" && <StatsBar stats={stats} />}

          {/* Size comparison */}
          {stats && mode === "compact" && (
            <SizeComparison original={input} minified={output} />
          )}

          {/* Validation */}
          {showValidation && input.trim() && (
            <ValidationPanel yaml={input} />
          )}

          {/* Analysis */}
          {showAnalysis && input.trim() && (
            <AnalysisPanel yaml={output || input} />
          )}
                  </>
      )}
    </div>
  );
}