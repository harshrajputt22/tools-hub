// ============================================================
// FORMATTERS UTILITY
// src/utils/formatters.js
//
// All formatting/beautifying logic used by formatter tools.
// Every function follows the same contract:
//
//   Input:  (code: string, options?: object)
//   Output: { success: boolean, output: string, error: string|null, stats: object }
//
// This means every tool component handles results the same
// way — check success, show output or error, display stats.
// ============================================================

import prettier from "prettier";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import prettierHtml from "prettier/plugins/html";
import prettierCss from "prettier/plugins/postcss";
import prettierMarkdown from "prettier/plugins/markdown";
import { format as formatSql } from "sql-formatter";
import yaml from "js-yaml";
import { parseString, Builder } from "xml2js";

// ============================================================
// SHARED HELPERS
// ============================================================

// ── Build a success result ────────────────────────────────────
function ok(output, stats = {}) {
  return {
    success: true,
    output,
    error: null,
    stats: {
      inputLength:  stats.inputLength  ?? 0,
      outputLength: stats.outputLength ?? output.length,
      inputLines:   stats.inputLines   ?? 0,
      outputLines:  stats.outputLines  ?? output.split("\n").length,
      ...stats,
    },
  };
}

// ── Build an error result ─────────────────────────────────────
function err(message, stats = {}) {
  return {
    success: false,
    output:  "",
    error:   message,
    stats,
  };
}

// ── Count lines ───────────────────────────────────────────────
function lineCount(str) {
  return str ? str.split("\n").length : 0;
}

// ── Base stats from raw input ─────────────────────────────────
function baseStats(input) {
  return {
    inputLength: input.length,
    inputLines:  lineCount(input),
  };
}

// ── Safe trim ─────────────────────────────────────────────────
function safeTrim(str) {
  return typeof str === "string" ? str.trim() : "";
}

// ============================================================
// JSON FORMATTER
// ============================================================

/**
 * Format JSON with configurable indentation.
 *
 * @param {string} input     - Raw JSON string
 * @param {object} options
 * @param {number|string} options.indent   - 2 | 4 | "tab"  (default: 2)
 * @param {boolean} options.sortKeys       - Sort object keys (default: false)
 *
 * @returns {{ success, output, error, stats }}
 */
export function formatJson(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { indent = 2, sortKeys = false } = options;
  const indentValue = indent === "tab" ? "\t" : Number(indent) || 2;

  try {
    const parsed = JSON.parse(raw);
    const sorted = sortKeys ? sortObjectKeys(parsed) : parsed;
    const output = JSON.stringify(sorted, null, indentValue);
    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
      keyCount:     countJsonKeys(parsed),
    });
  } catch (e) {
    return err(buildJsonError(e, raw));
  }
}

// ── Sort all object keys recursively ─────────────────────────
function sortObjectKeys(obj) {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
      }, {});
  }
  return obj;
}

// ── Count total keys in a JSON object ────────────────────────
function countJsonKeys(obj, count = 0) {
  if (Array.isArray(obj)) {
    return obj.reduce((c, v) => countJsonKeys(v, c), count);
  }
  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj);
    return keys.reduce(
      (c, k) => countJsonKeys(obj[k], c + 1),
      count
    );
  }
  return count;
}

// ── Build a friendly JSON parse error message ─────────────────
function buildJsonError(e, raw) {
  const msg = e.message || "Invalid JSON";

  // Extract line/col from common error formats
  // "Unexpected token X at position N"
  const posMatch = msg.match(/position (\d+)/i);
  if (posMatch) {
    const pos  = parseInt(posMatch[1], 10);
    const before = raw.slice(0, pos);
    const line = before.split("\n").length;
    const col  = pos - before.lastIndexOf("\n");
    return `JSON Error at line ${line}, col ${col}: ${msg}`;
  }

  // "Unexpected token X in JSON at line N"
  const lineMatch = msg.match(/line (\d+)/i);
  if (lineMatch) {
    return `JSON Error at line ${lineMatch[1]}: ${msg}`;
  }

  return `JSON Error: ${msg}`;
}

