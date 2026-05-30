// ============================================================
// HELPERS
// src/lib/helpers.js
//
// General-purpose utility functions used across the entire
// application — components, pages, and tool logic.
//
// Organized into sections:
//   1.  String helpers
//   2.  Number helpers
//   3.  Array helpers
//   4.  Object helpers
//   5.  Date / time helpers
//   6.  File helpers
//   7.  Clipboard helpers
//   8.  URL helpers
//   9.  Color helpers
//   10. Browser / environment helpers
//   11. Debounce / throttle
//   12. Error helpers
//   13. SEO helpers
//   14. Tool-specific helpers
// ============================================================

// ============================================================
// 1. STRING HELPERS
// ============================================================

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a slug to a readable title.
 * "json-formatter" → "JSON Formatter"
 * @param {string} slug
 * @returns {string}
 */
export function slugToTitle(slug) {
  if (!slug) return "";
  return slug
    .split("-")
    .map((word) => {
      // Keep known acronyms uppercase
      const acronyms = new Set([
        "json",
        "xml",
        "csv",
        "yaml",
        "html",
        "css",
        "js",
        "sql",
        "url",
        "api",
        "jwt",
        "uuid",
        "md5",
        "sha",
        "hmac",
        "pdf",
        "xlsx",
        "rgb",
        "hex",
        "hsl",
        "hsv",
        "svg",
        "http",
        "https",
        "a11y",
        "seo",
        "ui",
        "ux",
        "id",
        "ip",
        "utf",
        "ascii",
      ]);
      return acronyms.has(word.toLowerCase())
        ? word.toUpperCase()
        : capitalize(word);
    })
    .join(" ");
}

/**
 * Convert a title to a slug.
 * "JSON Formatter" → "json-formatter"
 * @param {string} title
 * @returns {string}
 */
export function titleToSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Truncate a string to a max length with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @param {string} suffix
 * @returns {string}
 */
export function truncate(str, maxLength = 80, suffix = "…") {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip HTML tags from a string.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Count words in a string.
 * @param {string} str
 * @returns {number}
 */
export function wordCount(str) {
  if (!str?.trim()) return 0;
  return str.trim().split(/\s+/).length;
}

/**
 * Count lines in a string.
 * @param {string} str
 * @returns {number}
 */
export function lineCount(str) {
  if (!str) return 0;
  return str.split("\n").length;
}

/**
 * Check if a string is valid JSON.
 * @param {string} str
 * @returns {boolean}
 */
export function isValidJson(str) {
  if (!str?.trim()) return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON — returns null on failure instead of throwing.
 * @param {string} str
 * @param {*} fallback
 * @returns {*}
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify JSON — returns empty string on failure.
 * @param {*} value
 * @param {number} indent
 * @returns {string}
 */
export function safeJsonStringify(value, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return "";
  }
}

/**
 * Generate a random string of given length.
 * @param {number} length
 * @param {string} charset
 * @returns {string}
 */
export function randomString(
  length = 12,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => charset[b % charset.length])
    .join("");
}

/**
 * Check if a string contains only ASCII characters.
 * @param {string} str
 * @returns {boolean}
 */
