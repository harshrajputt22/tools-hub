// ============================================================
// ENCODERS UTILITY
// src/utils/encoders.js
//
// All encoding/decoding logic used by encoding tools.
// Every function follows the same contract as formatters.js:
//
//   Input:  (input: string, options?: object)
//   Output: { success: boolean, output: string,
//             error: string|null, stats: object }
//
// Encoding tools that are purely client-side use native
// Web APIs (btoa/atob, TextEncoder, URL, etc.) — zero
// external dependencies needed for most of these.
// ============================================================

// ============================================================
// SHARED HELPERS
// ============================================================

// ── Build a success result ────────────────────────────────────
function ok(output, stats = {}) {
  return {
    success: true,
    output,
    error:   null,
    stats: {
      inputLength:  stats.inputLength  ?? 0,
      outputLength: stats.outputLength ?? output.length,
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

// ── Safe trim ─────────────────────────────────────────────────
function safeTrim(str) {
  return typeof str === "string" ? str.trim() : "";
}

// ── Base stats ────────────────────────────────────────────────
function baseStats(input, output = "") {
  return {
    inputLength:  input.length,
    outputLength: output.length,
    inputBytes:   new TextEncoder().encode(input).length,
    outputBytes:  new TextEncoder().encode(output).length,
  };
}

// ============================================================
// BASE64 ENCODE / DECODE
// ============================================================

/**
 * Encode a string to Base64.
 * Handles Unicode correctly via TextEncoder.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.urlSafe  - Use URL-safe Base64 (default: false)
 *                                     Replaces + with - and / with _
 * @param {boolean} options.noPadding - Remove = padding (default: false)
 *
 * @returns {{ success, output, error, stats }}
 */
export function encodeBase64(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { urlSafe = false, noPadding = false } = options;

  try {
    // Use TextEncoder for proper Unicode support
    const bytes  = new TextEncoder().encode(raw);
    const binary = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("");

    let output = btoa(binary);

    if (urlSafe) {
      output = output.replace(/\+/g, "-").replace(/\//g, "_");
    }

    if (noPadding) {
      output = output.replace(/=/g, "");
    }

    const ratio = raw.length > 0
      ? ((output.length / raw.length) * 100).toFixed(1)
      : "0";

    return ok(output, {
      ...baseStats(raw, output),
      sizeRatio:    `${ratio}%`,
      paddingChars: (output.match(/=/g) || []).length,
      urlSafe,
    });
  } catch (e) {
    return err(`Base64 Encode Error: ${e.message}`);
  }
}

/**
 * Decode a Base64 string back to text.
 * Handles URL-safe Base64 automatically.
 *
 * @param {string} input  - Base64 encoded string
 * @param {object} options
 * @param {string} options.encoding - Output encoding: "utf8"|"latin1" (default: "utf8")
 *
 * @returns {{ success, output, error, stats }}
 */
export function decodeBase64(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { encoding = "utf8" } = options;

  try {
    // Normalize URL-safe Base64 → standard Base64
    let normalized = raw
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    // Add padding if needed
    const pad = normalized.length % 4;
    if (pad === 2) normalized += "==";
    if (pad === 3) normalized += "=";

    const binary = atob(normalized);

    let output;
    if (encoding === "latin1") {
      output = binary;
    } else {
      // UTF-8 decode
      const bytes = new Uint8Array(
        binary.split("").map((c) => c.charCodeAt(0))
      );
      output = new TextDecoder("utf-8").decode(bytes);
    }

    return ok(output, {
      ...baseStats(raw, output),
      wasUrlSafe: raw.includes("-") || raw.includes("_"),
    });
  } catch (e) {
    if (e.name === "InvalidCharacterError") {
      return err(
        "Invalid Base64 string. Make sure the input contains only valid Base64 characters."
      );
    }
    return err(`Base64 Decode Error: ${e.message}`);
  }
}

// ============================================================
// URL ENCODE / DECODE
// ============================================================

/**
 * URL-encode a string.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.mode - "component" | "full" | "form"
 *   component → encodeURIComponent (default) — encodes everything except A-Z a-z 0-9 - _ . ! ~ * ' ( )
 *   full      → encodeURI          — preserves : / ? # [ ] @ ! $ & ' ( ) * + , ; =
 *   form      → application/x-www-form-urlencoded (spaces become +)
 *
 * @returns {{ success, output, error, stats }}
 */
export function encodeUrl(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { mode = "component" } = options;

  try {
    let output;

    switch (mode) {
      case "full":
        output = encodeURI(raw);
        break;
      case "form":
        output = encodeURIComponent(raw).replace(/%20/g, "+");
        break;
      default: // component
        output = encodeURIComponent(raw);
        break;
    }

    const encodedChars = (output.match(/%[0-9A-F]{2}/gi) || []).length;

    return ok(output, {
      ...baseStats(raw, output),
      mode,
      encodedChars,
    });
  } catch (e) {
    return err(`URL Encode Error: ${e.message}`);
  }
}

/**
 * URL-decode a string.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.mode - "component" | "full" | "form"
 *
 * @returns {{ success, output, error, stats }}
 */
export function decodeUrl(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { mode = "component" } = options;

  try {
    let output;

    switch (mode) {
      case "full":
        output = decodeURI(raw);
        break;
      case "form":
        output = decodeURIComponent(raw.replace(/\+/g, "%20"));
        break;
      default: // component
        output = decodeURIComponent(raw);
        break;
    }

    return ok(output, {
      ...baseStats(raw, output),
      mode,
    });
  } catch (e) {
    if (e instanceof URIError) {
      return err(
        "Invalid URL-encoded string. Check for malformed % sequences."
      );
    }
    return err(`URL Decode Error: ${e.message}`);
  }
}

// ============================================================
// URL PARSER
// ============================================================

/**
 * Parse a URL into its components.
 *
 * @param {string} input - Full URL string
 * @returns {{ success, output, error, stats, parsed }}
 */
export function parseUrl(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  // Add protocol if missing so URL() can parse it
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(normalized);

    // Parse query params into key-value pairs
    const params = {};
    url.searchParams.forEach((value, key) => {
      if (params[key] !== undefined) {
        // Handle duplicate keys as arrays
        params[key] = Array.isArray(params[key])
          ? [...params[key], value]
          : [params[key], value];
      } else {
        params[key] = value;
      }
    });

    const parsed = {
      href:     url.href,
      protocol: url.protocol,
      host:     url.host,
      hostname: url.hostname,
      port:     url.port || "(default)",
      pathname: url.pathname,
      search:   url.search,
      hash:     url.hash,
      origin:   url.origin,
      username: url.username || null,
      password: url.password || null,
      params,
    };

    const output = JSON.stringify(parsed, null, 2);

    return {
      ...ok(output, {
        inputLength:  raw.length,
        outputLength: output.length,
        paramCount:   Object.keys(params).length,
      }),
      parsed,
    };
  } catch (e) {
    return err(`Invalid URL: ${e.message}`);
  }
}

// ============================================================
// HTML ENTITY ENCODE / DECODE
// ============================================================

// Named HTML entities map
const HTML_ENTITIES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#47;",
  "`": "&#96;",
  "=": "&#61;",
};

const HTML_ENTITIES_REVERSE = Object.fromEntries(
  Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k])
);