// ============================================================
// JSON MINIFIER
// ============================================================

/**
 * Minify JSON — strip all whitespace.
 *
 * @param {string} input
 * @returns {{ success, output, error, stats }}
 */
export function minifyJson(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    const parsed = JSON.parse(raw);
    const output = JSON.stringify(parsed);
    const saved  = raw.length - output.length;
    const pct    = raw.length > 0
      ? Math.round((saved / raw.length) * 100)
      : 0;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  1,
      bytesSaved:   saved,
      reductionPct: pct,
    });
  } catch (e) {
    return err(buildJsonError(e, raw));
  }
}

// ============================================================
// HTML FORMATTER
// ============================================================

/**
 * Format HTML using Prettier.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.printWidth      - Default: 100
 * @param {number}  options.tabWidth        - Default: 2
 * @param {boolean} options.useTabs         - Default: false
 * @param {boolean} options.singleQuote     - Default: false
 * @param {boolean} options.htmlWhitespace  - "strict" | "ignore" | "css" (default: "css")
 *
 * @returns {{ success, output, error, stats }}
 */
export async function formatHtml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    printWidth     = 100,
    tabWidth       = 2,
    useTabs        = false,
    singleQuote    = false,
    htmlWhitespace = "css",
  } = options;

  try {
    const output = await prettier.format(raw, {
      parser:              "html",
      plugins:             [prettierHtml, prettierBabel, prettierEstree],
      printWidth,
      tabWidth,
      useTabs,
      singleAttributePerLine: false,
      htmlWhitespaceSensitivity: htmlWhitespace,
      singleQuote,
    });

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    return err(`HTML Format Error: ${e.message}`);
  }
}

// ============================================================
// HTML MINIFIER
// ============================================================

/**
 * Minify HTML — remove comments, collapse whitespace.
 *
 * Pure regex-based, no heavy library needed.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.removeComments     - Default: true
 * @param {boolean} options.collapseWhitespace - Default: true
 * @param {boolean} options.removeEmptyAttrs   - Default: false
 *
 * @returns {{ success, output, error, stats }}
 */
export function minifyHtml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    removeComments     = true,
    collapseWhitespace = true,
    removeEmptyAttrs   = false,
  } = options;

  try {
    let output = raw;

    // Remove HTML comments (but NOT conditional comments <!--[if ...]>)
    if (removeComments) {
      output = output.replace(/<!--(?!\[if\s)[\s\S]*?-->/g, "");
    }

    // Collapse whitespace between tags
    if (collapseWhitespace) {
      output = output
        .replace(/\s+/g, " ")           // collapse multiple spaces
        .replace(/>\s+</g, "><")        // remove space between tags
        .replace(/\s+>/g, ">")          // trim space before >
        .replace(/<\s+/g, "<")          // trim space after 
        .trim();
    }

    // Remove empty attribute values (attr="" → attr)
    if (removeEmptyAttrs) {
      output = output.replace(/\s+\w+=""/g, "");
    }

    const saved = raw.length - output.length;
    const pct   = raw.length > 0
      ? Math.round((saved / raw.length) * 100)
      : 0;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
      bytesSaved:   saved,
      reductionPct: pct,
    });
  } catch (e) {
    return err(`HTML Minify Error: ${e.message}`);
  }
}

// ============================================================
// CSS FORMATTER
// ============================================================

/**
 * Format CSS using Prettier.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.printWidth  - Default: 80
 * @param {number}  options.tabWidth    - Default: 2
 * @param {boolean} options.useTabs     - Default: false
 * @param {boolean} options.singleQuote - Default: false
 *
 * @returns {{ success, output, error, stats }}
 */
export async function formatCss(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    printWidth  = 80,
    tabWidth    = 2,
    useTabs     = false,
    singleQuote = false,
  } = options;

  try {
    const output = await prettier.format(raw, {
      parser:  "css",
      plugins: [prettierCss],
      printWidth,
      tabWidth,
      useTabs,
      singleQuote,
    });

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    return err(`CSS Format Error: ${e.message}`);
  }
}

// ============================================================
// CSS MINIFIER
// ============================================================

