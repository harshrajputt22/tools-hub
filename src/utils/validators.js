// ============================================================
// VALIDATORS UTILITY
// src/utils/validators.js
//
// All validation logic used across tool components.
// Every validator follows the same contract:
//
//   Input:  (input: string, options?: object)
//   Output: {
//     valid:    boolean,
//     errors:   Array<{ line, col, message, severity }>
//     warnings: Array<{ line, col, message }>
//     stats:    object
//     meta:     object   (extra parsed info per validator)
//   }
//
// Severity levels: "error" | "warning" | "info"
//
// This contract means every tool's validation UI is
// identical — same error list component, same color coding,
// same line/col display.
// ============================================================

// ============================================================
// SHARED HELPERS
// ============================================================

// ── Build a valid result ──────────────────────────────────────
function pass(stats = {}, meta = {}) {
  return {
    valid:    true,
    errors:   [],
    warnings: [],
    stats,
    meta,
  };
}

// ── Build an invalid result ───────────────────────────────────
function fail(errors = [], warnings = [], stats = {}, meta = {}) {
  return {
    valid:    errors.length === 0,
    errors:   Array.isArray(errors) ? errors : [errors],
    warnings: Array.isArray(warnings) ? warnings : [warnings],
    stats,
    meta,
  };
}

// ── Build a single error object ───────────────────────────────
function makeError(message, line = null, col = null, severity = "error") {
  return { message, line, col, severity };
}

// ── Build a single warning object ────────────────────────────
function makeWarning(message, line = null, col = null) {
  return { message, line, col, severity: "warning" };
}

// ── Safe trim ─────────────────────────────────────────────────
function safeTrim(str) {
  return typeof str === "string" ? str.trim() : "";
}

// ── Get line and column from string position ──────────────────
function getLineCol(str, position) {
  const before = str.slice(0, position);
  const lines  = before.split("\n");
  return {
    line: lines.length,
    col:  lines[lines.length - 1].length + 1,
  };
}

// ── Count occurrences of a value type in JSON ─────────────────
function countJsonTypes(obj) {
  const counts = {
    strings: 0,
    numbers: 0,
    booleans: 0,
    nulls: 0,
    arrays: 0,
    objects: 0,
  };

  function walk(val) {
    if (val === null)                { counts.nulls++;    return; }
    if (typeof val === "string")     { counts.strings++;  return; }
    if (typeof val === "number")     { counts.numbers++;  return; }
    if (typeof val === "boolean")    { counts.booleans++; return; }
    if (Array.isArray(val)) {
      counts.arrays++;
      val.forEach(walk);
      return;
    }
    if (typeof val === "object") {
      counts.objects++;
      Object.values(val).forEach(walk);
    }
  }

  walk(obj);
  return counts;
}

// ── Max depth of a nested object ─────────────────────────────
function getJsonDepth(obj, depth = 0) {
  if (obj === null || typeof obj !== "object") return depth;
  const children = Array.isArray(obj)
    ? obj
    : Object.values(obj);
  if (children.length === 0) return depth;
  return Math.max(...children.map((c) => getJsonDepth(c, depth + 1)));
}

// ============================================================
// JSON VALIDATOR
// ============================================================

/**
 * Validate a JSON string with detailed error reporting.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.checkDuplicateKeys  - Warn on duplicate keys (default: true)
 * @param {boolean} options.checkDepth          - Warn if depth > maxDepth (default: true)
 * @param {number}  options.maxDepth            - Default: 20
 * @param {boolean} options.allowComments       - Strip // and block comments (default: false)
 * @param {boolean} options.strict              - Disallow trailing commas (default: true)
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateJson(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) {
    return fail([makeError("Input is empty.")]);
  }

  const {
    checkDuplicateKeys = true,
    checkDepth         = true,
    maxDepth           = 20,
    allowComments      = false,
    strict             = true,
  } = options;

  const errors   = [];
  const warnings = [];
  let   cleaned  = raw;

  // ── Strip comments if allowed ────────────────────────────
  if (allowComments) {
    cleaned = cleaned
      .replace(/\/\/[^\n]*/g,      "")  // single-line
      .replace(/\/\*[\s\S]*?\*\//g, ""); // block
  }

  // ── Check for trailing commas ─────────────────────────────
  if (strict) {
    const trailingComma = cleaned.match(/,\s*[}\]]/);
    if (trailingComma) {
      const idx = cleaned.indexOf(trailingComma[0]);
      const { line, col } = getLineCol(cleaned, idx);
      errors.push(makeError(
        "Trailing comma found. JSON does not allow trailing commas.",
        line, col
      ));
    }
  }

  // ── Try parsing ───────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const msg = e.message || "Invalid JSON";

    // Extract position from error message
    const posMatch = msg.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const { line, col } = getLineCol(cleaned, pos);
      errors.push(makeError(
        `Parse error: ${msg}`,
        line,
        col
      ));
    } else {
      errors.push(makeError(`Parse error: ${msg}`));
    }

    // Try to give a helpful hint
    const hint = getJsonHint(cleaned, msg);
    if (hint) warnings.push(makeWarning(hint));

    return fail(errors, warnings, {
      inputLength: raw.length,
      inputLines:  raw.split("\n").length,
    });
  }

  // ── Duplicate keys check ─────────────────────────────────
  if (checkDuplicateKeys) {
    const dupes = findDuplicateKeys(raw);
    dupes.forEach(({ key, line }) => {
      warnings.push(makeWarning(
        `Duplicate key "${key}" — only the last value will be used.`,
        line
      ));
    });
  }

  // ── Depth check ──────────────────────────────────────────
  const depth = getJsonDepth(parsed);
  if (checkDepth && depth > maxDepth) {
    warnings.push(makeWarning(
      `Nesting depth is ${depth} (exceeds recommended max of ${maxDepth}). Deep nesting can cause performance issues.`
    ));
  }

  // ── Type-specific warnings ────────────────────────────────
  if (typeof parsed === "string") {
    warnings.push(makeWarning(
      "Root value is a string. Valid JSON but usually an object or array is expected."
    ));
  }

  if (parsed === null) {
    warnings.push(makeWarning("Root value is null."));
  }

  // ── Stats ─────────────────────────────────────────────────
  const typeCounts = countJsonTypes(parsed);
  const keyCount   = countAllKeys(parsed);

  const stats = {
    inputLength: raw.length,
    inputLines:  raw.split("\n").length,
    depth,
    keyCount,
    ...typeCounts,
    rootType: Array.isArray(parsed)
      ? "array"
      : parsed === null
      ? "null"
      : typeof parsed,
  };

  if (errors.length > 0) {
    return fail(errors, warnings, stats, { parsed: null });
  }

  return {
    ...pass(stats, { parsed }),
    warnings,
  };
}