/**
 * Encode HTML special characters to entities.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.encodeAll  - Encode all non-ASCII chars (default: false)
 * @param {boolean} options.namedOnly  - Only encode named entities (default: false)
 *
 * @returns {{ success, output, error, stats }}
 */
export function encodeHtml(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { encodeAll = false, namedOnly = false } = options;

  try {
    let output = raw;
    let encodedCount = 0;

    if (encodeAll) {
      // Encode every character as numeric entity
      output = Array.from(raw)
        .map((char) => {
          const code = char.codePointAt(0);
          if (code > 127 || HTML_ENTITIES[char]) {
            encodedCount++;
            return `&#${code};`;
          }
          return char;
        })
        .join("");
    } else if (namedOnly) {
      // Only encode the 5 standard HTML entities
      output = raw.replace(/[&<>"']/g, (char) => {
        encodedCount++;
        return HTML_ENTITIES[char] || char;
      });
    } else {
      // Encode all special characters including / ` =
      output = raw.replace(/[&<>"'`=/]/g, (char) => {
        encodedCount++;
        return HTML_ENTITIES[char] || char;
      });
    }

    return ok(output, {
      ...baseStats(raw, output),
      encodedCount,
    });
  } catch (e) {
    return err(`HTML Encode Error: ${e.message}`);
  }
}

/**
 * Decode HTML entities back to characters.
 * Uses the `he` library for comprehensive entity support.
 *
 * @param {string} input
 * @returns {{ success, output, error, stats }}
 */