/**
 * Minify CSS — remove comments and collapse whitespace.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.removeComments - Default: true
 *
 * @returns {{ success, output, error, stats }}
 */
export function minifyCss(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { removeComments = true } = options;

  try {
    let output = raw;

    // Remove block comments
    if (removeComments) {
      output = output.replace(/\/\*[\s\S]*?\*\//g, "");
    }

    output = output
      .replace(/\s+/g, " ")               // collapse whitespace
      .replace(/\s*{\s*/g, "{")           // space around {
      .replace(/\s*}\s*/g, "}")           // space around }
      .replace(/\s*:\s*/g, ":")           // space around :
      .replace(/\s*;\s*/g, ";")           // space around ;
      .replace(/\s*,\s*/g, ",")           // space around ,
      .replace(/;}/g, "}")                // remove trailing semicolons
      .trim();

    const saved = raw.length - output.length;
    const pct   = raw.length > 0
      ? Math.round((saved / raw.length) * 100)
      : 0;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  1,
      bytesSaved:   saved,
      reductionPct: pct,
    });
  } catch (e) {
    return err(`CSS Minify Error: ${e.message}`);
  }
}

// ============================================================
// JAVASCRIPT FORMATTER
// ============================================================

/**
 * Format JavaScript using Prettier.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.printWidth   - Default: 80
 * @param {number}  options.tabWidth     - Default: 2
 * @param {boolean} options.useTabs      - Default: false
 * @param {boolean} options.singleQuote  - Default: true
 * @param {boolean} options.semi         - Default: true
 * @param {string}  options.trailingComma- "none"|"es5"|"all" (default: "es5")
 * @param {string}  options.arrowParens  - "avoid"|"always"   (default: "always")
 *
 * @returns {{ success, output, error, stats }}
 */
export async function formatJavaScript(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    printWidth    = 80,
    tabWidth      = 2,
    useTabs       = false,
    singleQuote   = true,
    semi          = true,
    trailingComma = "es5",
    arrowParens   = "always",
  } = options;

  try {
    const output = await prettier.format(raw, {
      parser:  "babel",
      plugins: [prettierBabel, prettierEstree],
      printWidth,
      tabWidth,
      useTabs,
      singleQuote,
      semi,
      trailingComma,
      arrowParens,
    });

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    return err(`JS Format Error: ${e.message}`);
  }
}

// ============================================================
// JAVASCRIPT MINIFIER
// ============================================================

/**
 * Minify JavaScript — remove comments and collapse whitespace.
 * Uses Prettier with compact settings as a safe minifier.
 * For production use, a dedicated minifier (terser) is better,
 * but this handles the tool use-case fine.
 *
 * @param {string} input
 * @returns {{ success, output, error, stats }}
 */
export async function minifyJavaScript(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    // First validate JS is parseable
    await prettier.format(raw, {
      parser:  "babel",
      plugins: [prettierBabel, prettierEstree],
    });

    // Basic minification — remove comments, collapse whitespace
    let output = raw
      .replace(/\/\/[^\n]*/g, "")         // single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
      .replace(/\s+/g, " ")               // collapse whitespace
      .replace(/\s*([{}();,=+\-*/<>!&|?:%])\s*/g, "$1") // space around operators
      .trim();

    const saved = raw.length - output.length;
    const pct   = raw.length > 0
      ? Math.round((saved / raw.length) * 100)
      : 0;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  1,
      bytesSaved:   saved,
      reductionPct: pct,
    });
  } catch (e) {
    return err(`JS Minify Error: ${e.message}`);
  }
}

// ============================================================
// SQL FORMATTER
// ============================================================

/**
 * Format SQL queries using sql-formatter.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.dialect     - "sql"|"mysql"|"postgresql"|
 *                                        "sqlite"|"tsql"|"plsql"
 *                                        (default: "sql")
 * @param {number}  options.tabWidth    - Default: 2
 * @param {boolean} options.useTabs     - Default: false
 * @param {string}  options.keywordCase - "upper"|"lower"|"preserve"
 *                                        (default: "upper")
 * @param {boolean} options.linesBetweenQueries - Default: true
 *
 * @returns {{ success, output, error, stats }}
 */