// ── Find duplicate keys in raw JSON string ────────────────────
function findDuplicateKeys(raw) {
  const duplicates = [];
  const keyPattern = /"([^"\\]|\\.)*"\s*:/g;
  const seen       = new Map();
  let   match;

  while ((match = keyPattern.exec(raw)) !== null) {
    const key  = match[0].replace(/\s*:$/, "").replace(/^"|"$/g, "");
    const line = raw.slice(0, match.index).split("\n").length;

    if (seen.has(key)) {
      duplicates.push({ key, line });
    } else {
      seen.set(key, true);
    }
  }

  return duplicates;
}

// ── Count all keys including nested ──────────────────────────
function countAllKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.reduce((n, v) => n + countAllKeys(v), 0);
  }
  if (obj !== null && typeof obj === "object") {
    const keys = Object.keys(obj);
    return keys.length + keys.reduce((n, k) => n + countAllKeys(obj[k]), 0);
  }
  return 0;
}

// ── Get a helpful hint for common JSON errors ─────────────────
function getJsonHint(raw, errorMsg) {
  if (/undefined/i.test(raw)) {
    return "Hint: JSON does not support 'undefined'. Use null instead.";
  }
  if (/'\s*:/.test(raw)) {
    return "Hint: JSON keys must be double-quoted, not single-quoted.";
  }
  if (/:\s*'/.test(raw)) {
    return "Hint: JSON string values must be double-quoted, not single-quoted.";
  }
  if (/,\s*[}\]]/.test(raw)) {
    return "Hint: JSON does not allow trailing commas.";
  }
  if (/\/\//.test(raw)) {
    return "Hint: JSON does not support comments. Enable 'Allow Comments' option.";
  }
  if (/NaN|Infinity|-Infinity/.test(raw)) {
    return "Hint: JSON does not support NaN or Infinity. Use null or a number.";
  }
  if (/function\s*\(/.test(raw)) {
    return "Hint: JSON does not support functions.";
  }
  return null;
}

// ============================================================
// YAML VALIDATOR
// ============================================================