export function decodeHtml(input) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  try {
    // Use `he` library if available, fallback to manual decode
    let output;

    try {
      const he = require("he");
      output = he.decode(raw);
    } catch {
      // Manual fallback — handles numeric and named entities
      output = raw
        // Named entities
        .replace(/&amp;/g,  "&")
        .replace(/&lt;/g,   "<")
        .replace(/&gt;/g,   ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g,  "'")
        .replace(/&#47;/g,  "/")
        .replace(/&#96;/g,  "`")
        .replace(/&#61;/g,  "=")
        .replace(/&nbsp;/g, " ")
        .replace(/&copy;/g, "©")
        .replace(/&reg;/g,  "®")
        .replace(/&trade;/g,"™")
        .replace(/&mdash;/g,"—")
        .replace(/&ndash;/g,"–")
        .replace(/&laquo;/g,"«")
        .replace(/&raquo;/g,"»")
        // Decimal numeric entities &#NNN;
        .replace(/&#(\d+);/g, (_, num) =>
          String.fromCodePoint(parseInt(num, 10))
        )
        // Hex numeric entities &#xHHH;
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
          String.fromCodePoint(parseInt(hex, 16))
        );
    }

    const decodedCount = (raw.match(/&[#\w]+;/g) || []).length;

    return ok(output, {
      ...baseStats(raw, output),
      decodedCount,
    });
  } catch (e) {
    return err(`HTML Decode Error: ${e.message}`);
  }
}

// ============================================================
// UNICODE ENCODER / DECODER
// ============================================================

/**
 * Encode text to Unicode escape sequences.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.format  - "js" | "css" | "html" | "python" | "codepoints"
 *   js          → \uXXXX or \u{XXXXX}  (default)
 *   css         → \XXXXXX
 *   html        → &#xXXXX;
 *   python      → \uXXXX or \UXXXXXXXX
 *   codepoints  → U+XXXX (display only)
 * @param {boolean} options.nonAsciiOnly - Only encode chars above U+007F (default: true)
 *
 * @returns {{ success, output, error, stats }}
 */
export function encodeUnicode(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { format = "js", nonAsciiOnly = true } = options;

  try {
    let encodedCount = 0;

    const output = Array.from(raw)
      .map((char) => {
        const cp = char.codePointAt(0);

        // Skip ASCII if nonAsciiOnly
        if (nonAsciiOnly && cp !== undefined && cp <= 0x7f) {
          return char;
        }

        encodedCount++;

        if (cp === undefined) return char;

        switch (format) {
          case "js":
            return cp > 0xffff
              ? `\\u{${cp.toString(16).toUpperCase()}}`
              : `\\u${cp.toString(16).padStart(4, "0").toUpperCase()}`;

          case "css":
            return `\\${cp.toString(16).toUpperCase().padStart(6, "0")} `;

          case "html":
            return `&#x${cp.toString(16).toUpperCase()};`;

          case "python":
            return cp > 0xffff
              ? `\\U${cp.toString(16).padStart(8, "0").toUpperCase()}`
              : `\\u${cp.toString(16).padStart(4, "0").toUpperCase()}`;

          case "codepoints":
            return `U+${cp.toString(16).padStart(4, "0").toUpperCase()}`;

          default:
            return char;
        }
      })
      .join("");

    return ok(output, {
      ...baseStats(raw, output),
      format,
      encodedCount,
      totalChars: Array.from(raw).length,
    });
  } catch (e) {
    return err(`Unicode Encode Error: ${e.message}`);
  }
}

/**
 * Decode Unicode escape sequences back to text.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.format - "js" | "html" | "codepoints"
 *
 * @returns {{ success, output, error, stats }}
 */
export function decodeUnicode(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { format = "js" } = options;

  try {
    let output = raw;

    switch (format) {
      case "js":
        // \u{XXXXX} — ES6 extended
        output = output.replace(
          /\\u\{([0-9a-fA-F]+)\}/g,
          (_, hex) => String.fromCodePoint(parseInt(hex, 16))
        );
        // \uXXXX — standard
        output = output.replace(
          /\\u([0-9a-fA-F]{4})/g,
          (_, hex) => String.fromCodePoint(parseInt(hex, 16))
        );
        break;

      case "html":
        // &#xXXXX;
        output = output.replace(
          /&#x([0-9a-fA-F]+);/gi,
          (_, hex) => String.fromCodePoint(parseInt(hex, 16))
        );
        // &#NNNN;
        output = output.replace(
          /&#(\d+);/g,
          (_, dec) => String.fromCodePoint(parseInt(dec, 10))
        );
        break;

      case "codepoints":
        // U+XXXX
        output = output.replace(
          /U\+([0-9a-fA-F]{4,6})/gi,
          (_, hex) => String.fromCodePoint(parseInt(hex, 16))
        );
        break;

      default:
        // Try all formats
        output = output
          .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) =>
            String.fromCodePoint(parseInt(hex, 16))
          )
          .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
            String.fromCodePoint(parseInt(hex, 16))
          )
          .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) =>
            String.fromCodePoint(parseInt(hex, 16))
          )
          .replace(/U\+([0-9a-fA-F]{4,6})/gi, (_, hex) =>
            String.fromCodePoint(parseInt(hex, 16))
          );
    }

    return ok(output, {
      ...baseStats(raw, output),
      format,
    });
  } catch (e) {
    return err(`Unicode Decode Error: ${e.message}`);
  }
}

