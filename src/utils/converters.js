// ============================================================
// CONVERTERS UTILITY
// src/utils/converters.js
//
// All data conversion logic used by converter tool components.
// Every function follows the same contract as other utils:
//
//   Input:  (input: string | File | object, options?: object)
//   Output: {
//     success:  boolean,
//     output:   string | Blob | ArrayBuffer,
//     error:    string | null,
//     stats:    object,
//     meta:     object
//   }
//
// File-producing converters (Excel, PDF) return a Blob in
// the output field so the tool UI can trigger a download.
//
// Text-producing converters return a string in output
// so the tool UI can display it in ToolOutput.
// ============================================================

import yaml from "js-yaml";

// ============================================================
// SHARED HELPERS
// ============================================================

// ── Build a success result ────────────────────────────────────
function ok(output, stats = {}, meta = {}) {
  return {
    success: true,
    output,
    error:   null,
    stats: {
      inputLength:  stats.inputLength  ?? 0,
      outputLength: stats.outputLength ?? (
        typeof output === "string" ? output.length : 0
      ),
      ...stats,
    },
    meta,
  };
}

// ── Build an error result ─────────────────────────────────────
function err(message, stats = {}) {
  return {
    success: false,
    output:  "",
    error:   message,
    stats,
    meta:    {},
  };
}

// ── Safe trim ─────────────────────────────────────────────────
function safeTrim(str) {
  return typeof str === "string" ? str.trim() : "";
}

// ── Detect delimiter from CSV sample ─────────────────────────
function detectDelimiter(sample) {
  const candidates = [",", ";", "\t", "|"];
  let   best       = ",";
  let   bestCount  = 0;

  candidates.forEach((d) => {
    const count = (sample.match(new RegExp(`\\${d}`, "g")) || []).length;
    if (count > bestCount) {
      bestCount = count;
      best      = d;
    }
  });

  return best;
}

// ── Parse a CSV string into rows ──────────────────────────────
function parseCsv(input, delimiter = ",") {
  const rows   = [];
  const lines  = input.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const row    = [];
    let   field  = "";
    let   inQuote = false;
    let   i      = 0;

    while (i < line.length) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          // Escaped quote inside quoted field
          field += '"';
          i += 2;
          continue;
        }
        inQuote = !inQuote;
        i++;
        continue;
      }

      if (ch === delimiter && !inQuote) {
        row.push(field.trim());
        field = "";
        i++;
        continue;
      }

      field += ch;
      i++;
    }

    row.push(field.trim());
    rows.push(row);
  }

  return rows;
}

// ── Stringify a value for CSV output ─────────────────────────
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);

  // Wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// ── Flatten a nested object into dot-notation keys ────────────
function flattenObject(obj, prefix = "", result = {}) {
  if (obj === null || typeof obj !== "object") {
    result[prefix] = obj;
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      flattenObject(item, prefix ? `${prefix}[${i}]` : `[${i}]`, result);
    });
    return result;
  }

  Object.entries(obj).forEach(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    flattenObject(value, newKey, result);
  });

  return result;
}

// ── Get all unique keys from an array of objects ──────────────
function getAllKeys(objects) {
  const keys = new Set();
  objects.forEach((obj) => {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      Object.keys(obj).forEach((k) => keys.add(k));
    }
  });
  return [...keys];
}

// ============================================================
// JSON ↔ CSV
// ============================================================

/**
 * Convert JSON to CSV.
 *
 * @param {string} input     - JSON string (array of objects)
 * @param {object} options
 * @param {string}  options.delimiter   - Default: ","
 * @param {boolean} options.headers     - Include header row (default: true)
 * @param {boolean} options.flatten     - Flatten nested objects (default: true)
 * @param {string}  options.nullValue   - Value for null fields (default: "")
 * @param {boolean} options.bom         - Add BOM for Excel UTF-8 (default: false)
 *
 * @returns {{ success, output, error, stats }}
 */