/**
 * Validate YAML with error reporting.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.allowDuplicateKeys - Default: false
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateYaml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const { allowDuplicateKeys = false } = options;

  try {
    const yaml = require("js-yaml");

    const documents = [];
    const errors    = [];
    const warnings  = [];

    // Load all YAML documents (supports multi-doc with ---)
    try {
      yaml.loadAll(raw, (doc) => documents.push(doc), {
        json: !allowDuplicateKeys,
      });
    } catch (e) {
      if (e.mark) {
        errors.push(makeError(
          e.reason || e.message,
          e.mark.line + 1,
          e.mark.column + 1
        ));
      } else {
        errors.push(makeError(e.message));
      }
      return fail(errors, [], {
        inputLength: raw.length,
        inputLines:  raw.split("\n").length,
      });
    }

    // Check for null documents
    documents.forEach((doc, i) => {
      if (doc === null || doc === undefined) {
        warnings.push(makeWarning(
          `Document ${i + 1} is empty or null.`
        ));
      }
    });

    const stats = {
      inputLength:   raw.length,
      inputLines:    raw.split("\n").length,
      documentCount: documents.length,
      rootType:      documents[0] === null
        ? "null"
        : Array.isArray(documents[0])
        ? "array"
        : typeof documents[0],
    };

    return {
      ...pass(stats, { parsed: documents[0], documents }),
      warnings,
    };
  } catch (e) {
    return fail([makeError(`YAML validation failed: ${e.message}`)]);
  }
}

// ============================================================
// XML VALIDATOR
// ============================================================

/**
 * Validate XML structure and well-formedness.
 *
 * @param {string} input
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateXml(input) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const errors   = [];
  const warnings = [];

  // ── Well-formedness checks ────────────────────────────────

  // Check XML declaration
  const hasDeclaration = /^<\?xml\s/i.test(raw);
  if (!hasDeclaration) {
    warnings.push(makeWarning(
      "No XML declaration found. Consider adding: <?xml version=\"1.0\" encoding=\"UTF-8\"?>"
    ));
  }

  // Check for unclosed tags using a simple stack
  const tagErrors = checkXmlTags(raw);
  errors.push(...tagErrors);

  // Check for unescaped special characters in text nodes
  const ampErrors = checkUnescapedAmpersands(raw);
  warnings.push(...ampErrors);

  // Check attribute quoting
  const attrErrors = checkAttributeQuoting(raw);
  errors.push(...attrErrors);

  // Count elements
  const elementMatches = raw.match(/<[a-zA-Z][^>]*>/g) || [];
  const elementCount   = elementMatches.length;

  // Count attributes
  const attrMatches = raw.match(/\s+[\w:.-]+=["'][^"']*["']/g) || [];
  const attrCount   = attrMatches.length;

  const stats = {
    inputLength:  raw.length,
    inputLines:   raw.split("\n").length,
    elementCount,
    attrCount,
    hasDeclaration,
  };

  if (errors.length > 0) {
    return fail(errors, warnings, stats);
  }

  return {
    ...pass(stats),
    warnings,
  };
}

// ── Check XML tag structure ───────────────────────────────────
function checkXmlTags(raw) {
  const errors = [];
  const stack  = [];

  // Regex to match opening, closing, and self-closing tags
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9:.-]*)(\s[^>]*)?(\/?)>/g;
  let match;

  while ((match = tagRegex.exec(raw)) !== null) {
    const [full, tagName, , selfClose] = match;
    const isClosing    = full.startsWith("</");
    const isSelfClose  = selfClose === "/" || full.endsWith("/>");

    if (isSelfClose || isClosing === false && isSelfClose) {
      continue; // self-closing — no stack management
    }

    if (isClosing) {
      if (stack.length === 0) {
        const { line, col } = getLineCol(raw, match.index);
        errors.push(makeError(
          `Unexpected closing tag </${tagName}> — no matching opening tag.`,
          line, col
        ));
      } else {
        const last = stack[stack.length - 1];
        if (last.name !== tagName) {
          const { line, col } = getLineCol(raw, match.index);
          errors.push(makeError(
            `Mismatched tags: expected </${last.name}> but found </${tagName}>.`,
            line, col
          ));
        } else {
          stack.pop();
        }
      }
    } else {
      // Opening tag
      stack.push({
        name:  tagName,
        index: match.index,
      });
    }
  }

  // Any remaining unclosed tags
  stack.forEach(({ name, index }) => {
    const { line, col } = getLineCol(raw, index);
    errors.push(makeError(
      `Unclosed tag <${name}>.`,
      line, col
    ));
  });

  return errors;
}

// ── Check for unescaped & in text ─────────────────────────────
function checkUnescapedAmpersands(raw) {
  const warnings = [];

  // Find & that is NOT part of an entity (&amp; &#NNN; &#xHHH;)
  const regex = /&(?!amp;|lt;|gt;|quot;|apos;|#[0-9]+;|#x[0-9a-fA-F]+;|[a-zA-Z]+;)/g;
  let match;

  while ((match = regex.exec(raw)) !== null) {
    // Skip if inside a CDATA section
    const before = raw.slice(0, match.index);
    const cdataOpen  = (before.match(/<!\[CDATA\[/g) || []).length;
    const cdataClose = (before.match(/\]\]>/g) || []).length;
    if (cdataOpen > cdataClose) continue;

    const { line, col } = getLineCol(raw, match.index);
    warnings.push(makeWarning(
      `Unescaped '&' found. Use '&amp;' in text content.`,
      line, col
    ));
  }

  return warnings;
}

// ── Check attribute quoting ───────────────────────────────────
function checkAttributeQuoting(raw) {
  const errors = [];

  // Attributes without quotes: attr=value (not attr="value")
  const unquoted = /\s+([\w:.-]+)=(?!["'])[^\s>]+/g;
  let match;

  while ((match = unquoted.exec(raw)) !== null) {
    const { line, col } = getLineCol(raw, match.index);
    errors.push(makeError(
      `Unquoted attribute value for "${match[1]}". XML requires quoted attributes.`,
      line, col
    ));
  }

  return errors;
}

// ============================================================
// HTML VALIDATOR
// ============================================================

/**
 * Validate HTML structure with common issue detection.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.checkAccessibility - Check a11y basics (default: true)
 * @param {boolean} options.checkSeo           - Check SEO basics (default: true)
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateHtml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const {
    checkAccessibility = true,
    checkSeo           = true,
  } = options;

  const errors   = [];
  const warnings = [];

  // ── Structure checks ──────────────────────────────────────

  // DOCTYPE
  if (!/<\s*!DOCTYPE\s+html/i.test(raw)) {
    warnings.push(makeWarning(
      "Missing <!DOCTYPE html> declaration."
    ));
  }

  // <html> tag
  if (!/<html[\s>]/i.test(raw)) {
    warnings.push(makeWarning("Missing <html> tag."));
  } else if (!/<html[^>]+lang=/i.test(raw)) {
    warnings.push(makeWarning(
      "Missing lang attribute on <html>. Example: <html lang=\"en\">"
    ));
  }

  // <head> tag
  if (!/<head[\s>]/i.test(raw)) {
    warnings.push(makeWarning("Missing <head> tag."));
  }

  // <body> tag
  if (!/<body[\s>]/i.test(raw)) {
    warnings.push(makeWarning("Missing <body> tag."));
  }

  // <title> tag
  const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    warnings.push(makeWarning("Missing <title> tag."));
  } else if (!titleMatch[1].trim()) {
    warnings.push(makeWarning("Empty <title> tag."));
  }

  // Charset
  if (!/<meta[^>]+charset/i.test(raw)) {
    warnings.push(makeWarning(
      "Missing charset meta tag. Add: <meta charset=\"UTF-8\">"
    ));
  }

  // Viewport
  if (!/<meta[^>]+viewport/i.test(raw)) {
    warnings.push(makeWarning(
      "Missing viewport meta tag. Add: <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
    ));
  }

  // ── Unclosed tags ─────────────────────────────────────────
  const VOID_ELEMENTS = new Set([
    "area","base","br","col","embed","hr","img","input",
    "link","meta","param","source","track","wbr",
  ]);

  const tagStack  = [];
  const tagRegex  = /<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?(\/?)>/g;
  let   tagMatch;

  while ((tagMatch = tagRegex.exec(raw)) !== null) {
    const [full, tagName, , selfClose] = tagMatch;
    const lowerTag = tagName.toLowerCase();

    if (VOID_ELEMENTS.has(lowerTag)) continue;
    if (selfClose === "/") continue;

    if (full.startsWith("</")) {
      // Closing tag
      if (tagStack.length > 0) {
        const last = tagStack[tagStack.length - 1];
        if (last.name === lowerTag) {
          tagStack.pop();
        }
        // HTML is more lenient — don't error on mismatches
      }
    } else {
      tagStack.push({ name: lowerTag, index: tagMatch.index });
    }
  }

  // Non-critical unclosed tags
  const ignoredUnclosed = new Set(["html","head","body","p","li","dt","dd","tr","td","th"]);
  tagStack.forEach(({ name, index }) => {
    if (!ignoredUnclosed.has(name)) {
      const { line, col } = getLineCol(raw, index);
      errors.push(makeError(
        `Unclosed <${name}> tag.`,
        line, col
      ));
    }
  });

  // ── Accessibility checks ──────────────────────────────────
  if (checkAccessibility) {
    // Images without alt
    const imgTags = raw.match(/<img[^>]*>/gi) || [];
    imgTags.forEach((img) => {
      if (!/alt\s*=/i.test(img)) {
        const idx = raw.indexOf(img);
        const { line } = getLineCol(raw, idx);
        warnings.push(makeWarning(
          "Image missing alt attribute.",
          line
        ));
      }
    });

    // Empty links
    const anchors = raw.match(/<a[^>]*>[\s]*<\/a>/gi) || [];
    if (anchors.length > 0) {
      warnings.push(makeWarning(
        `${anchors.length} empty <a> tag(s) found. Links should have descriptive text.`
      ));
    }

    // Form inputs without labels
    const inputs = raw.match(/<input[^>]*>/gi) || [];
    inputs.forEach((inp) => {
      const hasId      = /\bid\s*=/i.test(inp);
      const hasLabel   = /<label[^>]*for=/i.test(raw);
      const hasAria    = /aria-label/i.test(inp);
      const isHidden   = /type\s*=\s*["']?hidden["']?/i.test(inp);
      const isButton   = /type\s*=\s*["']?(submit|button|reset)["']?/i.test(inp);

      if (!isHidden && !isButton && !hasAria && !(hasId && hasLabel)) {
        warnings.push(makeWarning(
          "Input element may be missing an associated label or aria-label."
        ));
      }
    });

    // Heading hierarchy
    const headings = raw.match(/<h[1-6][^>]*>/gi) || [];
    if (headings.length > 0) {
      const levels = headings.map((h) =>
        parseInt(h.match(/<h([1-6])/i)?.[1] || "1")
      );
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
          warnings.push(makeWarning(
            `Heading hierarchy skipped from h${levels[i - 1]} to h${levels[i]}. This can confuse screen readers.`
          ));
          break;
        }
      }
    }
  }

  // ── SEO checks ────────────────────────────────────────────
  if (checkSeo) {
    // Meta description
    if (!/<meta[^>]+name\s*=\s*["']description["']/i.test(raw)) {
      warnings.push(makeWarning(
        "Missing meta description. Add: <meta name=\"description\" content=\"...\">"
      ));
    }

    // H1 check
    const h1Count = (raw.match(/<h1[\s>]/gi) || []).length;
    if (h1Count === 0) {
      warnings.push(makeWarning("No <h1> tag found. Each page should have one main heading."));
    } else if (h1Count > 1) {
      warnings.push(makeWarning(
        `Found ${h1Count} <h1> tags. Best practice is one <h1> per page.`
      ));
    }

    // Canonical
    if (!/<link[^>]+rel\s*=\s*["']canonical["']/i.test(raw)) {
      warnings.push(makeWarning(
        "Missing canonical link tag. Consider adding: <link rel=\"canonical\" href=\"...\">"
      ));
    }
  }

  // ── Stats ─────────────────────────────────────────────────
  const stats = {
    inputLength:  raw.length,
    inputLines:   raw.split("\n").length,
    tagCount:     (raw.match(/<[a-zA-Z][^>]*>/g) || []).length,
    scriptCount:  (raw.match(/<script[^>]*>/gi) || []).length,
    styleCount:   (raw.match(/<style[^>]*>/gi) || []).length,
    linkCount:    (raw.match(/<link[^>]*>/gi) || []).length,
    imgCount:     (raw.match(/<img[^>]*>/gi) || []).length,
    hasDoctype:   /<\s*!DOCTYPE\s+html/i.test(raw),
  };

  return fail(errors, warnings, stats);
}

// ============================================================
// URL VALIDATOR
// ============================================================

/**
 * Validate a URL string.
 *
 * @param {string} input
 * @param {object} options
 * @param {string[]} options.allowedProtocols - Default: ["http:", "https:"]
 * @param {boolean}  options.requireHttps     - Default: false
 * @param {boolean}  options.checkLength      - Warn if > 2083 chars (default: true)
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateUrl(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const {
    allowedProtocols = ["http:", "https:"],
    requireHttps     = false,
    checkLength      = true,
  } = options;

  const errors   = [];
  const warnings = [];

  // ── Length check ──────────────────────────────────────────
  if (checkLength && raw.length > 2083) {
    warnings.push(makeWarning(
      `URL is ${raw.length} characters. Internet Explorer limits URLs to 2083 characters.`
    ));
  }

  // ── Parse with URL API ────────────────────────────────────
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    // Try with https:// prepended
    try {
      parsed = new URL(`https://${raw}`);
      warnings.push(makeWarning(
        "URL is missing a protocol. Assuming https://"
      ));
    } catch {
      return fail(
        [makeError(`Invalid URL: "${raw}" is not a valid URL.`)],
        [],
        { inputLength: raw.length }
      );
    }
  }

  // ── Protocol check ────────────────────────────────────────
  if (!allowedProtocols.includes(parsed.protocol)) {
    errors.push(makeError(
      `Invalid protocol "${parsed.protocol}". Allowed: ${allowedProtocols.join(", ")}`
    ));
  }

  if (requireHttps && parsed.protocol !== "https:") {
    errors.push(makeError(
      "URL must use HTTPS."
    ));
  }

  // ── Hostname checks ───────────────────────────────────────
  if (!parsed.hostname) {
    errors.push(makeError("URL is missing a hostname."));
  } else {
    // Localhost warning
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      warnings.push(makeWarning(
        "URL points to localhost. This only works on your local machine."
      ));
    }

    // IP address warning
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname)) {
      warnings.push(makeWarning(
        "URL uses an IP address instead of a domain name."
      ));
    }

    // Suspicious TLDs
    const suspiciousTlds = [".tk", ".ml", ".ga", ".cf", ".gq"];
    if (suspiciousTlds.some((tld) => parsed.hostname.endsWith(tld))) {
      warnings.push(makeWarning(
        "URL uses a TLD commonly associated with free/spam domains."
      ));
    }
  }

  // ── Credentials in URL ────────────────────────────────────
  if (parsed.username || parsed.password) {
    warnings.push(makeWarning(
      "URL contains credentials (username/password). This is a security risk."
    ));
  }

  // ── Fragment-only URL ─────────────────────────────────────
  if (parsed.pathname === "/" && !parsed.search && parsed.hash) {
    warnings.push(makeWarning("URL is fragment-only."));
  }

  // ── Query param checks ────────────────────────────────────
  const params = [];
  parsed.searchParams.forEach((value, key) => {
    params.push({ key, value });
  });

  const stats = {
    inputLength:  raw.length,
    protocol:     parsed.protocol,
    hostname:     parsed.hostname,
    port:         parsed.port || null,
    pathname:     parsed.pathname,
    paramCount:   params.length,
    hasFragment:  !!parsed.hash,
  };

  const meta = {
    parsed,
    params,
    isHttps:     parsed.protocol === "https:",
    isLocalhost: ["localhost", "127.0.0.1"].includes(parsed.hostname),
  };

  return fail(errors, warnings, stats, meta);
}

// ============================================================
// EMAIL VALIDATOR
// ============================================================

/**
 * Validate an email address format.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.checkMx - Check MX record (client-side only hints)
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateEmail(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const errors   = [];
  const warnings = [];

  // ── Basic format check ────────────────────────────────────
  // RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(raw)) {
    errors.push(makeError("Invalid email address format."));
  }

  // ── Length checks ─────────────────────────────────────────
  if (raw.length > 254) {
    errors.push(makeError(
      `Email is too long (${raw.length} chars). Maximum is 254 characters.`
    ));
  }

  const [localPart, domain] = raw.split("@");

  if (localPart && localPart.length > 64) {
    errors.push(makeError(
      `Local part (before @) is too long (${localPart.length} chars). Maximum is 64.`
    ));
  }

  // ── Common issues ─────────────────────────────────────────
  if (localPart) {
    if (localPart.startsWith(".") || localPart.endsWith(".")) {
      errors.push(makeError(
        "Local part cannot start or end with a period."
      ));
    }

    if (/\.{2,}/.test(localPart)) {
      errors.push(makeError(
        "Local part cannot contain consecutive periods."
      ));
    }
  }

  // ── Domain checks ─────────────────────────────────────────
  if (domain) {
    if (!domain.includes(".")) {
      errors.push(makeError("Domain must contain at least one dot."));
    }

    const tld = domain.split(".").pop();
    if (tld && tld.length < 2) {
      errors.push(makeError(
        `TLD "${tld}" is too short. Minimum 2 characters.`
      ));
    }

    // Common typos
    const commonTypos = {
      "gmai.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gamil.com": "gmail.com",
      "yaho.com":  "yahoo.com",
      "yahooo.com":"yahoo.com",
      "hotmai.com":"hotmail.com",
      "outlok.com":"outlook.com",
    };

    if (domain && commonTypos[domain.toLowerCase()]) {
      warnings.push(makeWarning(
        `Possible typo: did you mean "${localPart}@${commonTypos[domain.toLowerCase()]}"?`
      ));
    }

    // Disposable email domains
    const disposable = [
      "mailinator.com","guerrillamail.com","tempmail.com",
      "throwam.com","sharklasers.com","guerrillamailblock.com",
      "yopmail.com","maildrop.cc","dispostable.com",
    ];
    if (disposable.includes(domain?.toLowerCase())) {
      warnings.push(makeWarning(
        "This appears to be a disposable/temporary email address."
      ));
    }
  }

  const stats = {
    inputLength: raw.length,
    localPart,
    domain,
  };

  const meta = {
    localPart,
    domain,
    tld: domain?.split(".").pop(),
    isDisposable: false,
  };

  return fail(errors, warnings, stats, meta);
}

// ============================================================
// REGEX VALIDATOR
// ============================================================

/**
 * Validate a regex pattern and return match information.
 *
 * @param {string} pattern  - Regex pattern string
 * @param {string} testStr  - Test string to match against
 * @param {object} options
 * @param {string}  options.flags - Regex flags: "gi" etc (default: "g")
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateRegex(pattern, testStr = "", options = {}) {
  if (!pattern) return fail([makeError("Pattern is empty.")]);

  const { flags = "g" } = options;
  const errors   = [];
  const warnings = [];

  // ── Validate the pattern compiles ────────────────────────
  let regex;
  try {
    regex = new RegExp(pattern, flags);
  } catch (e) {
    return fail(
      [makeError(`Invalid regex: ${e.message}`)],
      [],
      { pattern, flags }
    );
  }

  // ── Performance warnings ──────────────────────────────────
  // Check for catastrophic backtracking patterns
  if (/\(.*\+\)\+/.test(pattern) || /\(.*\*\)\*/.test(pattern)) {
    warnings.push(makeWarning(
      "Pattern may cause catastrophic backtracking. Nested quantifiers like (a+)+ can cause exponential time."
    ));
  }

  // Warn on very broad patterns
  if (pattern === ".*" || pattern === ".+") {
    warnings.push(makeWarning(
      "Very broad pattern — matches almost everything."
    ));
  }

  // ── Match against test string ─────────────────────────────
  const matches  = [];
  const groups   = [];
  let   match;
  let   matchCount = 0;

  if (testStr) {
    const safeRegex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");

    while ((match = safeRegex.exec(testStr)) !== null) {
      matchCount++;
      matches.push({
        value:  match[0],
        index:  match.index,
        length: match[0].length,
        groups: match.slice(1),
      });

      // Capture group names
      if (match.groups) {
        groups.push(match.groups);
      }

      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        safeRegex.lastIndex++;
      }

      // Safety: stop at 1000 matches
      if (matchCount >= 1000) {
        warnings.push(makeWarning(
          "Stopped after 1000 matches. Pattern may be too broad."
        ));
        break;
      }
    }
  }

  // ── Named groups ──────────────────────────────────────────
  const namedGroups = [...pattern.matchAll(/\(\?<([a-zA-Z][a-zA-Z0-9]*)>/g)]
    .map((m) => m[1]);

  // ── Stats ─────────────────────────────────────────────────
  const stats = {
    pattern,
    flags,
    matchCount,
    groupCount:      (pattern.match(/\((?!\?:|\?<[!=])/g) || []).length,
    namedGroupCount: namedGroups.length,
    testLength:      testStr.length,
  };

  const meta = {
    regex,
    matches,
    namedGroups,
    hasNamedGroups: namedGroups.length > 0,
    isGlobal:  flags.includes("g"),
    isMultiline: flags.includes("m"),
    isCaseInsensitive: flags.includes("i"),
  };

  return {
    ...pass(stats, meta),
    warnings,
  };
}

// ============================================================
// CRON EXPRESSION VALIDATOR
// ============================================================

/**
 * Validate a cron expression and describe its schedule.
 *
 * @param {string} input  - Cron expression (5 or 6 fields)
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validateCron(input) {
  const raw = safeTrim(input);
  if (!raw) return fail([makeError("Input is empty.")]);

  const errors   = [];
  const warnings = [];

  // Split into fields
  const fields = raw.trim().split(/\s+/);

  // Support 5-field (standard) and 6-field (with seconds)
  if (fields.length < 5 || fields.length > 6) {
    return fail([makeError(
      `Invalid cron expression: expected 5 or 6 fields, got ${fields.length}.`
    )]);
  }

  const hasSeconds = fields.length === 6;
  const [
    secondOrMinute,
    minuteOrHour,
    hourOrDay,
    dayOrMonth,
    monthOrWeekday,
    weekdayOrUndef,
  ] = fields;

  const parts = hasSeconds
    ? {
        second:  { value: secondOrMinute, min: 0, max: 59,  name: "second"  },
        minute:  { value: minuteOrHour,   min: 0, max: 59,  name: "minute"  },
        hour:    { value: hourOrDay,       min: 0, max: 23,  name: "hour"    },
        day:     { value: dayOrMonth,      min: 1, max: 31,  name: "day"     },
        month:   { value: monthOrWeekday,  min: 1, max: 12,  name: "month"   },
        weekday: { value: weekdayOrUndef,  min: 0, max: 7,   name: "weekday" },
      }
    : {
        minute:  { value: secondOrMinute, min: 0, max: 59,  name: "minute"  },
        hour:    { value: minuteOrHour,   min: 0, max: 23,  name: "hour"    },
        day:     { value: hourOrDay,       min: 1, max: 31,  name: "day"     },
        month:   { value: dayOrMonth,      min: 1, max: 12,  name: "month"   },
        weekday: { value: monthOrWeekday,  min: 0, max: 7,   name: "weekday" },
      };

  // ── Validate each field ───────────────────────────────────
  Object.values(parts).forEach(({ value, min, max, name }) => {
    const fieldErrors = validateCronField(value, min, max, name);
    errors.push(...fieldErrors);
  });

  if (errors.length > 0) {
    return fail(errors, [], { expression: raw });
  }

  // ── Human description ─────────────────────────────────────
  const description = describeCron(parts, hasSeconds);

  // ── Next run times ────────────────────────────────────────
  const nextRuns = getNextCronRuns(raw, 3);

  const stats = {
    expression: raw,
    fieldCount: fields.length,
    hasSeconds,
  };

  const meta = {
    parts,
    description,
    nextRuns,
    isEveryMinute:  parts.minute?.value === "*",
    isEveryHour:    parts.hour?.value   === "*",
    isEveryDay:     parts.day?.value    === "*",
  };

  return {
    ...pass(stats, meta),
    warnings,
  };
}

// ── Validate a single cron field ──────────────────────────────
function validateCronField(value, min, max, name) {
  const errors = [];

  if (value === "*" || value === "?") return errors;

  // Step values: */5, 1-5/2
  if (value.includes("/")) {
    const [range, step] = value.split("/");
    const stepNum = parseInt(step, 10);

    if (isNaN(stepNum) || stepNum < 1) {
      errors.push(makeError(
        `Invalid step value "${step}" in ${name} field.`
      ));
    }

    if (range !== "*") {
      const rangeErrors = validateCronRange(range, min, max, name);
      errors.push(...rangeErrors);
    }

    return errors;
  }

  // List: 1,2,3
  if (value.includes(",")) {
    value.split(",").forEach((v) => {
      const errors2 = validateCronField(v.trim(), min, max, name);
      errors.push(...errors2);
    });
    return errors;
  }

  // Range: 1-5
  if (value.includes("-")) {
    return validateCronRange(value, min, max, name);
  }

  // Single value
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    // Check for named values (JAN-DEC, SUN-SAT)
    const namedMonths  = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const namedWeekdays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

    if (
      name === "month"   && namedMonths.includes(value.toUpperCase())   ||
      name === "weekday" && namedWeekdays.includes(value.toUpperCase())
    ) {
      return errors; // valid named value
    }

    errors.push(makeError(
      `Invalid value "${value}" in ${name} field.`
    ));
  } else if (num < min || num > max) {
    errors.push(makeError(
      `Value ${num} in ${name} field is out of range (${min}-${max}).`
    ));
  }

  return errors;
}