// ============================================================
// ASCII CONVERTER
// ============================================================

/**
 * Convert text to ASCII codes.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.format    - "decimal" | "hex" | "octal" | "binary"
 * @param {string}  options.separator - Character between values (default: " ")
 *
 * @returns {{ success, output, error, stats }}
 */
export function textToAscii(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { format = "decimal", separator = " " } = options;

  try {
    const values = Array.from(raw).map((char) => {
      const code = char.charCodeAt(0);
      switch (format) {
        case "hex":     return "0x" + code.toString(16).padStart(2, "0").toUpperCase();
        case "octal":   return "0o" + code.toString(8);
        case "binary":  return code.toString(2).padStart(8, "0");
        default:        return code.toString(10);
      }
    });

    const output = values.join(separator);

    return ok(output, {
      ...baseStats(raw, output),
      format,
      charCount: Array.from(raw).length,
    });
  } catch (e) {
    return err(`ASCII Convert Error: ${e.message}`);
  }
}

/**
 * Convert ASCII codes back to text.
 *
 * @param {string} input    - Space/comma-separated ASCII codes
 * @param {object} options
 * @param {string}  options.format - "decimal" | "hex" | "octal" | "binary" | "auto"
 *
 * @returns {{ success, output, error, stats }}
 */
export function asciiToText(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { format = "auto" } = options;

  try {
    // Split by comma, space, or newline
    const tokens = raw
      .split(/[\s,]+/)
      .filter((t) => t.length > 0);

    const chars = tokens.map((token) => {
      let code;

      if (format === "auto") {
        if (token.startsWith("0x") || token.startsWith("0X")) {
          code = parseInt(token, 16);
        } else if (token.startsWith("0o") || token.startsWith("0O")) {
          code = parseInt(token, 8);
        } else if (/^[01]{8}$/.test(token)) {
          code = parseInt(token, 2);
        } else {
          code = parseInt(token, 10);
        }
      } else {
        const bases = { decimal: 10, hex: 16, octal: 8, binary: 2 };
        const cleanToken = token.replace(/^0[xXoO]/, "");
        code = parseInt(cleanToken, bases[format] || 10);
      }

      if (isNaN(code) || code < 0 || code > 0x10ffff) {
        throw new Error(`Invalid code point: ${token}`);
      }

      return String.fromCodePoint(code);
    });

    const output = chars.join("");

    return ok(output, {
      ...baseStats(raw, output),
      format,
      charCount: chars.length,
    });
  } catch (e) {
    return err(`ASCII Convert Error: ${e.message}`);
  }
}

// ============================================================
// BINARY CONVERTER
// ============================================================

/**
 * Convert text to binary representation.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.separator - Between bytes (default: " ")
 * @param {boolean} options.groupBy8  - Add extra space every 8 bits (default: true)
 *
 * @returns {{ success, output, error, stats }}
 */
export function textToBinary(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const { separator = " ", groupBy8 = true } = options;

  try {
    const bytes = new TextEncoder().encode(raw);
    const binaryGroups = Array.from(bytes).map(
      (byte) => byte.toString(2).padStart(8, "0")
    );

    const output = binaryGroups.join(separator);

    return ok(output, {
      ...baseStats(raw, output),
      byteCount:   bytes.length,
      charCount:   Array.from(raw).length,
      bitCount:    bytes.length * 8,
    });
  } catch (e) {
    return err(`Binary Convert Error: ${e.message}`);
  }
}