export function jsonToCsv(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    delimiter = ",",
    headers   = true,
    flatten   = true,
    nullValue = "",
    bom       = false,
  } = options;

  // ── Parse JSON ────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err(`Invalid JSON: ${e.message}`);
  }

  // ── Normalize to array ────────────────────────────────────
  if (!Array.isArray(parsed)) {
    if (typeof parsed === "object" && parsed !== null) {
      parsed = [parsed];
    } else {
      return err(
        "JSON must be an array of objects or a single object to convert to CSV."
      );
    }
  }

  if (parsed.length === 0) {
    return err("JSON array is empty — nothing to convert.");
  }

  // ── Flatten if needed ─────────────────────────────────────
  const rows = flatten
    ? parsed.map((obj) => flattenObject(obj))
    : parsed;

  // ── Get all column keys ───────────────────────────────────
  const keys = getAllKeys(rows);
  if (keys.length === 0) {
    return err("Objects have no keys to export.");
  }

  // ── Build CSV lines ───────────────────────────────────────
  const lines = [];

  if (headers) {
    lines.push(keys.map((k) => csvEscape(k)).join(delimiter));
  }

  rows.forEach((row) => {
    const values = keys.map((key) => {
      const val = row?.[key];
      if (val === null || val === undefined) return csvEscape(nullValue);
      if (typeof val === "object") return csvEscape(JSON.stringify(val));
      return csvEscape(val);
    });
    lines.push(values.join(delimiter));
  });

  let output = lines.join("\n");

  // Add BOM for Excel
  if (bom) output = "\uFEFF" + output;

  return ok(output, {
    inputLength:  raw.length,
    outputLength: output.length,
    rowCount:     parsed.length,
    columnCount:  keys.length,
    columns:      keys,
  });
}

/**
 * Convert CSV to JSON.
 *
 * @param {string} input     - CSV string
 * @param {object} options
 * @param {string}  options.delimiter   - Auto-detected if not set
 * @param {boolean} options.hasHeaders  - First row is headers (default: true)
 * @param {boolean} options.parseNumbers - Convert numeric strings (default: true)
 * @param {boolean} options.parseBooleans - Convert true/false strings (default: true)
 * @param {string}  options.nullValues  - Comma-separated null-like values (default: "")
 * @param {number}  options.indent      - JSON indentation (default: 2)
 *
 * @returns {{ success, output, error, stats }}
 */
export function csvToJson(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    delimiter     = null,
    hasHeaders    = true,
    parseNumbers  = true,
    parseBooleans = true,
    nullValues    = "",
    indent        = 2,
  } = options;

  // ── Detect delimiter ──────────────────────────────────────
  const delim = delimiter || detectDelimiter(raw.slice(0, 500));

  // ── Parse CSV into rows ───────────────────────────────────
  const rows = parseCsv(raw, delim);
  if (rows.length === 0) return err("No data found in CSV.");

  // ── Extract headers ───────────────────────────────────────
  let headers;
  let dataRows;

  if (hasHeaders) {
    headers  = rows[0];
    dataRows = rows.slice(1);
  } else {
    headers  = rows[0].map((_, i) => `column_${i + 1}`);
    dataRows = rows;
  }

  if (dataRows.length === 0) {
    return err("CSV has headers but no data rows.");
  }

  // ── Null value set ────────────────────────────────────────
  const nullSet = new Set(
    nullValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .concat([""])
  );

  // ── Type coercion helper ──────────────────────────────────
  function coerce(value) {
    if (nullSet.has(value)) return null;

    if (parseBooleans) {
      if (value.toLowerCase() === "true")  return true;
      if (value.toLowerCase() === "false") return false;
    }

    if (parseNumbers && value !== "") {
      const num = Number(value);
      if (!isNaN(num) && value.trim() !== "") return num;
    }

    return value;
  }

  // ── Build objects ─────────────────────────────────────────
  const objects = dataRows.map((row, rowIdx) => {
    const obj = {};
    headers.forEach((header, colIdx) => {
      const key   = header || `column_${colIdx + 1}`;
      const value = row[colIdx] ?? "";
      obj[key]    = coerce(value);
    });
    return obj;
  });

  const output = JSON.stringify(objects, null, indent);

  return ok(output, {
    inputLength:  raw.length,
    outputLength: output.length,
    rowCount:     objects.length,
    columnCount:  headers.length,
    delimiter:    delim === "\t" ? "tab" : delim,
    columns:      headers,
  });
}

// ============================================================
// JSON ↔ XML
// ============================================================

/**
 * Convert JSON to XML.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.rootElement  - Root element name (default: "root")
 * @param {string}  options.itemElement  - Array item element name (default: "item")
 * @param {number}  options.indent       - Spaces per level (default: 2)
 * @param {boolean} options.declaration  - Include XML declaration (default: true)
 * @param {string}  options.encoding     - Encoding in declaration (default: "UTF-8")
 *
 * @returns {{ success, output, error, stats }}
 */