// ── Validate a cron range ─────────────────────────────────────
function validateCronRange(range, min, max, name) {
  const errors = [];
  const [startStr, endStr] = range.split("-");
  const start = parseInt(startStr, 10);
  const end   = parseInt(endStr,   10);

  if (isNaN(start) || isNaN(end)) {
    errors.push(makeError(`Invalid range "${range}" in ${name} field.`));
    return errors;
  }

  if (start < min || start > max) {
    errors.push(makeError(
      `Range start ${start} in ${name} is out of range (${min}-${max}).`
    ));
  }

  if (end < min || end > max) {
    errors.push(makeError(
      `Range end ${end} in ${name} is out of range (${min}-${max}).`
    ));
  }

  if (start > end) {
    errors.push(makeError(
      `Invalid range: start (${start}) is greater than end (${end}) in ${name} field.`
    ));
  }

  return errors;
}

// ── Describe a cron expression in plain English ───────────────
function describeCron(parts, hasSeconds) {
  const { minute, hour, day, month, weekday } = parts;

  if (
    minute?.value  === "*" &&
    hour?.value    === "*" &&
    day?.value     === "*" &&
    month?.value   === "*" &&
    weekday?.value === "*"
  ) {
    return hasSeconds ? "Every second" : "Every minute";
  }

  const parts2 = [];

  if (minute?.value  !== "*") parts2.push(`at minute ${minute?.value}`);
  if (hour?.value    !== "*") parts2.push(`at ${hour?.value}:00`);
  if (day?.value     !== "*") parts2.push(`on day ${day?.value}`);
  if (month?.value   !== "*") {
    const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = parseInt(month.value);
    parts2.push(`in ${isNaN(m) ? month.value : (months[m] || month.value)}`);
  }
  if (weekday?.value !== "*") {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const d    = parseInt(weekday.value);
    parts2.push(`on ${isNaN(d) ? weekday.value : (days[d] || weekday.value)}`);
  }

  return parts2.length > 0
    ? `Runs ${parts2.join(", ")}`
    : "Every minute";
}