/**
 * Convert binary representation back to text.
 *
 * @param {string} input  - Space-separated 8-bit binary groups
 * @returns {{ success, output, error, stats }}
 */
export function binaryToText(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    // Split by spaces, commas, or newlines
    const tokens = raw
      .replace(/[,\n]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0);

    // Validate all tokens are binary
    const invalid = tokens.find((t) => !/^[01]+$/.test(t));
    if (invalid) {
      return err(
        `Invalid binary value: "${invalid}". Only 0s and 1s are allowed.`
      );
    }

    // Group into 8-bit chunks if needed
    const bytes = tokens.flatMap((token) => {
      // Already 8 bits
      if (token.length === 8) return [parseInt(token, 2)];

      // Longer token — split into 8-bit groups
      if (token.length % 8 === 0) {
        return token
          .match(/.{8}/g)
          ?.map((b) => parseInt(b, 2)) ?? [];
      }

      // Pad to 8 bits
      return [parseInt(token.padStart(8, "0"), 2)];
    });

    const uint8 = new Uint8Array(bytes);
    const output = new TextDecoder("utf-8").decode(uint8);

    return ok(output, {
      ...baseStats(raw, output),
      byteCount: bytes.length,
      bitCount:  bytes.length * 8,
    });
  } catch (e) {
    return err(`Binary Convert Error: ${e.message}`);
  }
}

// ============================================================
// HEX ENCODER / DECODER
// ============================================================

/**
 * Encode text to hexadecimal.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.separator   - Between hex pairs (default: " ")
 *                                        "" for no separator
 * @param {boolean} options.uppercase   - Uppercase hex (default: true)
 * @param {string}  options.prefix      - Prefix each byte: "0x" | "" (default: "")
 *
 * @returns {{ success, output, error, stats }}
 */
export function encodeHex(input, options = {}) {
  const raw = typeof input === "string" ? input : "";
  if (raw === "") return err("Input is empty.");

  const {
    separator  = " ",
    uppercase  = true,
    prefix     = "",
  } = options;

  try {
    const bytes = new TextEncoder().encode(raw);

    const hexPairs = Array.from(bytes).map((byte) => {
      const hex = byte.toString(16).padStart(2, "0");
      return prefix + (uppercase ? hex.toUpperCase() : hex);
    });

    const output = hexPairs.join(separator);

    return ok(output, {
      ...baseStats(raw, output),
      byteCount: bytes.length,
      uppercase,
    });
  } catch (e) {
    return err(`Hex Encode Error: ${e.message}`);
  }
}

/**
 * Decode hexadecimal back to text.
 *
 * @param {string} input  - Hex string (with or without separators/prefixes)
 * @returns {{ success, output, error, stats }}
 */
export function decodeHex(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    // Strip 0x prefixes, spaces, commas, colons
    const cleaned = raw
      .replace(/0x/gi, "")
      .replace(/[\s,:\-]/g, "")
      .trim();

    if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
      return err(
        "Invalid hex string. Only hex characters (0-9, A-F) are allowed."
      );
    }

    if (cleaned.length % 2 !== 0) {
      return err(
        "Hex string must have an even number of characters (each byte = 2 hex chars)."
      );
    }

    // Parse hex pairs into bytes
    const bytes = new Uint8Array(
      cleaned.match(/.{2}/g)?.map((hex) => parseInt(hex, 16)) ?? []
    );

    const output = new TextDecoder("utf-8").decode(bytes);

    return ok(output, {
      ...baseStats(raw, output),
      byteCount: bytes.length,
    });
  } catch (e) {
    return err(`Hex Decode Error: ${e.message}`);
  }
}

// ============================================================
// JWT DECODER
// ============================================================

/**
 * Decode a JWT token — header, payload, signature.
 * Does NOT verify signature — for inspection only.
 *
 * @param {string} input  - JWT string (xxx.yyy.zzz)
 * @returns {{ success, output, error, stats, decoded }}
 */
