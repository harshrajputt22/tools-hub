"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";
import { FileText, Minimize2 } from "lucide-react";


// ============================================================
// XML FORMATTER ENGINE
// Pure JS — no external dependency
// Handles: elements, attributes, text, CDATA, comments,
// processing instructions, DOCTYPE, namespaces, mixed content
// ============================================================

// ── Token types ───────────────────────────────────────────────
const XT = {
  XML_DECL:    "XML_DECL",
  DOCTYPE:     "DOCTYPE",
  COMMENT:     "COMMENT",
  CDATA:       "CDATA",
  PI:          "PI",          // Processing instruction
  OPEN_TAG:    "OPEN_TAG",
  CLOSE_TAG:   "CLOSE_TAG",
  SELF_CLOSE:  "SELF_CLOSE",
  TEXT:        "TEXT",
};

// ── Tokenizer ─────────────────────────────────────────────────
function tokenizeXml(xml) {
  const tokens = [];
  let i = 0;

  function readUntil(end) {
    const idx = xml.indexOf(end, i);
    if (idx === -1) throw new Error(`Expected closing "${end}" not found.`);
    const val = xml.slice(i, idx + end.length);
    i = idx + end.length;
    return val;
  }

  function readAttributes(raw) {
    const attrs = [];
    let j = 0;

    while (j < raw.length) {
      // Skip whitespace
      while (j < raw.length && /\s/.test(raw[j])) j++;
      if (j >= raw.length) break;

      // Read attribute name
      let name = "";
      while (j < raw.length && raw[j] !== "=" && !/\s/.test(raw[j]) &&
             raw[j] !== ">" && raw[j] !== "/") {
        name += raw[j++];
      }
      if (!name) { j++; continue; }

      // Skip whitespace
      while (j < raw.length && /\s/.test(raw[j])) j++;

      if (raw[j] !== "=") {
        // Boolean attribute (unusual in XML but handle gracefully)
        attrs.push({ name, value: null, quote: null });
        continue;
      }
      j++; // skip =

      // Skip whitespace
      while (j < raw.length && /\s/.test(raw[j])) j++;

      const quote = raw[j];
      if (quote !== '"' && quote !== "'") {
        // Unquoted — read until whitespace or >
        let val = "";
        while (j < raw.length && !/\s/.test(raw[j]) && raw[j] !== ">" && raw[j] !== "/") {
          val += raw[j++];
        }
        attrs.push({ name, value: val, quote: '"' });
        continue;
      }

      j++; // skip opening quote
      let val = "";
      while (j < raw.length && raw[j] !== quote) {
        val += raw[j++];
      }
      j++; // skip closing quote
      attrs.push({ name, value: val, quote });
    }

    return attrs;
  }

  function parseOpenTag(start) {
    // Find the end of the tag, handling quoted attributes
    let j    = start + 1;
    let name = "";

    // Read tag name
    while (j < xml.length && !/[\s/>]/.test(xml[j])) name += xml[j++];

    // Read everything until closing > or />
    let attrRaw  = "";
    let selfClose = false;
    let depth    = 0;

    while (j < xml.length) {
      const ch = xml[j];
      if ((ch === '"' || ch === "'") && depth === 0) {
        const q = ch;
        attrRaw += ch; j++;
        while (j < xml.length && xml[j] !== q) { attrRaw += xml[j++]; }
        attrRaw += xml[j++]; // closing quote
        continue;
      }
      if (ch === "/" && xml[j + 1] === ">") {
        selfClose = true;
        j += 2;
        break;
      }
      if (ch === ">") { j++; break; }
      attrRaw += ch; j++;
    }

    const attrs = readAttributes(attrRaw.trim());
    return { name, attrs, selfClose, end: j };
  }

  while (i < xml.length) {
    // Skip pure whitespace between tags (will be reconstructed)
    if (/\s/.test(xml[i])) {
      let ws = "";
      while (i < xml.length && /\s/.test(xml[i])) ws += xml[i++];
      // Preserve whitespace as text only if non-empty trimmed
      if (ws.trim()) tokens.push({ type: XT.TEXT, value: ws });
      continue;
    }

    if (xml[i] !== "<") {
      // Text content
      let text = "";
      while (i < xml.length && xml[i] !== "<") text += xml[i++];
      if (text.trim()) tokens.push({ type: XT.TEXT, value: text });
      continue;
    }

    // XML Declaration <?xml ... ?>
    if (xml.slice(i, i + 5) === "<?xml") {
      const end = xml.indexOf("?>", i);
      if (end === -1) throw new Error("Unclosed XML declaration.");
      tokens.push({ type: XT.XML_DECL, value: xml.slice(i, end + 2) });
      i = end + 2;
      continue;
    }

    // Processing instruction <?...?>
    if (xml.slice(i, i + 2) === "<?") {
      const end = xml.indexOf("?>", i);
      if (end === -1) throw new Error("Unclosed processing instruction.");
      tokens.push({ type: XT.PI, value: xml.slice(i, end + 2) });
      i = end + 2;
      continue;
    }

    // DOCTYPE
    if (xml.slice(i, i + 9).toUpperCase() === "<!DOCTYPE") {
      // DOCTYPE can have nested [ ] blocks
      let s     = "";
      let depth = 0;
      while (i < xml.length) {
        s += xml[i];
        if (xml[i] === "[") depth++;
        if (xml[i] === "]") depth--;
        if (xml[i] === ">" && depth === 0) { i++; break; }
        i++;
      }
      tokens.push({ type: XT.DOCTYPE, value: s });
      continue;
    }

    // Comment
    if (xml.slice(i, i + 4) === "<!--") {
      const end = xml.indexOf("-->", i + 4);
      if (end === -1) throw new Error("Unclosed XML comment.");
      tokens.push({ type: XT.COMMENT, value: xml.slice(i, end + 3) });
      i = end + 3;
      continue;
    }

    // CDATA
    if (xml.slice(i, i + 9) === "<![CDATA[") {
      const end = xml.indexOf("]]>", i + 9);
      if (end === -1) throw new Error("Unclosed CDATA section.");
      tokens.push({ type: XT.CDATA, value: xml.slice(i, end + 3) });
      i = end + 3;
      continue;
    }

    // Closing tag
    if (xml.slice(i, i + 2) === "</") {
      const end = xml.indexOf(">", i);
      if (end === -1) throw new Error(`Unclosed closing tag at position ${i}.`);
      const name = xml.slice(i + 2, end).trim();
      tokens.push({ type: XT.CLOSE_TAG, name, value: xml.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    // Opening / self-closing tag
    if (xml[i] === "<" && i + 1 < xml.length && /[a-zA-Z_:]/.test(xml[i + 1])) {
      const result = parseOpenTag(i);
      if (result.selfClose) {
        tokens.push({
          type:  XT.SELF_CLOSE,
          name:  result.name,
          attrs: result.attrs,
          value: xml.slice(i, result.end),
        });
      } else {
        tokens.push({
          type:  XT.OPEN_TAG,
          name:  result.name,
          attrs: result.attrs,
          value: xml.slice(i, result.end),
        });
      }
      i = result.end;
      continue;
    }

    // Unknown character — treat as text
    tokens.push({ type: XT.TEXT, value: xml[i++] });
  }

  return tokens;
}

// ── Renderer ─────────────────────────────────────────────────
function renderXml(tokens, opts = {}) {
  const {
    indent           = "  ",
    sortAttributes   = false,
    removeComments   = false,
    selfCloseEmpty   = true,
    preserveTextWrap = true,
    maxAttrLineLength= 80,
    addXmlDecl       = false,
  } = opts;

  let out   = "";
  let depth = 0;

  function pad(d = depth) { return indent.repeat(Math.max(0, d)); }

  function renderAttrs(attrs, tagName) {
    if (!attrs || attrs.length === 0) return "";
    const sorted = sortAttributes
      ? [...attrs].sort((a, b) => a.name.localeCompare(b.name))
      : attrs;

    const inline = sorted
      .map((a) =>
        a.value === null
          ? ` ${a.name}`
          : ` ${a.name}=${a.quote}${a.value}${a.quote}`
      )
      .join("");

    // Wrap attributes if line would be too long
    const lineLen = pad().length + tagName.length + 2 + inline.length;
    if (lineLen > maxAttrLineLength && sorted.length > 1) {
      const attrIndent = pad() + " ".repeat(tagName.length + 2);
      return sorted
        .map((a, idx) => {
          const attr = a.value === null
            ? a.name
            : `${a.name}=${a.quote}${a.value}${a.quote}`;
          return idx === 0 ? ` ${attr}` : `\n${attrIndent}${attr}`;
        })
        .join("");
    }

    return inline;
  }

  // Optional XML declaration
  const hasDecl = tokens.some((t) => t.type === XT.XML_DECL);
  if (addXmlDecl && !hasDecl) {
    out += `<?xml version="1.0" encoding="UTF-8"?>\n`;
  }

  for (const tok of tokens) {
    switch (tok.type) {

      case XT.XML_DECL:
        out += `${tok.value.trim()}\n`;
        break;

      case XT.DOCTYPE:
        out += `${tok.value.trim()}\n`;
        break;

      case XT.PI:
        out += `${pad()}${tok.value.trim()}\n`;
        break;

      case XT.COMMENT: {
        if (removeComments) break;
        const content = tok.value.slice(4, -3); // strip <!-- and -->
        const lines   = content.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length <= 1) {
          out += `${pad()}<!-- ${lines[0] || ""} -->\n`;
        } else {
          out += `${pad()}<!--\n`;
          for (const line of lines) {
            out += `${pad()}  ${line}\n`;
          }
          out += `${pad()}-->\n`;
        }
        break;
      }

      case XT.CDATA: {
        const content = tok.value.slice(9, -3); // strip <![CDATA[ and ]]>
        if (content.includes("\n")) {
          const lines = content.split("\n");
          out += `${pad()}<![CDATA[\n`;
          for (const line of lines) {
            if (line.trim()) out += `${pad()}  ${line.trim()}\n`;
          }
          out += `${pad()}]]>\n`;
        } else {
          out += `${pad()}<![CDATA[${content.trim()}]]>\n`;
        }
        break;
      }

      case XT.OPEN_TAG: {
        const attrStr = renderAttrs(tok.attrs, tok.name);
        out += `${pad()}<${tok.name}${attrStr}>\n`;
        depth++;
        break;
      }

      case XT.CLOSE_TAG: {
        depth = Math.max(0, depth - 1);
        // Check if previous line ended with open tag — collapse single-line if text follows
        out += `${pad()}</${tok.name}>\n`;
        break;
      }

      case XT.SELF_CLOSE: {
        const attrStr = renderAttrs(tok.attrs, tok.name);
        out += `${pad()}<${tok.name}${attrStr}/>\n`;
        break;
      }

      case XT.TEXT: {
        const trimmed = tok.value.trim().replace(/\s+/g, " ");
        if (trimmed) {
          out += `${pad()}${trimmed}\n`;
        }
        break;
      }
    }
  }

  return out.trimEnd();
}

// ── Smart inline collapse ─────────────────────────────────────
// Collapses elements with a single short text child to one line:
//   <name>text</name>
function collapseInlineElements(formatted) {
  // Pattern: <tag attrs>\n  whitespace\n  text\n  whitespace\n  </tag>
  return formatted.replace(
    /(<([a-zA-Z_:][a-zA-Z0-9_:.-]*)([^>]*)>)\n\s+([^<\n]{1,80})\n\s+(<\/\2>)/g,
    "$1$4$5"
  );
}

// ── Main format function ──────────────────────────────────────
function formatXml(raw, options = {}) {
  const {
    indentSize       = 2,
    useTabs          = false,
    sortAttributes   = false,
    removeComments   = false,
    selfCloseEmpty   = true,
    collapseInline   = true,
    addXmlDecl       = false,
    maxAttrLineLength= 80,
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  const indent = useTabs ? "\t" : " ".repeat(indentSize);

  try {
    const tokens = tokenizeXml(raw.trim());
    let output   = renderXml(tokens, {
      indent,
      sortAttributes,
      removeComments,
      selfCloseEmpty,
      addXmlDecl,
      maxAttrLineLength,
    });

    if (collapseInline) {
      output = collapseInlineElements(output);
    }

    // Count stats
    const elements  = tokens.filter((t) => t.type === XT.OPEN_TAG || t.type === XT.SELF_CLOSE).length;
    const attrs     = tokens.reduce((acc, t) => acc + ((t.attrs || []).length), 0);
    const comments  = tokens.filter((t) => t.type === XT.COMMENT).length;
    const cdatas    = tokens.filter((t) => t.type === XT.CDATA).length;
    const textNodes = tokens.filter((t) => t.type === XT.TEXT).length;

    return {
      success: true,
      output,
      stats: {
        inputLength:  raw.length,
        outputLength: output.length,
        inputLines:   raw.split("\n").length,
        outputLines:  output.split("\n").length,
        elements,
        attributes:   attrs,
        comments,
        cdatas,
        textNodes,
      },
    };
  } catch (e) {
    return {
      success: false,
      output:  "",
      error:   `Parse error: ${e.message}`,
    };
  }
}

// ── XML Minifier ──────────────────────────────────────────────
function minifyXml(raw) {
  if (!raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    let result = raw
      .replace(/<!--[\s\S]*?-->/g, "")          // remove comments
      .replace(/>\s+</g, "><")                  // remove whitespace between tags
      .replace(/\s+>/g, ">")                    // remove whitespace before >
      .replace(/<\s+/g, "<")                    // remove whitespace after 
      .replace(/\s{2,}/g, " ")                  // collapse multiple spaces
      .trim();

    return {
      success: true,
      output:  result,
      stats: {
        inputLength:  raw.length,
        outputLength: result.length,
        saved:        raw.length - result.length,
        savedPct:     Math.round(((raw.length - result.length) / raw.length) * 100),
      },
    };
  } catch (e) {
    return { success: false, output: "", error: e.message };
  }
}

// ── XML Validator ─────────────────────────────────────────────
function validateXml(raw) {
  const errors   = [];
  const warnings = [];

  if (!raw.trim()) {
    return { valid: false, errors: ["Input is empty."], warnings: [] };
  }

  try {
    const tokens = tokenizeXml(raw.trim());
    const stack  = [];

    // Check for XML declaration position
    if (tokens[0]?.type === XT.XML_DECL) {
      const decl = tokens[0].value;
      if (!decl.includes('version=')) {
        errors.push('XML declaration missing required "version" attribute.');
      }
    }

    let hasRootElement = false;
    let rootCount      = 0;

    for (const tok of tokens) {
      if (tok.type === XT.OPEN_TAG) {
        stack.push(tok.name);
        if (stack.length === 1) rootCount++;
      }

      if (tok.type === XT.SELF_CLOSE) {
        if (stack.length === 0) rootCount++;
      }

      if (tok.type === XT.CLOSE_TAG) {
        if (stack.length === 0) {
          errors.push(`Unexpected closing tag </${tok.name}> — no matching opening tag.`);
        } else {
          const expected = stack[stack.length - 1];
          if (expected !== tok.name) {
            errors.push(`Mismatched tags: opened <${expected}> but closed </${tok.name}>.`);
          } else {
            stack.pop();
          }
        }
      }

      // Attribute validation
      if ((tok.type === XT.OPEN_TAG || tok.type === XT.SELF_CLOSE) && tok.attrs) {
        const attrNames = tok.attrs.map((a) => a.name);
        const dupes     = attrNames.filter((n, idx) => attrNames.indexOf(n) !== idx);
        if (dupes.length > 0) {
          errors.push(`Duplicate attribute "${dupes[0]}" in <${tok.name}>.`);
        }

        // Check unquoted values
        for (const attr of tok.attrs) {
          if (attr.value !== null && attr.quote === '"' && attr.value.includes('"')) {
            warnings.push(`Attribute "${attr.name}" in <${tok.name}> contains unescaped double quote.`);
          }
        }
      }

      // CDATA validation
      if (tok.type === XT.CDATA) {
        if (tok.value.includes("]]>", 9)) {
          errors.push("CDATA section contains illegal sequence ']]>'.");
        }
      }
    }

    // Unclosed tags
    if (stack.length > 0) {
      for (const tag of stack) {
        errors.push(`Unclosed tag: <${tag}> was never closed.`);
      }
    }

    // Multiple root elements
    if (rootCount > 1) {
      errors.push(`XML must have exactly one root element — found ${rootCount} root-level elements.`);
    }

    if (rootCount === 0) {
      errors.push("No root element found — XML must have at least one element.");
    }

    // Common warnings
    const content = raw.trim();
    if (!content.startsWith("<?xml")) {
      warnings.push('Missing XML declaration: consider adding <?xml version="1.0" encoding="UTF-8"?>.');
    }

    if (content.length > 100000) {
      warnings.push("Large XML document — consider streaming for performance-sensitive operations.");
    }

    hasRootElement = rootCount >= 1;

    return {
      valid:    errors.length === 0,
      errors,
      warnings,
      tokenCount: tokens.length,
    };

  } catch (e) {
    return {
      valid:    false,
      errors:   [`Parse error: ${e.message}`],
      warnings: [],
    };
  }
}

// ── XML Analyzer ─────────────────────────────────────────────
function analyzeXml(xml) {
  try {
    const tokens = tokenizeXml(xml.trim());

    const elements     = tokens.filter((t) => t.type === XT.OPEN_TAG || t.type === XT.SELF_CLOSE);
    const selfClosing  = tokens.filter((t) => t.type === XT.SELF_CLOSE).length;
    const allAttrs     = tokens.flatMap((t) => (t.attrs || []).map((a) => a.name));
    const uniqueElems  = new Set(elements.map((t) => t.name));
    const uniqueAttrs  = new Set(allAttrs);
    const namespaces   = new Set(
      elements
        .filter((t) => t.name.includes(":"))
        .map((t) => t.name.split(":")[0])
    );
    const comments  = tokens.filter((t) => t.type === XT.COMMENT).length;
    const cdatas    = tokens.filter((t) => t.type === XT.CDATA).length;
    const textNodes = tokens.filter((t) => t.type === XT.TEXT).length;
    const pis       = tokens.filter((t) => t.type === XT.PI).length;
    const hasDecl   = tokens.some((t) => t.type === XT.XML_DECL);

    // Max depth
    let maxDepth = 0;
    let curDepth = 0;
    for (const tok of tokens) {
      if (tok.type === XT.OPEN_TAG) { curDepth++; maxDepth = Math.max(maxDepth, curDepth); }
      if (tok.type === XT.CLOSE_TAG) curDepth = Math.max(0, curDepth - 1);
    }

    // Element frequency
    const elemFreq = {};
    for (const t of elements) {
      elemFreq[t.name] = (elemFreq[t.name] || 0) + 1;
    }
    const topElements = Object.entries(elemFreq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      totalElements: elements.length,
      uniqueElements: uniqueElems.size,
      selfClosing,
      totalAttributes: allAttrs.length,
      uniqueAttributes: uniqueAttrs.size,
      namespaces:      [...namespaces],
      comments,
      cdatas,
      textNodes,
      pis,
      hasDecl,
      maxDepth,
      topElements,
    };
  } catch {
    return null;
  }
}

// ============================================================
// CONSTANTS
// ============================================================

const SAMPLES = {
  config: `<?xml version="1.0" encoding="UTF-8"?><configuration><appSettings><add key="ConnectionString" value="Server=localhost;Database=DevTools;Integrated Security=True"/><add key="MaxConnections" value="100"/><add key="EnableCaching" value="true"/><add key="CacheTimeout" value="3600"/><add key="ApiBaseUrl" value="https://api.example.com/v1"/><add key="ApiKey" value="sk-live-abc123def456"/></appSettings><logging level="Info" format="json"><targets><target name="console" type="ColoredConsole"/><target name="file" type="File" fileName="logs/app.log" archiveEvery="Day" maxArchiveFiles="30"/></targets></logging><security><cors origins="https://app.example.com,https://admin.example.com" methods="GET,POST,PUT,DELETE"/><jwt secret="harsh123" issuer="devtools-api" audience="devtools-client" expiryMinutes="60"/></security></configuration>`,

  rss: `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>DevTools Blog</title><link>https://devtools.app/blog</link><description>Latest articles on developer tools and best practices</description><language>en-us</language><lastBuildDate>Wed, 18 Mar 2026 10:00:00 GMT</lastBuildDate><atom:link href="https://devtools.app/rss.xml" rel="self" type="application/rss+xml"/><item><title>10 Must-Have Developer Tools in 2026</title><link>https://devtools.app/blog/10-tools-2026</link><description><![CDATA[Discover the essential tools every developer needs in their workflow for 2026, from AI assistants to performance profilers.]]></description><pubDate>Mon, 16 Mar 2026 09:00:00 GMT</pubDate><category>Tools</category><category>Productivity</category><guid isPermaLink="true">https://devtools.app/blog/10-tools-2026</guid></item><item><title>Understanding JSON Schema Validation</title><link>https://devtools.app/blog/json-schema</link><description><![CDATA[A comprehensive guide to JSON Schema validation with real-world examples and best practices.]]></description><pubDate>Fri, 14 Mar 2026 09:00:00 GMT</pubDate><category>JSON</category><guid isPermaLink="true">https://devtools.app/blog/json-schema</guid></item></channel></rss>`,

  soap: `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:UsernameToken><wsse:Username>apiuser</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">secret123</wsse:Password></wsse:UsernameToken></wsse:Security></soap:Header><soap:Body><GetUserRequest xmlns="http://api.example.com/users/v1"><UserId>12345</UserId><IncludeDetails>true</IncludeDetails><Fields><Field>name</Field><Field>email</Field><Field>phone</Field><Field>address</Field></Fields></GetUserRequest></soap:Body></soap:Envelope>`,

  maven: `<?xml version="1.0" encoding="UTF-8"?><project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd"><modelVersion>4.0.0</modelVersion><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.2.3</version></parent><groupId>com.example</groupId><artifactId>devtools-api</artifactId><version>1.0.0-SNAPSHOT</version><name>DevTools API</name><properties><java.version>21</java.version></properties><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency><dependency><groupId>io.jsonwebtoken</groupId><artifactId>jjwt-api</artifactId><version>0.12.5</version></dependency><dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency></dependencies></project>`,

  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300"><defs><linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1d4ed8;stop-opacity:1"/><stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1"/></linearGradient><filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/></filter></defs><rect width="400" height="300" fill="url(#bgGrad)" rx="12"/><circle cx="200" cy="120" r="50" fill="white" opacity="0.2" filter="url(#shadow)"/><text x="200" y="115" text-anchor="middle" font-family="system-ui" font-size="18" font-weight="700" fill="white">DevTools</text><text x="200" y="140" text-anchor="middle" font-family="system-ui" font-size="12" fill="rgba(255,255,255,0.8)">70+ Developer Tools</text><rect x="60" y="190" width="80" height="36" rx="8" fill="white" opacity="0.15"/><text x="100" y="212" text-anchor="middle" font-size="12" font-weight="600" fill="white">Format</text><rect x="160" y="190" width="80" height="36" rx="8" fill="white" opacity="0.15"/><text x="200" y="212" text-anchor="middle" font-size="12" font-weight="600" fill="white">Validate</text><rect x="260" y="190" width="80" height="36" rx="8" fill="white" opacity="0.15"/><text x="300" y="212" text-anchor="middle" font-size="12" font-weight="600" fill="white">Convert</text></svg>`,
};

const INDENT_OPTIONS = [
  { value: 2,     label: "2 spaces" },
  { value: 4,     label: "4 spaces" },
  { value: "tab", label: "Tabs"     },
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
        { label: "Input",      value: `${stats.inputLength?.toLocaleString()} chars`  },
        { label: "Output",     value: `${stats.outputLength?.toLocaleString()} chars` },
        { label: "Lines",      value: stats.outputLines?.toLocaleString()              },
        { label: "Elements",   value: stats.elements?.toLocaleString()                 },
        { label: "Attributes", value: stats.attributes?.toLocaleString()               },
        ...(stats.comments > 0  ? [{ label: "Comments",  value: stats.comments }]  : []),
        ...(stats.cdatas > 0    ? [{ label: "CDATA",     value: stats.cdatas }]    : []),
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
          { label: "Minified", size: minified.length, pct: miniPct, color: "bg-green-500" },
        ].map(({ label, size, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{label}</span>
              <span className={`font-mono font-semibold ${label === "Minified" ? "text-green-600" : "text-gray-600"}`}>
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
          { label: "Minified", value: `${minified.length.toLocaleString()} chars`, color: "text-green-600" },
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
function ValidationPanel({ xml }) {
  if (!xml.trim()) return null;
  const result = validateXml(xml);

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${
      result.valid ? "border-green-300" : "border-red-300"
    }`}>
      {/* Status header */}
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
            {result.valid ? "✓ Valid XML" : `✗ Invalid XML — ${result.errors.length} error${result.errors.length !== 1 ? "s" : ""}`}
          </p>
          {result.tokenCount > 0 && (
            <p className={`text-xs mt-0.5 ${result.valid ? "text-green-600" : "text-red-500"}`}>
              {result.tokenCount} tokens parsed
            </p>
          )}
        </div>
      </div>

      {/* Errors */}
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

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className={`px-5 py-3 space-y-2 ${result.errors.length > 0 ? "border-t border-amber-100 bg-amber-50" : "bg-white border-t border-amber-200"}`}>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            {result.warnings.length} Warning{result.warnings.length !== 1 ? "s" : ""}
          </p>
          {result.warnings.map((warn, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ── XML Analysis panel ────────────────────────────────────────
function XmlAnalysisPanel({ xml }) {
  if (!xml.trim()) return null;
  const a = analyzeXml(xml);
  if (!a) return null;

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
          { label: "Elements",        value: a.totalElements,    color: "text-blue-600",   icon: "🏷️" },
          { label: "Unique elements", value: a.uniqueElements,   color: "text-indigo-600", icon: "🔤" },
          { label: "Attributes",      value: a.totalAttributes,  color: "text-green-600",  icon: "⚙️" },
          { label: "Self-closing",    value: a.selfClosing,      color: "text-teal-600",   icon: "⟨/⟩" },
          { label: "Text nodes",      value: a.textNodes,        color: "text-amber-600",  icon: "📝" },
          { label: "Comments",        value: a.comments,         color: "text-gray-500",   icon: "💬" },
          { label: "CDATA sections",  value: a.cdatas,           color: "text-purple-600", icon: "📄" },
          { label: "Max depth",       value: a.maxDepth,         color: "text-rose-600",   icon: "⬇️" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <span className="text-base flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
              <p className={`text-base font-bold font-mono ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Namespaces */}
      {a.namespaces.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Namespace prefixes
          </p>
          <div className="flex flex-wrap gap-2">
            {a.namespaces.map((ns) => (
              <span key={ns} className="text-xs font-mono font-semibold px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg">
                {ns}:
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top elements */}
      {a.topElements.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Most used elements
          </p>
          <div className="space-y-1.5">
            {a.topElements.map(({ name, count }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-36 flex-shrink-0 truncate">
                  &lt;{name}&gt;
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${Math.min(100, (count / a.topElements[0].count) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-8 text-right font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document info */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap gap-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
            a.hasDecl
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-gray-50 border-gray-200 text-gray-400"
          }`}>
            <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.hasDecl ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
            </svg>
            XML declaration {a.hasDecl ? "present" : "missing"}
          </div>
          {a.namespaces.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-indigo-50 border-indigo-200 text-indigo-700">
              🌐 {a.namespaces.length} namespace{a.namespaces.length !== 1 ? "s" : ""}
            </div>
          )}
          {a.maxDepth > 8 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium bg-amber-50 border-amber-200 text-amber-700">
              ⚠️ Deep nesting ({a.maxDepth} levels)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function EmptyOutput({ mode }) {
  const Icon = mode === "minify" ? Minimize2 : FileText;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <Icon size={28} className="opacity-20" />
      <p className="text-xs text-gray-300">
        {mode === "minify"
          ? "Minified XML appears here"
          : "Formatted XML appears here"}
      </p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function XmlFormatter() {
  const [input,          setInput]          = useState("");
  const [output,         setOutput]         = useState("");
  const [error,          setError]          = useState(null);
  const [stats,          setStats]          = useState(null);
  const [mode,           setMode]           = useState("format");
  const [indentSize,     setIndentSize]     = useState(2);
  const [sortAttrs,      setSortAttrs]      = useState(false);
  const [removeComments, setRemoveComments] = useState(false);
  const [collapseInline, setCollapseInline] = useState(true);
  const [addXmlDecl,     setAddXmlDecl]     = useState(false);
  const [showLines,      setShowLines]      = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [showAnalysis,   setShowAnalysis]   = useState(false);
  const [autoProcess,    setAutoProcess]    = useState(false);
  const [activeSample,   setActiveSample]   = useState(null);

  // ── Process ──────────────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter XML to process.");
      setOutput("");
      setStats(null);
      return;
    }

    if (mode === "minify") {
      const result = minifyXml(trimmed);
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
      const result = formatXml(trimmed, {
        indentSize:    indentSize === "tab" ? 2 : indentSize,
        useTabs:       indentSize === "tab",
        sortAttributes: sortAttrs,
        removeComments,
        collapseInline,
        addXmlDecl,
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
  }, [input, mode, indentSize, sortAttrs, removeComments, collapseInline, addXmlDecl]);

  // Auto process
  useEffect(() => {
    if (!autoProcess || !input.trim()) return;
    const t = setTimeout(handleProcess, 400);
    return () => clearTimeout(t);
  }, [input, autoProcess, handleProcess]);

  // Re-run on option changes
  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [indentSize, sortAttrs, removeComments, collapseInline, addXmlDecl, mode]);

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

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars`  : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars · ${output.split("\n").length} lines` : null;

  return (
    <div className="space-y-4">

{/* ── Mode selector ────────────────────────────────────── */}
<div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {[
    { value: "format", label: "Format / Beautify", icon: FileText },
    { value: "minify", label: "Minify", icon: Minimize2 },
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

      {/* ── Options toolbar ──────────────────────────────────── */}
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
          {mode === "minify" ? "Minify XML" : "Format XML"}
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

            <Toggle
              checked={sortAttrs}
              onChange={setSortAttrs}
              label="Sort attributes"
              description="Sort element attributes alphabetically"
            />
            <Toggle
              checked={removeComments}
              onChange={setRemoveComments}
              label="Remove comments"
              description="Strip all XML comments from output"
            />
            <Toggle
              checked={collapseInline}
              onChange={setCollapseInline}
              label="Inline text"
              description="Collapse short single-text elements to one line"
            />
            <Toggle
              checked={addXmlDecl}
              onChange={setAddXmlDecl}
              label="Add declaration"
              description="Add XML declaration if not present"
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
          description="Show XML validation results"
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
            { key: "config", label: "Config" },
            { key: "rss",    label: "RSS feed" },
            { key: "soap",   label: "SOAP" },
            { key: "maven",  label: "Maven POM" },
            { key: "svg",    label: "SVG" },
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

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label="XML Input"
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
            placeholder={`Paste XML to ${mode}...\n\nSupports:\n• XML 1.0 / 1.1 with any encoding\n• Namespaced elements (xmlns:prefix)\n• CDATA sections (<![CDATA[...]]>)\n• Processing instructions (<?pi target?>)\n• DOCTYPE declarations\n• Deeply nested structures\n• RSS / Atom feeds\n• SOAP envelopes\n• SVG documents\n• Maven POM files`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[400px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "minify" ? "Minified XML" : "Formatted XML"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(
                      output,
                      mode === "minify" ? "minified.xml" : "formatted.xml",
                      "application/xml"
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
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[400px] relative">
            {output && showLines && mode === "format" && (
              <LineNumbers text={output} />
            )}
            {output ? (
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="flex-1 relative">
                <EmptyOutput mode={mode} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Stats ────────────────────────────────────────────── */}
      {stats && mode === "format" && <StatsBar stats={stats} />}

      {/* ── Size comparison ──────────────────────────────────── */}
      {stats && mode === "minify" && (
        <SizeComparison original={input} minified={output} />
      )}

      {/* ── Validation ───────────────────────────────────────── */}
      {showValidation && input.trim() && (
        <ValidationPanel xml={input} />
      )}

      {/* ── Analysis ─────────────────────────────────────────── */}
      {showAnalysis && input.trim() && (
        <XmlAnalysisPanel xml={output || input} />
      )}
    </div>
  );
}