// ── Get next N cron run times (approximate) ───────────────────
function getNextCronRuns(expression, count = 3) {
  // Simple approximation — not a full cron parser
  // Returns ISO strings for the next N round minutes/hours
  const runs = [];
  const now  = new Date();

  for (let i = 1; i <= count; i++) {
    const next = new Date(now.getTime() + i * 60 * 1000);
    next.setSeconds(0, 0);
    runs.push(next.toISOString());
  }

  return runs;
}

// ============================================================
// PASSWORD STRENGTH VALIDATOR
// ============================================================

/**
 * Check password strength and requirements.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.minLength     - Default: 8
 * @param {boolean} options.requireUpper  - Default: true
 * @param {boolean} options.requireLower  - Default: true
 * @param {boolean} options.requireNumber - Default: true
 * @param {boolean} options.requireSymbol - Default: false
 *
 * @returns {{ valid, errors, warnings, stats, meta }}
 */
export function validatePassword(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (!raw) return fail([makeError("Password is empty.")]);

  const {
    minLength     = 8,
    requireUpper  = true,
    requireLower  = true,
    requireNumber = true,
    requireSymbol = false,
  } = options;

  const errors   = [];
  const warnings = [];

  // ── Requirements ─────────────────────────────────────────
  if (raw.length < minLength) {
    errors.push(makeError(
      `Password must be at least ${minLength} characters long.`
    ));
  }

  if (requireUpper && !/[A-Z]/.test(raw)) {
    errors.push(makeError("Password must contain at least one uppercase letter."));
  }

  if (requireLower && !/[a-z]/.test(raw)) {
    errors.push(makeError("Password must contain at least one lowercase letter."));
  }

  if (requireNumber && !/[0-9]/.test(raw)) {
    errors.push(makeError("Password must contain at least one number."));
  }

  if (requireSymbol && !/[^a-zA-Z0-9]/.test(raw)) {
    errors.push(makeError(
      "Password must contain at least one special character."
    ));
  }

  // ── Common passwords ──────────────────────────────────────
  const common = [
    "password","password123","123456","12345678","qwerty",
    "abc123","letmein","admin","welcome","monkey","dragon",
    "master","sunshine","princess","shadow","superman",
  ];

  if (common.includes(raw.toLowerCase())) {
    errors.push(makeError(
      "This is a commonly used password. Please choose something more unique."
    ));
  }

  // ── Entropy calculation ───────────────────────────────────
  const hasLower  = /[a-z]/.test(raw);
  const hasUpper  = /[A-Z]/.test(raw);
  const hasDigit  = /[0-9]/.test(raw);
  const hasSymbol = /[^a-zA-Z0-9]/.test(raw);

  let charsetSize = 0;
  if (hasLower)  charsetSize += 26;
  if (hasUpper)  charsetSize += 26;
  if (hasDigit)  charsetSize += 10;
  if (hasSymbol) charsetSize += 32;

  const entropy = charsetSize > 0
    ? Math.floor(raw.length * Math.log2(charsetSize))
    : 0;

  // ── Strength score ────────────────────────────────────────
  let score = 0;
  if (raw.length >= 8)  score++;
  if (raw.length >= 12) score++;
  if (raw.length >= 16) score++;
  if (hasUpper)  score++;
  if (hasLower)  score++;
  if (hasDigit)  score++;
  if (hasSymbol) score++;
  if (entropy > 50) score++;

  const strength =
    score <= 2 ? "very-weak"  :
    score <= 3 ? "weak"       :
    score <= 4 ? "fair"       :
    score <= 5 ? "strong"     :
                 "very-strong";

  // ── Suggestions ───────────────────────────────────────────
  if (raw.length < 12) {
    warnings.push(makeWarning(
      "Consider using at least 12 characters for better security."
    ));
  }

  if (!hasSymbol) {
    warnings.push(makeWarning(
      "Adding special characters (!@#$%) significantly increases password strength."
    ));
  }

  if (/(.)\1{2,}/.test(raw)) {
    warnings.push(makeWarning(
      "Avoid repeated characters (e.g. 'aaa')."
    ));
  }

  if (/^[a-zA-Z]+$/.test(raw)) {
    warnings.push(makeWarning(
      "Password uses only letters. Mix in numbers and symbols."
    ));
  }

  const stats = {
    inputLength:  raw.length,
    entropy,
    charsetSize,
    strength,
    score,
    hasLower,
    hasUpper,
    hasDigit,
    hasSymbol,
  };

  return fail(errors, warnings, stats, { strength, entropy, score });
}

// ============================================================
// EXPORTS SUMMARY
//
//   validateJson(input, options)     — JSON validator
//   validateYaml(input, options)     — YAML validator
//   validateXml(input)               — XML validator
//   validateHtml(input, options)     — HTML validator
//   validateUrl(input, options)      — URL validator
//   validateEmail(input, options)    — Email validator
//   validateRegex(pattern, str, options) — Regex validator
//   validateCron(input)              — Cron expression validator
//   validatePassword(input, options) — Password strength checker
// ============================================================