export function decodeJwt(input) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  try {
    const parts = raw.split(".");

    if (parts.length !== 3) {
      return err(
        `Invalid JWT: expected 3 parts separated by dots, got ${parts.length}.`
      );
    }

    const [rawHeader, rawPayload, rawSignature] = parts;

    // Decode header
    let header;
    try {
      const headerJson = atob(
        rawHeader.replace(/-/g, "+").replace(/_/g, "/") +
        "==".slice(0, (4 - (rawHeader.length % 4)) % 4)
      );
      header = JSON.parse(headerJson);
    } catch {
      return err("Could not decode JWT header. It may be malformed.");
    }

    // Decode payload
    let payload;
    try {
      const payloadJson = atob(
        rawPayload.replace(/-/g, "+").replace(/_/g, "/") +
        "==".slice(0, (4 - (rawPayload.length % 4)) % 4)
      );
      payload = JSON.parse(payloadJson);
    } catch {
      return err("Could not decode JWT payload. It may be malformed.");
    }

    // Format timestamps in payload
    const payloadWithDates = { ...payload };
    const timeFields = ["iat", "exp", "nbf", "auth_time", "updated_at"];
    timeFields.forEach((field) => {
      if (payloadWithDates[field]) {
        payloadWithDates[`${field}_human`] = new Date(
          payloadWithDates[field] * 1000
        ).toISOString();
      }
    });

    // Check expiry
    const now       = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : null;
    const expiresIn = payload.exp
      ? payload.exp - now
      : null;

    const decoded = {
      header,
      payload: payloadWithDates,
      signature: rawSignature,
      raw: {
        header:    rawHeader,
        payload:   rawPayload,
        signature: rawSignature,
      },
      meta: {
        algorithm:  header.alg || "unknown",
        type:       header.typ || "JWT",
        isExpired,
        expiresIn,
        expiresInHuman: expiresIn !== null
          ? formatSeconds(Math.abs(expiresIn))
          : null,
        issuer:    payload.iss || null,
        subject:   payload.sub || null,
        audience:  payload.aud || null,
      },
    };

    const output = JSON.stringify(
      { header, payload: payloadWithDates },
      null,
      2
    );

    return {
      ...ok(output, {
        inputLength:  raw.length,
        outputLength: output.length,
        algorithm:    header.alg,
        isExpired,
      }),
      decoded,
    };
  } catch (e) {
    return err(`JWT Decode Error: ${e.message}`);
  }
}

// ── Format seconds into human-readable duration ───────────────
function formatSeconds(seconds) {
  if (seconds < 60)    return `${seconds}s`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

// ============================================================
// HMAC GENERATOR
// ============================================================

/**
 * Generate HMAC signature using Web Crypto API.
 *
 * @param {string} message  - Message to sign
 * @param {string} secret   - Secret key
 * @param {object} options
 * @param {string}  options.algorithm - "SHA-256" | "SHA-384" | "SHA-512" (default: "SHA-256")
 * @param {string}  options.outputFormat - "hex" | "base64" (default: "hex")
 *
 * @returns {Promise<{ success, output, error, stats }>}
 */
export async function generateHmac(message, secret, options = {}) {
  if (!message) return err("Message is empty.");
  if (!secret)  return err("Secret key is empty.");

  const {
    algorithm    = "SHA-256",
    outputFormat = "hex",
  } = options;

  const validAlgos = ["SHA-256", "SHA-384", "SHA-512"];
  if (!validAlgos.includes(algorithm)) {
    return err(`Invalid algorithm. Use: ${validAlgos.join(", ")}`);
  }

  try {
    const enc    = new TextEncoder();
    const keyData = enc.encode(secret);
    const msgData = enc.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const bytes = new Uint8Array(signature);

    let output;
    if (outputFormat === "base64") {
      output = btoa(String.fromCharCode(...bytes));
    } else {
      output = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    return ok(output, {
      inputLength:  message.length,
      outputLength: output.length,
      algorithm,
      outputFormat,
      bits: bytes.length * 8,
    });
  } catch (e) {
    return err(`HMAC Error: ${e.message}`);
  }
}

// ============================================================
// EXPORTS SUMMARY
//
//  Base64:
//    encodeBase64(input, options)
//    decodeBase64(input, options)
//
//  URL:
//    encodeUrl(input, options)
//    decodeUrl(input, options)
//    parseUrl(input)
//
//  HTML Entities:
//    encodeHtml(input, options)
//    decodeHtml(input)
//
//  Unicode:
//    encodeUnicode(input, options)
//    decodeUnicode(input, options)
//
//  ASCII:
//    textToAscii(input, options)
//    asciiToText(input, options)
//
//  Binary:
//    textToBinary(input, options)
//    binaryToText(input)
//
//  Hex:
//    encodeHex(input, options)
//    decodeHex(input)
//
//  JWT:
//    decodeJwt(input)
//
//  HMAC:
//    generateHmac(message, secret, options)  ← async
// ============================================================