export function formatSqlQuery(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    dialect              = "sql",
    tabWidth             = 2,
    useTabs              = false,
    keywordCase          = "upper",
    linesBetweenQueries  = true,
  } = options;

  try {
    const output = formatSql(raw, {
      language:    dialect,
      tabWidth:    useTabs ? 1 : tabWidth,
      useTabs,
      keywordCase,
      linesBetweenQueries: linesBetweenQueries ? 2 : 1,
    });

    // Count SQL keywords for stats
    const keywords = (output.match(
      /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|UNION|LIMIT|OFFSET)\b/gi
    ) || []).length;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
      keywordCount: keywords,
    });
  } catch (e) {
    return err(`SQL Format Error: ${e.message}`);
  }
}

// ============================================================
// XML FORMATTER
// ============================================================

/**
 * Format XML with indentation.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.indent      - Spaces per level (default: 2)
 * @param {boolean} options.useTabs     - Default: false
 * @param {boolean} options.declaration - Include XML declaration (default: true)
 *
 * @returns {{ success, output, error, stats }}
 */
export function formatXml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    indent      = 2,
    useTabs     = false,
    declaration = true,
  } = options;

  const indentStr = useTabs ? "\t" : " ".repeat(indent);

  try {
    // Parse XML using xml2js
    let parsed;
    parseString(raw, { explicitArray: false }, (err, result) => {
      if (err) throw new Error(err.message);
      parsed = result;
    });

    if (!parsed) return err("Could not parse XML.");

    // Build back with indentation
    const builder = new Builder({
      xmldec: declaration
        ? { version: "1.0", encoding: "UTF-8" }
        : null,
      renderOpts: {
        pretty:  true,
        indent:  indentStr,
        newline: "\n",
      },
    });

    const output = builder.buildObject(parsed);

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    return err(`XML Format Error: ${e.message}`);
  }
}

// ============================================================
// YAML FORMATTER
// ============================================================

/**
 * Format and validate YAML.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.indent       - Spaces per level (default: 2)
 * @param {number}  options.lineWidth    - Default: 80
 * @param {boolean} options.noRefs       - Disable aliases (default: false)
 * @param {string}  options.flowLevel    - -1 for block only (default: -1)
 *
 * @returns {{ success, output, error, stats }}
 */
export function formatYaml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    indent    = 2,
    lineWidth = 80,
    noRefs    = false,
    flowLevel = -1,
  } = options;

  try {
    // Parse YAML first (validates it)
    const parsed = yaml.load(raw, { json: true });

    if (parsed === undefined || parsed === null) {
      return err("YAML parsed to empty/null. Check your input.");
    }

    // Dump back as formatted YAML
    const output = yaml.dump(parsed, {
      indent,
      lineWidth,
      noRefs,
      flowLevel,
      sortKeys: false,
    });

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    // js-yaml errors have mark.line and mark.column
    if (e.mark) {
      return err(
        `YAML Error at line ${e.mark.line + 1}, col ${e.mark.column + 1}: ${e.reason}`
      );
    }
    return err(`YAML Error: ${e.message}`);
  }
}

// ============================================================
// YAML MINIFIER
// ============================================================

/**
 * Minify YAML — remove comments and blank lines.
 *
 * @param {string} input
 * @returns {{ success, output, error, stats }}
 */
export function minifyYaml(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    // Validate first
    yaml.load(raw, { json: true });

    const output = raw
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith("#");
      })
      .join("\n")
      .trim();

    const saved = raw.length - output.length;
    const pct   = raw.length > 0
      ? Math.round((saved / raw.length) * 100)
      : 0;

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
      bytesSaved:   saved,
      reductionPct: pct,
    });
  } catch (e) {
    if (e.mark) {
      return err(
        `YAML Error at line ${e.mark.line + 1}: ${e.reason}`
      );
    }
    return err(`YAML Error: ${e.message}`);
  }
}

// ============================================================
// MARKDOWN FORMATTER
// ============================================================