export function jsonToXml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    rootElement = "root",
    itemElement = "item",
    indent      = 2,
    declaration = true,
    encoding    = "UTF-8",
  } = options;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err(`Invalid JSON: ${e.message}`);
  }

  const indentStr = " ".repeat(indent);

  // ── Recursive builder ─────────────────────────────────────
  function buildXml(obj, tagName, depth = 0) {
    const pad = indentStr.repeat(depth);

    // Null
    if (obj === null) {
      return `${pad}<${tagName} xsi:nil="true"/>`;
    }

    // Primitive
    if (typeof obj !== "object") {
      const escaped = String(obj)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
      return `${pad}<${tagName}>${escaped}</${tagName}>`;
    }

    // Array
    if (Array.isArray(obj)) {
      const items = obj
        .map((item) => buildXml(item, itemElement, depth + 1))
        .join("\n");
      return `${pad}<${tagName}>\n${items}\n${pad}</${tagName}>`;
    }

    // Object
    const children = Object.entries(obj)
      .map(([key, value]) => {
        // Sanitize key — XML element names can't start with numbers or contain spaces
        const safeKey = key
          .replace(/[^a-zA-Z0-9_.-]/g, "_")
          .replace(/^([^a-zA-Z_])/, "_$1");
        return buildXml(value, safeKey, depth + 1);
      })
      .join("\n");

    return `${pad}<${tagName}>\n${children}\n${pad}</${tagName}>`;
  }

  try {
    const body = buildXml(parsed, rootElement, 0);
    const decl = declaration
      ? `<?xml version="1.0" encoding="${encoding}"?>\n`
      : "";
    const output = decl + body;

    return ok(output, {
      inputLength:  raw.length,
      outputLength: output.length,
      inputLines:   raw.split("\n").length,
      outputLines:  output.split("\n").length,
    });
  } catch (e) {
    return err(`JSON to XML Error: ${e.message}`);
  }
}

/**
 * Convert XML to JSON.
 *
 * @param {string} input
 * @param {object} options
 * @param {boolean} options.explicitArray - Always use arrays (default: false)
 * @param {boolean} options.ignoreAttrs   - Ignore XML attributes (default: false)
 * @param {boolean} options.mergeAttrs    - Merge attributes into parent (default: true)
 * @param {number}  options.indent        - JSON indentation (default: 2)
 *
 * @returns {Promise<{ success, output, error, stats }>}
 */
export async function xmlToJson(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    explicitArray = false,
    ignoreAttrs   = false,
    mergeAttrs    = true,
    indent        = 2,
  } = options;

  try {
    const { parseString } = await import("xml2js");

    return new Promise((resolve) => {
      parseString(
        raw,
        {
          explicitArray,
          ignoreAttrs,
          mergeAttrs,
          explicitRoot: false,
          trim:         true,
        },
        (error, result) => {
          if (error) {
            resolve(err(`XML Parse Error: ${error.message}`));
            return;
          }

          const output = JSON.stringify(result, null, indent);
          resolve(ok(output, {
            inputLength:  raw.length,
            outputLength: output.length,
            inputLines:   raw.split("\n").length,
            outputLines:  output.split("\n").length,
          }));
        }
      );
    });
  } catch (e) {
    return err(`XML to JSON Error: ${e.message}`);
  }
}

// ============================================================
// JSON ↔ YAML
// ============================================================

/**
 * Convert JSON to YAML.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.indent    - Default: 2
 * @param {number}  options.lineWidth - Default: 80
 * @param {boolean} options.noRefs   - Disable aliases (default: true)
 *
 * @returns {{ success, output, error, stats }}
 */
export function jsonToYaml(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    indent    = 2,
    lineWidth = 80,
    noRefs    = true,
  } = options;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err(`Invalid JSON: ${e.message}`);
  }

  try {
    const output = yaml.dump(parsed, {
      indent,
      lineWidth,
      noRefs,
      sortKeys: false,
    });

    return ok(output, {
      inputLength:  raw.length,
      outputLength: output.length,
      inputLines:   raw.split("\n").length,
      outputLines:  output.split("\n").length,
    });
  } catch (e) {
    return err(`JSON to YAML Error: ${e.message}`);
  }
}

/**
 * Convert YAML to JSON.
 *
 * @param {string} input
 * @param {object} options
 * @param {number}  options.indent  - JSON indentation (default: 2)
 * @param {boolean} options.sortKeys - Sort keys (default: false)
 *
 * @returns {{ success, output, error, stats }}
 */
export function yamlToJson(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    indent   = 2,
    sortKeys = false,
  } = options;

  try {
    const parsed = yaml.load(raw, { json: true });

    if (parsed === undefined) {
      return err("YAML parsed to undefined. Check your input.");
    }

    const output = JSON.stringify(
      parsed,
      sortKeys
        ? (key, value) =>
            value && typeof value === "object" && !Array.isArray(value)
              ? Object.keys(value)
                  .sort()
                  .reduce((acc, k) => { acc[k] = value[k]; return acc; }, {})
              : value
        : null,
      indent
    );

    return ok(output, {
      inputLength:  raw.length,
      outputLength: output.length,
      inputLines:   raw.split("\n").length,
      outputLines:  output.split("\n").length,
    });
  } catch (e) {
    if (e.mark) {
      return err(
        `YAML Error at line ${e.mark.line + 1}, col ${e.mark.column + 1}: ${e.reason}`
      );
    }
    return err(`YAML to JSON Error: ${e.message}`);
  }
}