export function isAscii(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

/**
 * Pad a string on the left.
 * @param {string} str
 * @param {number} length
 * @param {string} char
 * @returns {string}
 */
export function padLeft(str, length, char = " ") {
  return String(str).padStart(length, char);
}

// ============================================================
// 2. NUMBER HELPERS
// ============================================================

/**
 * Format bytes into a human-readable size.
 * 1024 → "1 KB", 1048576 → "1 MB"
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return `−${formatBytes(-bytes, decimals)}`;

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format a number with commas.
 * 1000000 → "1,000,000"
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return "";
  return num.toLocaleString("en-US");
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round to a specific number of decimal places.
 * @param {number} num
 * @param {number} places
 * @returns {number}
 */
export function roundTo(num, places = 2) {
  return Math.round(num * Math.pow(10, places)) / Math.pow(10, places);
}

/**
 * Calculate percentage.
 * @param {number} value
 * @param {number} total
 * @param {number} decimals
 * @returns {number}
 */
export function percentage(value, total, decimals = 1) {
  if (total === 0) return 0;
  return roundTo((value / total) * 100, decimals);
}

/**
 * Generate a range of numbers.
 * range(1, 5) → [1, 2, 3, 4, 5]
 * @param {number} start
 * @param {number} end
 * @param {number} step
 * @returns {number[]}
 */
export function range(start, end, step = 1) {
  const result = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

// ============================================================
// 3. ARRAY HELPERS
// ============================================================

/**
 * Remove duplicate values from an array.
 * @param {any[]} arr
 * @param {Function} key  - Optional key extractor for objects
 * @returns {any[]}
 */
export function unique(arr, key = null) {
  if (!Array.isArray(arr)) return [];
  if (key) {
    const seen = new Set();
    return arr.filter((item) => {
      const k = key(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  return [...new Set(arr)];
}

/**
 * Group an array of objects by a key.
 * groupBy([{type:"a"},{type:"b"},{type:"a"}], "type")
 * → { a: [...], b: [...] }
 * @param {any[]} arr
 * @param {string|Function} key
 * @returns {Object}
 */
export function groupBy(arr, key) {
  if (!Array.isArray(arr)) return {};
  return arr.reduce((groups, item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
    return groups;
  }, {});
}

/**
 * Chunk an array into groups of n.
 * chunk([1,2,3,4,5], 2) → [[1,2],[3,4],[5]]
 * @param {any[]} arr
 * @param {number} size
 * @returns {any[][]}
 */
export function chunk(arr, size) {
  if (!Array.isArray(arr) || size < 1) return [];
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Sort an array of objects by a key.
 * @param {any[]} arr
 * @param {string} key
 * @param {"asc"|"desc"} order
 * @returns {any[]}
 */
export function sortBy(arr, key, order = "asc") {
  if (!Array.isArray(arr)) return [];
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return order === "asc" ? cmp : -cmp;
  });
}

/**
 * Flatten a nested array one level deep.
 * @param {any[]} arr
 * @returns {any[]}
 */
export function flatten(arr) {
  return Array.isArray(arr) ? arr.flat() : [];
}

// ============================================================
// 4. OBJECT HELPERS
// ============================================================

/**
 * Deep clone an object (JSON-safe values only).
 * @param {object} obj
 * @returns {object}
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from an object.
 * pick({ a:1, b:2, c:3 }, ["a","c"]) → { a:1, c:3 }
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
export function pick(obj, keys) {
  if (!obj || !Array.isArray(keys)) return {};
  return keys.reduce((result, key) => {
    if (key in obj) result[key] = obj[key];
    return result;
  }, {});
}

/**
 * Omit specific keys from an object.
 * omit({ a:1, b:2, c:3 }, ["b"]) → { a:1, c:3 }
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
export function omit(obj, keys) {
  if (!obj) return {};
  const keySet = new Set(keys);
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keySet.has(k)),
  );
}

/**
 * Check if an object is empty.
 * @param {object} obj
 * @returns {boolean}
 */
export function isEmpty(obj) {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === "string" || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === "object") return Object.keys(obj).length === 0;
  return false;
}

/**
 * Merge objects deeply.
 * @param {object} target
 * @param {...object} sources
 * @returns {object}
 */
export function deepMerge(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });
  }

  return deepMerge(target, ...sources);
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

// ============================================================
// 5. DATE / TIME HELPERS
// ============================================================

/**
 * Format a date to a readable string.
 * @param {Date|number|string} date
 * @param {object} options   - Intl.DateTimeFormat options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return "Invalid date";

    const defaults = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    return new Intl.DateTimeFormat("en-US", { ...defaults, ...options }).format(
      d,
    );
  } catch {
    return "Invalid date";
  }
}

/**
 * Format a date to relative time.
 * "2 hours ago", "in 3 days"
 * @param {Date|number|string} date
 * @returns {string}
 */
export function timeAgo(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const future = diff < 0;

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (abs < 60_000)
      return rtf.format(
        future ? Math.ceil(abs / 1000) : -Math.floor(abs / 1000),
        "second",
      );
    if (abs < 3_600_000)
      return rtf.format(
        future ? Math.ceil(abs / 60_000) : -Math.floor(abs / 60_000),
        "minute",
      );
    if (abs < 86_400_000)
      return rtf.format(
        future ? Math.ceil(abs / 3_600_000) : -Math.floor(abs / 3_600_000),
        "hour",
      );
    if (abs < 2_592_000_000)
      return rtf.format(
        future ? Math.ceil(abs / 86_400_000) : -Math.floor(abs / 86_400_000),
        "day",
      );
    if (abs < 31_536_000_000)
      return rtf.format(
        future
          ? Math.ceil(abs / 2_592_000_000)
          : -Math.floor(abs / 2_592_000_000),
        "month",
      );
    return rtf.format(
      future
        ? Math.ceil(abs / 31_536_000_000)
        : -Math.floor(abs / 31_536_000_000),
      "year",
    );
  } catch {
    return "unknown";
  }
}

/**
 * Get the current Unix timestamp (seconds).
 * @returns {number}
 */
export function unixNow() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if a Unix timestamp is expired.
 * @param {number} ts  - Unix timestamp in seconds
 * @returns {boolean}
 */
export function isExpired(ts) {
  return ts < unixNow();
}

// ============================================================
// 6. FILE HELPERS
// ============================================================

/**
 * Get a file's extension.
 * "document.pdf" → "pdf"
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

/**
 * Get a file's name without extension.
 * "document.pdf" → "document"
 * @param {string} filename
 * @returns {string}
 */
export function getFileBasename(filename) {
  if (!filename) return "";
  const name = filename.split("/").pop() || "";
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(0, dotIdx) : name;
}

/**
 * Determine MIME type from file extension.
 * @param {string} ext
 * @returns {string}
 */
export function getMimeType(ext) {
  const mimeMap = {
    json: "application/json",
    csv: "text/csv",
    xml: "application/xml",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    ts: "application/typescript",
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    zip: "application/zip",
    md: "text/markdown",
    sql: "application/sql",
  };
  return mimeMap[ext?.toLowerCase()] || "application/octet-stream";
}

/**
 * Read a File object as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Read a File object as ArrayBuffer.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export function readFileAsBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Trigger a file download from a string.
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function downloadText(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Trigger a file download from a Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate file type against allowed types.
 * @param {File} file
 * @param {string[]} allowed  - e.g. [".json", ".csv"] or ["application/json"]
 * @returns {boolean}
 */
export function isAllowedFileType(file, allowed) {
  if (!file || !allowed?.length) return true;
  const ext = "." + getFileExtension(file.name);
  const mime = file.type;
  return allowed.some(
    (type) =>
      type === ext || type === mime || mime.startsWith(type.replace("*", "")),
  );
}

// ============================================================
// 7. CLIPBOARD HELPERS
// ============================================================

/**
 * Copy text to clipboard.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      const success = document.execCommand("copy");
      document.body.removeChild(el);
      return success;
    } catch {
      return false;
    }
  }
}

/**
 * Read text from clipboard.
 * @returns {Promise<string|null>}
 */
export async function readClipboard() {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

// ============================================================
// 8. URL HELPERS
// ============================================================

/**
 * Build a URL with query parameters.
 * buildUrl("/tools", { q: "json", page: 1 }) → "/tools?q=json&page=1"
 * @param {string} base
 * @param {object} params
 * @returns {string}
 */
export function buildUrl(base, params = {}) {
  const url = new URL(base, "https://placeholder.com");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url.pathname + (url.search || "");
}

/**
 * Parse query parameters from a URL search string.
 * "?q=json&page=2" → { q: "json", page: "2" }
 * @param {string} search  - window.location.search
 * @returns {object}
 */
export function parseQuery(search) {
  const params = new URLSearchParams(search);
  const result = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Check if a URL is external (different origin).
 * @param {string} url
 * @param {string} origin  - Current origin (default: window.location.origin)
 * @returns {boolean}
 */
export function isExternalUrl(url, origin = "") {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith("?"))
    return false;
  try {
    const parsed = new URL(url);
    const base =
      origin || (typeof window !== "undefined" ? window.location.origin : "");
    return parsed.origin !== base;
  } catch {
    return false;
  }
}

// ============================================================
// 9. COLOR HELPERS
// ============================================================

/**
 * Check if a hex color is dark.
 * @param {string} hex  - e.g. "#1a2b3c"
 * @returns {boolean}
 */
export function isDarkColor(hex) {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Get a contrasting text color (black or white) for a background.
 * @param {string} hex
 * @returns {"#000000"|"#ffffff"}
 */
export function getContrastColor(hex) {
  return isDarkColor(hex) ? "#ffffff" : "#000000";
}

/**
 * Generate a random hex color.
 * @returns {string}  e.g. "#a3f2c1"
 */
export function randomHexColor() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return (
    "#" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// ============================================================
// 10. BROWSER / ENVIRONMENT HELPERS
// ============================================================

/**
 * Check if code is running in a browser.
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Check if running on a mobile device.
 * @returns {boolean}
 */
export function isMobile() {
  if (!isBrowser()) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/**
 * Check if the user prefers reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (!isBrowser()) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if the user prefers dark mode.
 * @returns {boolean}
 */
export function prefersDarkMode() {
  if (!isBrowser()) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Get the current viewport dimensions.
 * @returns {{ width: number, height: number }}
 */
export function getViewport() {
  if (!isBrowser()) return { width: 0, height: 0 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Scroll to the top of the page.
 * @param {boolean} smooth
 */
export function scrollToTop(smooth = true) {
  if (!isBrowser()) return;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

/**
 * Scroll an element into view.
 * @param {string|HTMLElement} target  - CSS selector or element
 * @param {object} options
 */
export function scrollIntoView(target, options = {}) {
  if (!isBrowser()) return;
  const el =
    typeof target === "string" ? document.querySelector(target) : target;
  el?.scrollIntoView({ behavior: "smooth", block: "start", ...options });
}

/**
 * Get/set localStorage safely (SSR-safe).
 * @param {string} key
 * @param {*} value  - If provided, sets the value. If omitted, gets it.
 * @param {*} fallback
 * @returns {*}
 */
export function storage(key, value = undefined, fallback = null) {
  if (!isBrowser()) return fallback;
  try {
    if (value !== undefined) {
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Remove an item from localStorage.
 * @param {string} key
 */
export function storageRemove(key) {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ============================================================
// 11. DEBOUNCE / THROTTLE
// ============================================================

/**
 * Debounce a function — delays execution until after
 * wait ms have elapsed since the last invocation.
 * @param {Function} fn
 * @param {number} wait  - milliseconds
 * @returns {Function}
 */
export function debounce(fn, wait = 300) {
  let timer;
  const debounced = function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/**
 * Throttle a function — ensures it runs at most once
 * per limit ms.
 * @param {Function} fn
 * @param {number} limit  - milliseconds
 * @returns {Function}
 */
export function throttle(fn, limit = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Execute a function only once.
 * @param {Function} fn
 * @returns {Function}
 */
export function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

// ============================================================
// 12. ERROR HELPERS
// ============================================================

/**
 * Extract a human-readable message from any error.
 * @param {*} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return "An unknown error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred.";
}

/**
 * Wrap an async function with error handling.
 * Returns [result, error] tuple (Go-style).
 * @param {Promise} promise
 * @returns {Promise<[any, null] | [null, Error]>}
 */
export async function tryCatch(promise) {
  try {
    const result = await promise;
    return [result, null];
  } catch (e) {
    return [null, e instanceof Error ? e : new Error(String(e))];
  }
}

/**
 * Retry an async function up to n times.
 * @param {Function} fn        - Async function to retry
 * @param {number}   retries   - Max attempts (default: 3)
 * @param {number}   delay     - ms between attempts (default: 500)
 * @returns {Promise<any>}
 */
export async function withRetry(fn, retries = 3, delay = 500) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)));
      }
    }
  }
  throw lastError;
}

// ============================================================
// 13. SEO HELPERS
// ============================================================

/**
 * Generate a canonical URL for a tool.
 * @param {string} slug
 * @param {string} baseUrl
 * @returns {string}
 */
export function toolCanonicalUrl(slug, baseUrl = "https://devtoolssite.com") {
  return `${baseUrl}/tools/${slug}`;
}

/**
 * Generate a canonical URL for a category.
 * @param {string} slug
 * @param {string} baseUrl
 * @returns {string}
 */
export function categoryCanonicalUrl(
  slug,
  baseUrl = "https://devtoolssite.com",
) {
  return `${baseUrl}/categories/${slug}`;
}

/**
 * Build Open Graph metadata for a tool.
 * @param {object} tool
 * @returns {object}
 */
export function buildToolOgMeta(tool) {
  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    url: toolCanonicalUrl(tool.slug),
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: tool.metaTitle,
      },
    ],
  };
}

/**
 * Build JSON-LD for a tool page.
 * @param {object} tool
 * @returns {object}
 */
export function buildToolJsonLd(tool) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: toolCanonicalUrl(tool.slug),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: tool.tags?.join(", ") ?? "",
  };
}

// ============================================================
// 14. TOOL-SPECIFIC HELPERS
// ============================================================

/**
 * Get a sample input string for a tool by slug.
 * Used by ToolInput's "Try Sample" button.
 * @param {string} slug
 * @returns {string}
 */
export function getSampleInput(slug) {
  const samples = {
    "json-formatter": `{\n  "name": "DevTools",\n  "version": "1.0.0",\n  "tools": 70,\n  "free": true,\n  "categories": ["json","encoding","formatters","security"]\n}`,

    "json-validator": `{"name":"DevTools","version":"1.0.0","tools":70,"free":true}`,

    "json-minifier": `{\n  "name": "DevTools",\n  "version": "1.0.0",\n  "description": "Free developer tools",\n  "tools": 70\n}`,

    "json-to-csv": `[\n  {"name":"Alice","age":30,"city":"New York"},\n  {"name":"Bob","age":25,"city":"London"},\n  {"name":"Carol","age":35,"city":"Tokyo"}\n]`,

    "csv-to-json": `name,age,city\nAlice,30,New York\nBob,25,London\nCarol,35,Tokyo`,

    "json-to-xml": `{\n  "person": {\n    "name": "Alice",\n    "age": 30,\n    "email": "alice@example.com"\n  }\n}`,

    "xml-to-json": `<?xml version="1.0" encoding="UTF-8"?>\n<person>\n  <name>Alice</name>\n  <age>30</age>\n  <email>alice@example.com</email>\n</person>`,

    "json-diff-checker": `{"name":"Alice","age":30,"city":"New York"}`,

    "base64-encode-decode": `Hello, World! 🌍`,

    "url-encode-decode": `https://example.com/search?q=hello world&lang=en&page=1`,

    "html-encode-decode": `<div class="hello">Hello & "World" <span>!</span></div>`,

    "hex-encoder-decoder": `Hello World`,

    "binary-to-text": `01001000 01100101 01101100 01101100 01101111`,

    "text-to-binary": `Hello`,

    "ascii-converter": `Hello, World!`,

    "html-formatter": `<!DOCTYPE html><html><head><title>Test</title></head><body><div class="container"><h1>Hello</h1><p>World</p></div></body></html>`,

    "css-formatter": `.container{display:flex;flex-direction:column;align-items:center;padding:20px;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.1)}`,

    "javascript-formatter": `function greet(name){return "Hello "+name+"!"}const result=greet("World");console.log(result);`,

    "sql-formatter": `SELECT u.id,u.name,u.email,COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id=o.user_id WHERE u.created_at > '2024-01-01' GROUP BY u.id,u.name,u.email ORDER BY order_count DESC LIMIT 10`,

    "xml-formatter": `<?xml version="1.0"?><root><item id="1"><name>Alice</name><age>30</age></item><item id="2"><name>Bob</name><age>25</age></item></root>`,

    "yaml-formatter": `name: DevTools\nversion: 1.0.0\ntools:\n  - name: JSON Formatter\n    category: json\n  - name: Base64 Encoder\n    category: encoding`,

    "regex-tester": `The quick brown fox jumps over the lazy dog. Phone: 555-1234.`,

    "text-diff-checker": `The quick brown fox\njumps over the lazy dog\nPack my box with five dozen liquor jugs`,

    "md5-hash-generator": `Hello, World!`,
    "sha1-hash-generator": `Hello, World!`,
    "sha256-hash-generator": `Hello, World!`,

    "bcrypt-hash-generator": `MySecureP@ssw0rd`,

    "jwt-decoder": `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,

    "timestamp-converter": `1705312800`,

    "cron-expression-generator": `0 9 * * 1-5`,

    "url-parser": `https://api.example.com/v1/users?page=1&limit=10&sort=desc#results`,

    "color-code-converter": `#3b82f6`,

    "yaml-to-json": `name: DevTools\nversion: 1.0.0\nfree: true\ntools:\n  - json-formatter\n  - base64-encoder\n  - regex-tester`,

    "json-to-yaml": `{"name":"DevTools","version":"1.0.0","free":true,"tools":["json-formatter","base64-encoder"]}`,

    "html-table-generator": `name,age,city\nAlice,30,New York\nBob,25,London`,

    "html-entity-encoder": `<script>alert("XSS & malicious code")</script>`,
    "html-entity-decoder": `&lt;script&gt;alert(&quot;XSS &amp; malicious code&quot;)&lt;/script&gt;`,

    "lorem-ipsum-generator": "",
    "uuid-generator": "",
    "random-string-generator": "",
    "random-color-generator": "",

    "sql-query-generator": "",
    "flexbox-generator": "",
  };

  return samples[slug] ?? "";
}

/**
 * Get the output filename for a conversion tool.
 * @param {string} slug      - Tool slug
 * @param {string} inputName - Input filename (optional)
 * @returns {string}
 */
export function getOutputFilename(slug, inputName = "") {
  const base = inputName ? getFileBasename(inputName) : "output";

  const filenameMap = {
    "json-to-csv": `${base}.csv`,
    "csv-to-json": `${base}.json`,
    "json-to-xml": `${base}.xml`,
    "xml-to-json": `${base}.json`,
    "json-to-yaml": `${base}.yaml`,
    "yaml-to-json": `${base}.json`,
    "json-to-excel": `${base}.xlsx`,
    "excel-to-json": `${base}.json`,
    "csv-to-excel": `${base}.xlsx`,
    "xml-to-csv": `${base}.csv`,
    "pdf-to-word": `${base}.docx`,
    "word-to-pdf": `${base}.pdf`,
    "pdf-to-jpg": `${base}.jpg`,
    "jpg-to-pdf": `${base}.pdf`,
    "excel-to-pdf": `${base}.pdf`,
    "pdf-to-excel": `${base}.xlsx`,
    "json-formatter": `${base}.json`,
    "json-minifier": `${base}.min.json`,
    "html-formatter": `${base}.html`,
    "html-minifier": `${base}.min.html`,
    "css-formatter": `${base}.css`,
    "css-minifier": `${base}.min.css`,
    "javascript-formatter": `${base}.js`,
    "javascript-minifier": `${base}.min.js`,
    "sql-formatter": `${base}.sql`,
    "yaml-formatter": `${base}.yaml`,
    "xml-formatter": `${base}.xml`,
  };

  return filenameMap[slug] ?? `${base}.txt`;
}

/**
 * Calculate compression stats for minifier tools.
 * @param {string} original
 * @param {string} minified
 * @returns {{ originalSize, minifiedSize, savedBytes, savedPct }}
 */
export function calcCompressionStats(original, minified) {
  const enc = new TextEncoder();
  const originalSize = enc.encode(original).length;
  const minifiedSize = enc.encode(minified).length;
  const savedBytes = originalSize - minifiedSize;
  const savedPct =
    originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  return {
    originalSize: formatBytes(originalSize),
    minifiedSize: formatBytes(minifiedSize),
    savedBytes: formatBytes(savedBytes),
    savedPct,
  };
}

/**
 * Check if two JSON strings are semantically equal.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function jsonEqual(a, b) {
  try {
    return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
  } catch {
    return false;
  }
}

/**
 * Detect the likely language of a code string.
 * Used to auto-select the formatter language.
 * @param {string} code
 * @returns {string}  "json"|"html"|"css"|"javascript"|"sql"|"xml"|"yaml"|"unknown"
 */
export function detectLanguage(code) {
  const trimmed = code?.trim() ?? "";
  if (!trimmed) return "unknown";

  // JSON
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    (trimmed.endsWith("}") || trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {}
  }

  // XML / HTML
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<!DOCTYPE")) {
    return trimmed.startsWith("<!DOCTYPE html") ? "html" : "xml";
  }

  if (/<html[\s>]/i.test(trimmed)) return "html";
  if (/<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z]>/i.test(trimmed)) {
    // Could be XML or HTML — check for HTML-specific tags
    if (/<(div|span|p|a|img|head|body|script|style)[\s>]/i.test(trimmed)) {
      return "html";
    }
    return "xml";
  }

  // YAML
  if (/^---\n/.test(trimmed) || /^[a-zA-Z_][\w-]*:\s.+/m.test(trimmed)) {
    return "yaml";
  }

  // CSS
  if (/[.#a-zA-Z][^{]*\{[^}]*\}/s.test(trimmed)) return "css";

  // SQL
  if (
    /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\s/i.test(trimmed)
  ) {
    return "sql";
  }

  // JavaScript
  if (
    /\b(function|const|let|var|class|import|export|return|=>)\b/.test(
      trimmed,
    ) ||
    /console\.(log|error|warn)/.test(trimmed)
  ) {
    return "javascript";
  }

  return "unknown";
}