/**
 * Format Markdown using Prettier.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.printWidth   - Default: 80
 * @param {boolean} options.prose        - "always"|"never"|"preserve"
 *                                         (default: "preserve")
 *
 * @returns {{ success, output, error, stats }}
 */
export async function formatMarkdown(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    printWidth = 80,
    prose      = "preserve",
  } = options;

  try {
    const output = await prettier.format(raw, {
      parser:    "markdown",
      plugins:   [prettierMarkdown],
      printWidth,
      proseWrap: prose,
    });

    return ok(output, {
      ...baseStats(raw),
      outputLength: output.length,
      outputLines:  lineCount(output),
    });
  } catch (e) {
    return err(`Markdown Format Error: ${e.message}`);
  }
}

// ============================================================
// GENERIC CODE FORMATTER
// Routes to the correct formatter by language
// ============================================================

/**
 * Format code by language — single entry point for the
 * formatter tool UI.
 *
 * @param {string} input
 * @param {string} language - "json"|"html"|"css"|"javascript"|
 *                            "sql"|"xml"|"yaml"|"markdown"
 * @param {object} options  - Passed to the specific formatter
 *
 * @returns {{ success, output, error, stats }}
 */
export async function formatCode(input, language, options = {}) {
  switch (language.toLowerCase()) {
    case "json":
      return formatJson(input, options);
    case "html":
      return await formatHtml(input, options);
    case "css":
    case "scss":
    case "less":
      return await formatCss(input, options);
    case "javascript":
    case "js":
    case "jsx":
    case "typescript":
    case "ts":
    case "tsx":
      return await formatJavaScript(input, options);
    case "sql":
    case "mysql":
    case "postgresql":
    case "sqlite":
      return formatSqlQuery(input, { ...options, dialect: language });
    case "xml":
      return formatXml(input, options);
    case "yaml":
    case "yml":
      return formatYaml(input, options);
    case "markdown":
    case "md":
      return await formatMarkdown(input, options);
    default:
      return err(`Unsupported language: "${language}". Supported: json, html, css, javascript, sql, xml, yaml, markdown.`);
  }
}

// ============================================================
// MINIFIER ROUTER
// Routes to the correct minifier by language
// ============================================================

/**
 * Minify code by language.
 *
 * @param {string} input
 * @param {string} language
 * @param {object} options
 *
 * @returns {{ success, output, error, stats }}
 */
export async function minifyCode(input, language, options = {}) {
  switch (language.toLowerCase()) {
    case "json":
      return minifyJson(input);
    case "html":
      return minifyHtml(input, options);
    case "css":
    case "scss":
      return minifyCss(input, options);
    case "javascript":
    case "js":
    case "jsx":
      return await minifyJavaScript(input);
    case "yaml":
    case "yml":
      return minifyYaml(input);
    default:
      return err(`Minification not supported for: "${language}".`);
  }
}

// ============================================================
// PRETTY PRINT — alias with smart defaults
// Used by the JSON Pretty Print tool specifically
// ============================================================

/**
 * Pretty print JSON with customizable indent.
 *
 * @param {string} input
 * @param {2|4|"tab"} indent - Default: 2
 *
 * @returns {{ success, output, error, stats }}
 */
export function prettyPrintJson(input, indent = 2) {
  return formatJson(input, { indent, sortKeys: false });
}

// ============================================================
// EXPORTS SUMMARY
//
// Named exports (all the specific formatters):
//   formatJson          — JSON formatter
//   minifyJson          — JSON minifier
//   prettyPrintJson     — JSON pretty print
//   formatHtml          — HTML formatter   (async)
//   minifyHtml          — HTML minifier
//   formatCss           — CSS formatter    (async)
//   minifyCss           — CSS minifier
//   formatJavaScript    — JS formatter     (async)
//   minifyJavaScript    — JS minifier      (async)
//   formatSqlQuery      — SQL formatter
//   formatXml           — XML formatter
//   formatYaml          — YAML formatter
//   minifyYaml          — YAML minifier
//   formatMarkdown      — Markdown formatter (async)
//
// Router exports (single entry points):
//   formatCode          — Routes by language  (async)
//   minifyCode          — Routes by language  (async)
// ============================================================