// ============================================================
// JSON ↔ EXCEL
// ============================================================

/**
 * Convert JSON to Excel (.xlsx) file.
 * Returns a Blob that can be downloaded.
 *
 * @param {string} input    - JSON string (array of objects)
 * @param {object} options
 * @param {string}  options.sheetName   - Default: "Sheet1"
 * @param {boolean} options.headers     - Include headers (default: true)
 * @param {boolean} options.autoWidth   - Auto-size columns (default: true)
 * @param {boolean} options.flatten     - Flatten nested objects (default: true)
 *
 * @returns {Promise<{ success, output: Blob, error, stats }>}
 */
export async function jsonToExcel(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    sheetName = "Sheet1",
    headers   = true,
    autoWidth = true,
    flatten   = true,
  } = options;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return err(`Invalid JSON: ${e.message}`);
  }

  if (!Array.isArray(parsed)) {
    parsed = typeof parsed === "object" && parsed !== null ? [parsed] : null;
  }

  if (!parsed || parsed.length === 0) {
    return err("JSON must be a non-empty array of objects.");
  }

  try {
    const XLSX = await import("xlsx");

    // Flatten objects if needed
    const rows = flatten
      ? parsed.map((obj) => flattenObject(obj))
      : parsed;

    const keys = getAllKeys(rows);

    // Build worksheet data
    const wsData = [];

    if (headers) {
      wsData.push(keys);
    }

    rows.forEach((row) => {
      wsData.push(
        keys.map((key) => {
          const val = row?.[key];
          if (val === null || val === undefined) return "";
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        })
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-width columns
    if (autoWidth && wsData.length > 0) {
      const colWidths = keys.map((key, colIdx) => {
        const maxLen = wsData.reduce((max, row) => {
          const cell = row[colIdx];
          const len  = cell ? String(cell).length : 0;
          return Math.max(max, len);
        }, key.length);
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws["!cols"] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob   = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return ok(blob, {
      inputLength: raw.length,
      outputLength: buffer.byteLength,
      rowCount:    parsed.length,
      columnCount: keys.length,
      sheetName,
      columns:     keys,
    });
  } catch (e) {
    return err(`Excel Export Error: ${e.message}`);
  }
}

/**
 * Convert Excel (.xlsx) file to JSON.
 *
 * @param {File|ArrayBuffer} input   - Excel file or buffer
 * @param {object} options
 * @param {boolean} options.hasHeaders  - First row is headers (default: true)
 * @param {number}  options.sheetIndex  - Sheet index to read (default: 0)
 * @param {string}  options.sheetName   - Sheet name (overrides sheetIndex)
 * @param {boolean} options.rawNumbers  - Keep raw numbers (default: true)
 * @param {number}  options.indent      - JSON indentation (default: 2)
 *
 * @returns {Promise<{ success, output, error, stats }>}
 */
export async function excelToJson(input, options = {}) {
  if (!input) return err("No file provided.");

  const {
    hasHeaders  = true,
    sheetIndex  = 0,
    sheetName   = null,
    rawNumbers  = true,
    indent      = 2,
  } = options;

  try {
    const XLSX = await import("xlsx");

    // Read file
    let buffer;
    if (input instanceof File) {
      buffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      buffer = input;
    } else {
      return err("Input must be a File or ArrayBuffer.");
    }

    const wb = XLSX.read(buffer, { type: "array", raw: rawNumbers });

    // Get sheet
    const targetSheet = sheetName
      ? wb.Sheets[sheetName]
      : wb.Sheets[wb.SheetNames[sheetIndex]];

    if (!targetSheet) {
      return err(
        sheetName
          ? `Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(", ")}`
          : `Sheet at index ${sheetIndex} not found.`
      );
    }

    const usedSheetName = sheetName || wb.SheetNames[sheetIndex];

    // Convert to JSON
    const raw2  = XLSX.utils.sheet_to_json(targetSheet, {
      header:   hasHeaders ? 1 : "A",
      defval:   null,
      raw:      rawNumbers,
    });

    // If has headers, first row becomes keys automatically
    const data   = hasHeaders ? raw2 : raw2.slice(1);
    const output = JSON.stringify(data, null, indent);

    return ok(output, {
      inputLength:  buffer.byteLength,
      outputLength: output.length,
      rowCount:     data.length,
      sheetCount:   wb.SheetNames.length,
      sheetNames:   wb.SheetNames,
      usedSheet:    usedSheetName,
    });
  } catch (e) {
    return err(`Excel Read Error: ${e.message}`);
  }
}

// ============================================================
// CSV ↔ EXCEL
// ============================================================

/**
 * Convert CSV to Excel (.xlsx) Blob.
 *
 * @param {string} input     - CSV string
 * @param {object} options
 * @param {string}  options.sheetName  - Default: "Sheet1"
 * @param {string}  options.delimiter  - Auto-detected if not set
 * @param {boolean} options.autoWidth  - Default: true
 *
 * @returns {Promise<{ success, output: Blob, error, stats }>}
 */
export async function csvToExcel(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    sheetName = "Sheet1",
    delimiter = null,
    autoWidth = true,
  } = options;

  try {
    const XLSX   = await import("xlsx");
    const delim  = delimiter || detectDelimiter(raw.slice(0, 500));
    const rows   = parseCsv(raw, delim);

    if (rows.length === 0) return err("No data found in CSV.");

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Auto-width
    if (autoWidth && rows[0]) {
      const colWidths = rows[0].map((_, colIdx) => {
        const maxLen = rows.reduce((max, row) => {
          const len = row[colIdx] ? String(row[colIdx]).length : 0;
          return Math.max(max, len);
        }, 0);
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws["!cols"] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob   = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    return ok(blob, {
      inputLength:  raw.length,
      outputLength: buffer.byteLength,
      rowCount:     rows.length,
      columnCount:  rows[0]?.length ?? 0,
      delimiter:    delim === "\t" ? "tab" : delim,
      sheetName,
    });
  } catch (e) {
    return err(`CSV to Excel Error: ${e.message}`);
  }
}

// ============================================================
// XML ↔ CSV
// ============================================================

/**
 * Convert XML to CSV.
 * Flattens repeating elements into rows.
 *
 * @param {string} input
 * @param {object} options
 * @param {string}  options.delimiter - Default: ","
 * @param {boolean} options.headers   - Default: true
 * @param {number}  options.indent    - JSON indent for intermediate (default: 2)
 *
 * @returns {Promise<{ success, output, error, stats }>}
 */
export async function xmlToCsv(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const {
    delimiter = ",",
    headers   = true,
  } = options;

  // Step 1: XML → JSON
  const jsonResult = await xmlToJson(input, { indent: 2 });
  if (!jsonResult.success) return jsonResult;

  // Step 2: JSON → CSV
  return jsonToCsv(jsonResult.output, { delimiter, headers, flatten: true });
}

// ============================================================
// TIMESTAMP CONVERTER
// ============================================================

/**
 * Convert between Unix timestamps and human-readable dates.
 *
 * @param {string|number} input   - Unix timestamp OR date string
 * @param {object} options
 * @param {string}  options.timezone  - IANA timezone (default: "UTC")
 * @param {string}  options.format    - "unix-to-date" | "date-to-unix" | "auto"
 *
 * @returns {{ success, output, error, stats, meta }}
 */
export function convertTimestamp(input, options = {}) {
  const raw = safeTrim(String(input));
  if (!raw) return err("Input is empty.");

  const {
    timezone = "UTC",
    format   = "auto",
  } = options;

  // ── Auto-detect mode ──────────────────────────────────────
  const isNumeric = /^\d+$/.test(raw) || /^-?\d+(\.\d+)?$/.test(raw);

  const mode = format === "auto"
    ? isNumeric ? "unix-to-date" : "date-to-unix"
    : format;

  try {
    if (mode === "unix-to-date") {
      // ── Unix → Date ────────────────────────────────────
      let ts = parseFloat(raw);

      // Detect milliseconds vs seconds
      // If > 1e10, likely milliseconds
      if (ts > 1e10) ts = ts / 1000;

      const date = new Date(ts * 1000);

      if (isNaN(date.getTime())) {
        return err(`Invalid Unix timestamp: "${raw}"`);
      }

      const utcStr    = date.toUTCString();
      const isoStr    = date.toISOString();
      const localStr  = date.toLocaleString("en-US", { timeZone: timezone });
      const relative  = getRelativeTime(date);

      const meta = {
        unix:        ts,
        unixMs:      ts * 1000,
        iso:         isoStr,
        utc:         utcStr,
        local:       localStr,
        relative,
        timezone,
        year:        date.getUTCFullYear(),
        month:       date.getUTCMonth() + 1,
        day:         date.getUTCDate(),
        hour:        date.getUTCHours(),
        minute:      date.getUTCMinutes(),
        second:      date.getUTCSeconds(),
        dayOfWeek:   ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getUTCDay()],
      };

      const output = JSON.stringify(meta, null, 2);

      return ok(output, {
        inputLength:  raw.length,
        outputLength: output.length,
        mode,
      }, meta);

    } else {
      // ── Date → Unix ────────────────────────────────────
      const date = new Date(raw);

      if (isNaN(date.getTime())) {
        return err(
          `Invalid date string: "${raw}". Try ISO format: "2024-01-15T10:30:00Z"`
        );
      }

      const unix   = Math.floor(date.getTime() / 1000);
      const unixMs = date.getTime();

      const meta = {
        unix,
        unixMs,
        iso:      date.toISOString(),
        utc:      date.toUTCString(),
        relative: getRelativeTime(date),
      };

      const output = JSON.stringify(meta, null, 2);

      return ok(output, {
        inputLength:  raw.length,
        outputLength: output.length,
        mode,
      }, meta);
    }
  } catch (e) {
    return err(`Timestamp Error: ${e.message}`);
  }
}

// ── Relative time formatter ───────────────────────────────────
function getRelativeTime(date) {
  const now    = Date.now();
  const diff   = now - date.getTime();
  const abs    = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? "in " : "";
  const suffix = future ? ""     : " ago";

  if (abs < 60_000)        return `${prefix}${Math.floor(abs / 1000)}s${suffix}`;
  if (abs < 3_600_000)     return `${prefix}${Math.floor(abs / 60_000)}m${suffix}`;
  if (abs < 86_400_000)    return `${prefix}${Math.floor(abs / 3_600_000)}h${suffix}`;
  if (abs < 2_592_000_000) return `${prefix}${Math.floor(abs / 86_400_000)}d${suffix}`;
  if (abs < 31_536_000_000)return `${prefix}${Math.floor(abs / 2_592_000_000)}mo${suffix}`;
  return `${prefix}${Math.floor(abs / 31_536_000_000)}y${suffix}`;
}

// ============================================================
// COLOR CODE CONVERTER
// ============================================================

/**
 * Convert between HEX, RGB, HSL, HSV, CMYK color formats.
 *
 * @param {string} input    - Color value in any supported format
 * @param {object} options
 * @param {string}  options.to  - Target format: "all"|"hex"|"rgb"|"hsl"|"hsv"|"cmyk"
 *
 * @returns {{ success, output, error, stats, meta }}
 */
export function convertColor(input, options = {}) {
  const raw = safeTrim(input);
  if (!raw) return err("Input is empty.");

  const { to = "all" } = options;

  try {
    // ── Parse input color ────────────────────────────────
    const rgb = parseColorToRgb(raw);
    if (!rgb) {
      return err(
        `Cannot parse color: "${raw}". Supported formats: #hex, rgb(), rgba(), hsl(), hsla(), color name.`
      );
    }

    const { r, g, b, a = 1 } = rgb;

    // ── Convert to all formats ───────────────────────────
    const hex  = rgbToHex(r, g, b);
    const hsl  = rgbToHsl(r, g, b);
    const hsv  = rgbToHsv(r, g, b);
    const cmyk = rgbToCmyk(r, g, b);

    const formats = {
      hex:  `#${hex}`,
      rgb:  `rgb(${r}, ${g}, ${b})`,
      rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
      hsl:  `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`,
      hsv:  `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
      cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    };

    const output = to === "all"
      ? JSON.stringify(formats, null, 2)
      : formats[to] || formats.hex;

    const meta = {
      input: raw,
      formats,
      rgb: { r, g, b, a },
      hsl,
      hsv,
      cmyk,
      hex: `#${hex}`,
      luminance: getLuminance(r, g, b),
      isDark: getLuminance(r, g, b) < 0.5,
    };

    return ok(output, {
      inputLength:  raw.length,
      outputLength: output.length,
    }, meta);
  } catch (e) {
    return err(`Color Convert Error: ${e.message}`);
  }
}

// ── Parse any color string to RGB ────────────────────────────
function parseColorToRgb(input) {
  const str = input.trim().toLowerCase();

  // #RGB or #RRGGBB or #RGBA or #RRGGBBAA
  const hexMatch = str.match(
    /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
  );
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8
        ? Math.round((parseInt(hex.slice(6, 8), 16) / 255) * 100) / 100
        : 1,
    };
  }

  // rgb(R, G, B) or rgba(R, G, B, A)
  const rgbMatch = str.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // hsl(H, S%, L%) or hsla(H, S%, L%, A)
  const hslMatch = str.match(
    /hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*([\d.]+)\s*)?\)/
  );
  if (hslMatch) {
    const rgb = hslToRgb(
      parseFloat(hslMatch[1]),
      parseFloat(hslMatch[2]),
      parseFloat(hslMatch[3])
    );
    return { ...rgb, a: hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1 };
  }

  // CSS named colors (most common ones)
  const namedColors = {
    red: "ff0000", green: "008000", blue: "0000ff",
    white: "ffffff", black: "000000", yellow: "ffff00",
    orange: "ffa500", purple: "800080", pink: "ffc0cb",
    cyan: "00ffff", magenta: "ff00ff", brown: "a52a2a",
    gray: "808080", grey: "808080", lime: "00ff00",
    navy: "000080", teal: "008080", silver: "c0c0c0",
    maroon: "800000", olive: "808000", aqua: "00ffff",
    coral: "ff7f50", salmon: "fa8072", gold: "ffd700",
    violet: "ee82ee", indigo: "4b0082", turquoise: "40e0d0",
  };

  if (namedColors[str]) {
    const hex = namedColors[str];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  return null;
}

// ── RGB → HEX ─────────────────────────────────────────────────
function rgbToHex(r, g, b) {
  return [r, g, b]
    .map((v) => Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0")
    )
    .join("")
    .toUpperCase();
}

// ── RGB → HSL ─────────────────────────────────────────────────
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l   = (max + min) / 2;
  let   h   = 0;
  let   s   = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6;               break;
      case b: h = ((r - g) / d + 4) / 6;               break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// ── HSL → RGB ─────────────────────────────────────────────────
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

// ── RGB → HSV ─────────────────────────────────────────────────
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d   = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6;               break;
      case b: h = ((r - g) / d + 4) / 6;               break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

// ── RGB → CMYK ────────────────────────────────────────────────
function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

// ── Relative luminance (WCAG) ─────────────────────────────────
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// ============================================================
// UUID GENERATOR
// ============================================================

/**
 * Generate UUID(s).
 *
 * @param {object} options
 * @param {string}  options.version  - "v4" | "v1-like" (default: "v4")
 * @param {number}  options.count    - Number to generate (default: 1, max: 100)
 * @param {string}  options.format   - "default" | "no-hyphens" | "uppercase" | "braces"
 *
 * @returns {{ success, output, error, stats }}
 */
export function generateUuid(options = {}) {
  const {
    version = "v4",
    count   = 1,
    format  = "default",
  } = options;

  const safeCount = Math.min(Math.max(1, parseInt(count) || 1), 100);

  try {
    const uuids = Array.from({ length: safeCount }, () => {
      let uuid;

      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        uuid = crypto.randomUUID();
      } else {
        // Polyfill
        uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      }

      switch (format) {
        case "no-hyphens": return uuid.replace(/-/g, "");
        case "uppercase":  return uuid.toUpperCase();
        case "braces":     return `{${uuid}}`;
        default:           return uuid;
      }
    });

    const output = uuids.join("\n");

    return ok(output, {
      inputLength:  0,
      outputLength: output.length,
      count:        safeCount,
      version,
      format,
    });
  } catch (e) {
    return err(`UUID Generation Error: ${e.message}`);
  }
}

// ============================================================
// LOREM IPSUM GENERATOR
// ============================================================

const LOREM_WORDS = [
  "lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit",
  "sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore",
  "magna","aliqua","enim","ad","minim","veniam","quis","nostrud","exercitation",
  "ullamco","laboris","nisi","aliquip","ex","ea","commodo","consequat","duis",
  "aute","irure","in","reprehenderit","voluptate","velit","esse","cillum",
  "eu","fugiat","nulla","pariatur","excepteur","sint","occaecat","cupidatat",
  "non","proident","sunt","culpa","qui","officia","deserunt","mollit","anim",
  "id","est","laborum","perspiciatis","unde","omnis","iste","natus","error",
  "accusantium","doloremque","laudantium","totam","rem","aperiam","eaque","ipsa",
  "quae","ab","inventore","veritatis","quasi","architecto","beatae","vitae",
  "dicta","explicabo","nemo","ipsam","quia","voluptas","aspernatur","odit",
  "fugit","consequuntur","magni","dolores","ratione","sequi","nesciunt","neque",
];

/**
 * Generate Lorem Ipsum placeholder text.
 *
 * @param {object} options
 * @param {string}  options.type       - "paragraphs" | "sentences" | "words" (default: "paragraphs")
 * @param {number}  options.count      - Number of units (default: 3)
 * @param {boolean} options.startLorem - Start with "Lorem ipsum..." (default: true)
 *
 * @returns {{ success, output, error, stats }}
 */
export function generateLoremIpsum(options = {}) {
  const {
    type       = "paragraphs",
    count      = 3,
    startLorem = true,
  } = options;

  const safeCount = Math.min(Math.max(1, parseInt(count) || 3), 50);

  function randomWord() {
    return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
  }

  function randomSentence(wordCount = null) {
    const len = wordCount || Math.floor(Math.random() * 10) + 8;
    const words = Array.from({ length: len }, randomWord);
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

    // Add commas randomly
    for (let i = 3; i < words.length - 1; i += Math.floor(Math.random() * 4) + 3) {
      words[i] += ",";
    }

    return words.join(" ") + ".";
  }

  function randomParagraph(sentenceCount = null) {
    const len = sentenceCount || Math.floor(Math.random() * 4) + 4;
    return Array.from({ length: len }, randomSentence).join(" ");
  }

  try {
    let lines = [];

    switch (type) {
      case "words":
        lines = Array.from({ length: safeCount }, randomWord);
        if (startLorem && lines.length >= 2) {
          lines[0] = "Lorem";
          lines[1] = "ipsum";
        }
        break;

      case "sentences":
        lines = Array.from({ length: safeCount }, randomSentence);
        if (startLorem) {
          lines[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
        }
        break;

      default: // paragraphs
        lines = Array.from({ length: safeCount }, randomParagraph);
        if (startLorem) {
          lines[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. " +
            lines[0].split(". ").slice(1).join(". ");
        }
        break;
    }

    const output = type === "words"
      ? lines.join(" ")
      : lines.join("\n\n");

    return ok(output, {
      inputLength:  0,
      outputLength: output.length,
      wordCount:    output.split(/\s+/).length,
      charCount:    output.length,
      type,
      count:        safeCount,
    });
  } catch (e) {
    return err(`Lorem Ipsum Error: ${e.message}`);
  }
}

// ============================================================
// RANDOM STRING GENERATOR
// ============================================================

/**
 * Generate random strings.
 *
 * @param {object} options
 * @param {number}  options.length     - String length (default: 16)
 * @param {number}  options.count      - Strings to generate (default: 1)
 * @param {boolean} options.uppercase  - Include A-Z (default: true)
 * @param {boolean} options.lowercase  - Include a-z (default: true)
 * @param {boolean} options.numbers    - Include 0-9 (default: true)
 * @param {boolean} options.symbols    - Include symbols (default: false)
 * @param {string}  options.custom     - Custom charset (overrides above)
 * @param {string}  options.separator  - Between strings (default: "\n")
 *
 * @returns {{ success, output, error, stats }}
 */
export function generateRandomString(options = {}) {
  const {
    length    = 16,
    count     = 1,
    uppercase = true,
    lowercase = true,
    numbers   = true,
    symbols   = false,
    custom    = "",
    separator = "\n",
  } = options;

  const safeLength = Math.min(Math.max(1, parseInt(length) || 16), 1000);
  const safeCount  = Math.min(Math.max(1, parseInt(count)  || 1),  100);

  // Build charset
  let charset = custom || "";
  if (!custom) {
    if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (numbers)   charset += "0123456789";
    if (symbols)   charset += "!@#$%^&*()-_=+[]{}|;:,.<>?";
  }

  if (charset.length === 0) {
    return err("No character set selected. Enable at least one character type.");
  }

  try {
    const strings = Array.from({ length: safeCount }, () => {
      const bytes = new Uint8Array(safeLength);
      crypto.getRandomValues(bytes);
      return Array.from(bytes)
        .map((byte) => charset[byte % charset.length])
        .join("");
    });

    const output = strings.join(separator);

    return ok(output, {
      inputLength:  0,
      outputLength: output.length,
      length:       safeLength,
      count:        safeCount,
      charsetSize:  charset.length,
      entropy:      Math.floor(safeLength * Math.log2(charset.length)),
    });
  } catch (e) {
    return err(`Random String Error: ${e.message}`);
  }
}

// ============================================================
// EXPORTS SUMMARY
//
// JSON ↔ CSV:
//   jsonToCsv(input, options)
//   csvToJson(input, options)
//
// JSON ↔ XML:
//   jsonToXml(input, options)
//   xmlToJson(input, options)          ← async
//
// JSON ↔ YAML:
//   jsonToYaml(input, options)
//   yamlToJson(input, options)
//
// JSON ↔ Excel:
//   jsonToExcel(input, options)        ← async, returns Blob
//   excelToJson(input, options)        ← async, accepts File
//
// CSV ↔ Excel:
//   csvToExcel(input, options)         ← async, returns Blob
//
// XML ↔ CSV:
//   xmlToCsv(input, options)           ← async
//
// Utilities:
//   convertTimestamp(input, options)
//   convertColor(input, options)
//   generateUuid(options)
//   generateLoremIpsum(options)
//   generateRandomString(options)
// ============================================================