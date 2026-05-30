"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";

// ============================================================
// HTML MINIFIER ENGINE
// Pure JS — no external dependency
// Levels: Basic → Standard → Aggressive
// ============================================================

// ── Minification option presets ───────────────────────────────
const PRESETS = {
  basic: {
    label:                  "Basic",
    desc:                   "Safe — only removes blank lines and trims whitespace",
    color:                  "text-green-700 bg-green-50 border-green-200",
    activeColor:            "bg-green-600 text-white",
    removeComments:         false,
    collapseWhitespace:     true,
    removeOptionalTags:     false,
    removeRedundantAttrs:   false,
    minifyInlineCSS:        false,
    minifyInlineJS:         false,
    removeEmptyAttrs:       false,
    removeAttributeQuotes:  false,
    sortAttributes:         false,
    collapseBooleanAttrs:   false,
  },
  standard: {
    label:                  "Standard",
    desc:                   "Recommended — removes comments, collapses whitespace, cleans attributes",
    color:                  "text-blue-700 bg-blue-50 border-blue-200",
    activeColor:            "bg-blue-600 text-white",
    removeComments:         true,
    collapseWhitespace:     true,
    removeOptionalTags:     false,
    removeRedundantAttrs:   true,
    minifyInlineCSS:        true,
    minifyInlineJS:         true,
    removeEmptyAttrs:       false,
    removeAttributeQuotes:  false,
    sortAttributes:         false,
    collapseBooleanAttrs:   true,
  },
  aggressive: {
    label:                  "Aggressive",
    desc:                   "Maximum — removes optional tags, unquotes safe attrs, strips everything",
    color:                  "text-purple-700 bg-purple-50 border-purple-200",
    activeColor:            "bg-purple-600 text-white",
    removeComments:         true,
    collapseWhitespace:     true,
    removeOptionalTags:     true,
    removeRedundantAttrs:   true,
    minifyInlineCSS:        true,
    minifyInlineJS:         true,
    removeEmptyAttrs:       true,
    removeAttributeQuotes:  true,
    sortAttributes:         false,
    collapseBooleanAttrs:   true,
  },
};

// ── Optional / redundant tags ─────────────────────────────────
const OPTIONAL_TAGS = new Set([
  "html", "head", "body", "tbody",
]);

const REDUNDANT_ATTRS = {
  script:  { type: "text/javascript"       },
  style:   { type: "text/css"              },
  link:    { type: "text/css"              },
  input:   { type: "text"                  },
  form:    { method: "get"                 },
  area:    { shape: "rect"                 },
};

const BOOLEAN_ATTRS = new Set([
  "allowfullscreen","async","autofocus","autoplay","checked","controls",
  "default","defer","disabled","formnovalidate","hidden","ismap","loop",
  "multiple","muted","nomodule","novalidate","open","readonly","required",
  "reversed","selected","truespeed",
]);

// Attributes safe to unquote (only alphanumeric, -, _, .)
function isSafeUnquoted(val) {
  return /^[a-zA-Z0-9\-_.]+$/.test(val);
}

// ── Inline CSS minifier ───────────────────────────────────────
function minifyCssInline(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")   // comments
    .replace(/\s+/g, " ")               // collapse whitespace
    .replace(/\s*{\s*/g, "{")
    .replace(/\s*}\s*/g, "}")
    .replace(/\s*:\s*/g, ":")
    .replace(/\s*;\s*/g, ";")
    .replace(/\s*,\s*/g, ",")
    .replace(/;}/g, "}")
    .replace(/0(px|em|rem|%)/g, "0")
    .trim();
}

// ── Inline JS minifier ────────────────────────────────────────
function minifyJsInline(js) {
  return js
    .replace(/\/\/[^\n]*/g, "")         // line comments
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments
    .replace(/\s+/g, " ")               // collapse whitespace
    .replace(/\s*([{};,=+\-*/<>!&|?:()])\s*/g, "$1")
    .trim();
}

// ── Main HTML tokenizer for minification ─────────────────────
function tokenizeForMinify(html) {
  const tokens = [];
  let i = 0;

  while (i < html.length) {
    // DOCTYPE
    if (html.slice(i, i + 9).toUpperCase() === "<!DOCTYPE") {
      const end = html.indexOf(">", i);
      if (end === -1) break;
      tokens.push({ type: "doctype", value: html.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    // Comment
    if (html.slice(i, i + 4) === "<!--") {
      const end = html.indexOf("-->", i + 4);
      if (end === -1) break;
      tokens.push({ type: "comment", value: html.slice(i, end + 3) });
      i = end + 3;
      continue;
    }

    // CDATA
    if (html.slice(i, i + 9) === "<![CDATA[") {
      const end = html.indexOf("]]>", i);
      if (end === -1) break;
      tokens.push({ type: "cdata", value: html.slice(i, end + 3) });
      i = end + 3;
      continue;
    }

    // Closing tag
    if (html.slice(i, i + 2) === "</") {
      const end = html.indexOf(">", i);
      if (end === -1) break;
      const name = html.slice(i + 2, end).trim().toLowerCase();
      tokens.push({ type: "close", name, value: html.slice(i, end + 1) });
      i = end + 1;
      continue;
    }

    // Opening tag
    if (html[i] === "<" && /[a-zA-Z!?]/.test(html[i + 1] || "")) {
      const result = parseMinifyTag(html, i);
      if (result) {
        tokens.push(result.token);
        i = result.end;
        continue;
      }
    }

    // Text
    const next = html.indexOf("<", i);
    const text = next === -1 ? html.slice(i) : html.slice(i, next);
    if (text) tokens.push({ type: "text", value: text });
    i = next === -1 ? html.length : next;
  }

  return tokens;
}

function parseMinifyTag(html, start) {
  let i    = start + 1;
  let name = "";

  while (i < html.length && /[a-zA-Z0-9\-_:]/.test(html[i])) {
    name += html[i++];
  }

  if (!name) return null;

  const attrs = [];
  let selfClose = false;

  while (i < html.length && html[i] !== ">") {
    while (i < html.length && /\s/.test(html[i])) i++;

    if (html[i] === "/" && html[i + 1] === ">") {
      selfClose = true; i += 2;
      return {
        token: { type: "open", name: name.toLowerCase(), attrs, selfClose: true },
        end:   i,
      };
    }
    if (html[i] === ">") break;

    // Attribute name
    let attrName = "";
    while (i < html.length && !/[\s=/>]/.test(html[i])) {
      attrName += html[i++];
    }
    if (!attrName) { i++; continue; }

    while (i < html.length && /\s/.test(html[i])) i++;

    if (html[i] === "=") {
      i++;
      while (i < html.length && /\s/.test(html[i])) i++;
      const q = html[i];
      if (q === '"' || q === "'") {
        i++;
        let val = "";
        while (i < html.length && html[i] !== q) val += html[i++];
        i++;
        attrs.push({ name: attrName, value: val, quote: q });
      } else {
        let val = "";
        while (i < html.length && !/[\s>]/.test(html[i])) val += html[i++];
        attrs.push({ name: attrName, value: val, quote: '"' });
      }
    } else {
      attrs.push({ name: attrName, value: null, quote: null }); // boolean
    }
  }

  if (html[i] === ">") i++;

  return {
    token: { type: "open", name: name.toLowerCase(), attrs, selfClose },
    end:   i,
  };
}

// ── Core minify function ──────────────────────────────────────
function minifyHtml(raw, options = {}) {
  const {
    removeComments        = true,
    collapseWhitespace    = true,
    removeOptionalTags    = false,
    removeRedundantAttrs  = true,
    minifyInlineCSS       = true,
    minifyInlineJS        = true,
    removeEmptyAttrs      = false,
    removeAttributeQuotes = false,
    collapseBooleanAttrs  = true,
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    const tokens = tokenizeForMinify(raw.trim());
    let out = "";

    for (const tok of tokens) {
      switch (tok.type) {

        case "doctype":
          out += tok.value.replace(/\s+/g, " ").trim();
          break;

        case "comment":
          if (removeComments) {
            // Preserve conditional comments and special comments
            const content = tok.value;
            if (content.startsWith("<!--[if") || content.startsWith("<!-->") ||
                content.startsWith("<!--!")) {
              out += content;
            }
            // else: skip
          } else {
            out += tok.value;
          }
          break;

        case "cdata":
          out += tok.value;
          break;

        case "text": {
          let text = tok.value;
          if (collapseWhitespace) {
            text = text.replace(/\s+/g, " ");
            // If purely whitespace between block tags, can trim further
            // Keep single space to avoid word joining
          }
          out += text;
          break;
        }

        case "close": {
          if (removeOptionalTags && OPTIONAL_TAGS.has(tok.name)) break;
          out += `</${tok.name}>`;
          break;
        }

        case "open": {
          const tagName = tok.name;

          // Remove optional tags
          if (removeOptionalTags && OPTIONAL_TAGS.has(tagName) && !tok.selfClose) {
            break;
          }

          // Process attributes
          let attrs = tok.attrs;

          // Remove redundant attrs
          if (removeRedundantAttrs && REDUNDANT_ATTRS[tagName]) {
            const redundant = REDUNDANT_ATTRS[tagName];
            attrs = attrs.filter((a) => {
              const redundantVal = redundant[a.name.toLowerCase()];
              return !(redundantVal && a.value?.toLowerCase() === redundantVal);
            });
          }

          // Remove empty attrs (except boolean)
          if (removeEmptyAttrs) {
            attrs = attrs.filter((a) => {
              if (a.value === null) return true; // boolean
              if (BOOLEAN_ATTRS.has(a.name.toLowerCase())) return true;
              return a.value.trim() !== "";
            });
          }

          // Minify style attr
          if (minifyInlineCSS) {
            attrs = attrs.map((a) =>
              a.name.toLowerCase() === "style" && a.value
                ? { ...a, value: minifyCssInline(a.value) }
                : a
            );
          }

          // Minify event handler attrs (onclick, onload, etc.)
          if (minifyInlineJS) {
            attrs = attrs.map((a) =>
              /^on[a-z]+$/i.test(a.name) && a.value
                ? { ...a, value: minifyJsInline(a.value) }
                : a
            );
          }

          // Build attribute string
          const attrStr = attrs.map((a) => {
            if (a.value === null) {
              // Boolean attribute
              if (collapseBooleanAttrs) return ` ${a.name.toLowerCase()}`;
              return ` ${a.name}`;
            }

            const name  = a.name;
            const value = a.value;

            if (removeAttributeQuotes && isSafeUnquoted(value)) {
              return ` ${name}=${value}`;
            }

            return ` ${name}="${value}"`;
          }).join("");

          if (tok.selfClose) {
            out += `<${tagName}${attrStr}>`;
          } else {
            out += `<${tagName}${attrStr}>`;
          }

          // Handle script/style inline content
          if (tagName === "script" || tagName === "style") {
            // Content was part of a text token already handled
          }
          break;
        }
      }
    }

    // Post-process
    if (collapseWhitespace) {
      out = out
        .replace(/>\s+</g,  "><")         // whitespace between tags
        .replace(/\s{2,}/g,  " ")         // multiple spaces → one
        .replace(/^\s+|\s+$/g, "");       // trim
    }

    const saved    = raw.length - out.length;
    const savedPct = Math.round((saved / raw.length) * 100);

    return {
      success: true,
      output:  out,
      stats: {
        inputLength:   raw.length,
        outputLength:  out.length,
        saved,
        savedPct,
        inputLines:    raw.split("\n").length,
        gzipEstimate:  Math.round(out.length * 0.3),  // rough gzip estimate
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Minification error: ${e.message}` };
  }
}

// ── What was removed? ─────────────────────────────────────────
function diffStats(original, minified) {
  const comments   = (original.match(/<!--[\s\S]*?-->/g) || []).length;
  const whitespace = original.length - original.replace(/\s/g, "").length;
  const scripts    = (original.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || []).length;
  const styles     = (original.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).length;

  return { comments, whitespace, scripts, styles };
}

// ============================================================
// CONSTANTS
// ============================================================


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

// ── Size comparison card ──────────────────────────────────────
function SizeCard({ stats, input, output }) {
  if (!stats || !output) return null;

  const bytesOrig   = new TextEncoder().encode(input).length;
  const bytesMin    = new TextEncoder().encode(output).length;
  const miniPct     = Math.round((stats.outputLength / stats.inputLength) * 100);
  const gzipSaved   = Math.round((bytesOrig - stats.gzipEstimate) / bytesOrig * 100);

  function fmt(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Size Reduction
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
            <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {stats.savedPct}% smaller
          </span>
        </div>
      </div>

      {/* Progress bars */}
      <div className="px-5 py-4 space-y-3 bg-white">
        {[
          { label: "Original",  size: stats.inputLength,  bytes: bytesOrig, pct: 100,     barColor: "bg-gray-300", textColor: "text-gray-600"  },
          { label: "Minified",  size: stats.outputLength, bytes: bytesMin,  pct: miniPct, barColor: "bg-green-500",textColor: "text-green-600" },
          { label: "~Gzip est.",size: stats.gzipEstimate, bytes: null,      pct: Math.round(stats.gzipEstimate / stats.inputLength * 100), barColor: "bg-blue-400", textColor: "text-blue-600" },
        ].map(({ label, size, bytes, pct, barColor, textColor }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">{label}</span>
              <span className={`font-mono font-bold ${textColor}`}>
                {size.toLocaleString()} chars
                {bytes != null && ` · ${fmt(bytes)}`}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100">
        {[
          { label: "Saved chars", value: stats.saved.toLocaleString()       },
          { label: "Saved bytes", value: fmt(bytesOrig - bytesMin)           },
          { label: "Ratio",       value: `${miniPct}% of original`           },
          { label: "Lines removed",value: (stats.inputLines - 1).toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-3 border-r border-gray-100 last:border-r-0">
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            <p className="text-sm font-bold font-mono text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What was removed panel ────────────────────────────────────
function RemovedPanel({ input, output, options }) {
  if (!input || !output) return null;

  const ds = diffStats(input, output);
  const commentChars  = (input.match(/<!--[\s\S]*?-->/g) || []).join("").length;
  const whitespaceRm  = input.split("").filter((c) => /\s/.test(c)).length -
                        output.split("").filter((c) => /\s/.test(c)).length;
  const attrChars     = input.length - output.length - commentChars - Math.max(0, whitespaceRm);

  const items = [
    {
      label:   "HTML comments",
      count:   ds.comments,
      chars:   commentChars,
      enabled: options.removeComments,
      color:   "text-orange-600 bg-orange-50 border-orange-200",
      icon:    "💬",
    },
    {
      label:   "Whitespace chars",
      count:   null,
      chars:   Math.max(0, whitespaceRm),
      enabled: options.collapseWhitespace,
      color:   "text-blue-600 bg-blue-50 border-blue-200",
      icon:    "⎵",
    },
    {
      label:   "Inline <script> blocks",
      count:   ds.scripts,
      chars:   null,
      enabled: options.minifyInlineJS,
      color:   "text-yellow-600 bg-yellow-50 border-yellow-200",
      icon:    "JS",
    },
    {
      label:   "Inline <style> blocks",
      count:   ds.styles,
      chars:   null,
      enabled: options.minifyInlineCSS,
      color:   "text-purple-600 bg-purple-50 border-purple-200",
      icon:    "CSS",
    },
  ].filter((item) => item.enabled && (item.count !== 0 || item.chars !== 0));

  if (items.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          What was removed
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(({ label, count, chars, color, icon }) => (
          <div key={label} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color}`}>
            <span className="text-xs font-mono font-bold flex-shrink-0 w-8 text-center">
              {icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">{label}</p>
              <p className="text-xs font-mono font-bold mt-0.5">
                {count != null && `${count} found`}
                {count != null && chars != null && " · "}
                {chars != null && chars > 0 && `${chars.toLocaleString()} chars saved`}
              </p>
            </div>
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

// ── Preset selector ───────────────────────────────────────────
function PresetSelector({ active, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {Object.entries(PRESETS).map(([key, preset]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
            active === key
              ? `${preset.color} ring-2 ring-offset-1 shadow-sm`
              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
            active === key ? "border-current bg-current" : "border-gray-300"
          }`}>
            {active === key && (
              <svg width="10" height="10" fill="white" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-sm font-bold ${active === key ? "" : "text-gray-700"}`}>
              {preset.label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              {preset.desc}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Options panel ─────────────────────────────────────────────
function OptionsPanel({ opts, onChange }) {
  const optList = [
    { key: "removeComments",        label: "Remove comments",          desc: "Strip <!-- --> HTML comments (preserves IE conditionals)"   },
    { key: "collapseWhitespace",    label: "Collapse whitespace",      desc: "Collapse multiple spaces/newlines into single space"        },
    { key: "removeOptionalTags",    label: "Remove optional tags",     desc: "Remove <html>, <head>, <body>, <tbody> (risky!)"           },
    { key: "removeRedundantAttrs",  label: "Remove redundant attrs",   desc: 'Remove type="text/javascript" and type="text/css"'         },
    { key: "minifyInlineCSS",       label: "Minify inline CSS",        desc: "Minify style= attributes and <style> blocks"              },
    { key: "minifyInlineJS",        label: "Minify inline JS",         desc: "Minify onclick= and other event handlers"                  },
    { key: "removeEmptyAttrs",      label: "Remove empty attributes",  desc: "Remove attributes with empty string values"               },
    { key: "removeAttributeQuotes", label: "Remove attribute quotes",  desc: 'Remove quotes from safe values: class=foo vs class="foo"' },
    { key: "collapseBooleanAttrs",  label: "Collapse boolean attrs",   desc: 'Convert disabled="disabled" → disabled'                    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {optList.map(({ key, label, desc }) => (
        <div
          key={key}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
            opts[key]
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onChange(key, !opts[key])}
        >
          <button
            role="switch"
            aria-checked={opts[key]}
            onClick={(e) => { e.stopPropagation(); onChange(key, !opts[key]); }}
            className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none ${
              opts[key] ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              opts[key] ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <div className="min-w-0">
            <p className={`text-xs font-semibold ${opts[key] ? "text-blue-800" : "text-gray-700"}`}>
              {label}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HtmlMinifier() {
  const [input,        setInput]        = useState("");
  const [output,       setOutput]       = useState("");
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [preset,       setPreset]       = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLines,    setShowLines]    = useState(false);
  const [autoMinify,   setAutoMinify]   = useState(false);
  const [activeSample, setActiveSample] = useState(null);
  const [opts, setOpts] = useState({ ...PRESETS.standard });

  // Sync opts when preset changes
  function handlePresetChange(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
    setOutput("");
    setError(null);
    setStats(null);
  }

  function handleOptChange(key, value) {
    setOpts((prev) => ({ ...prev, [key]: value }));
    setPreset("custom");
    setOutput("");
    setError(null);
    setStats(null);
  }

  // ── Process ──────────────────────────────────────────────────
  const handleMinify = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter HTML to minify.");
      setOutput("");
      setStats(null);
      return;
    }

    const result = minifyHtml(trimmed, opts);
    if (result.success) {
      setOutput(result.output);
      setError(null);
      setStats(result.stats);
    } else {
      setOutput("");
      setError(result.error);
      setStats(null);
    }
  }, [input, opts]);

  // Auto minify
  useEffect(() => {
    if (!autoMinify || !input.trim()) return;
    const t = setTimeout(handleMinify, 400);
    return () => clearTimeout(t);
  }, [input, autoMinify, handleMinify]);

  // Re-run on option change if output exists
  useEffect(() => {
    if (input.trim() && output) handleMinify();
  }, [opts]);

  // Ctrl+Enter
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleMinify();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMinify]);

  function handleClear() {
    setInput(""); setOutput(""); setError(null);
    setStats(null); setActiveSample(null);
  }

  function loadSample(key) {
    setInput(SAMPLES[key]); setOutput(""); setError(null);
    setStats(null); setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-5">

      {/* ── Preset selector ──────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Minification level
        </p>
        <PresetSelector active={preset} onChange={handlePresetChange} />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <button
          onClick={handleMinify}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Minify HTML
        </button>

        <Toggle
          checked={autoMinify}
          onChange={setAutoMinify}
          label="Auto minify"
          description="Minify automatically as you type"
        />
        <Toggle
          checked={showLines}
          onChange={setShowLines}
          label="Line numbers"
          description="Show line numbers on input"
        />

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
            showAdvanced
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {showAdvanced ? "Hide options" : "Advanced options"}
        </button>

        {/* Kbd hint */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↵</kbd>
        </div>
      </div>

      {/* ── Advanced options ──────────────────────────────────── */}
      {showAdvanced && (
        <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Fine-tune options
          </p>
          <OptionsPanel opts={opts} onChange={handleOptChange} />
        </div>
      )}

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label="HTML Input"
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
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden min-h-[380px]">
            {showLines && input && <LineNumbers text={input} />}
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
              placeholder={`Paste HTML to minify...\n\nSupports:\n• Full HTML documents\n• HTML fragments / components\n• Email templates\n• Inline <style> and <script> blocks\n• HTML with comments and whitespace`}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white outline-none resize-none min-h-[380px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
            />
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label="Minified HTML"
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && (
                  <button
                    onClick={() => downloadText(output, "minified.html", "text/html")}
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
          <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[380px] relative">
            {output ? (
              <textarea
                value={output}
                readOnly
                spellCheck={false}
                className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[380px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                <p className="text-xs text-gray-300">Minified HTML appears here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────── */}
      <ErrorBanner message={error} />

      {/* ── Size card ────────────────────────────────────────── */}
      {stats && output && (
        <SizeCard stats={stats} input={input} output={output} />
      )}

      {/* ── What was removed ─────────────────────────────────── */}
      {output && (
        <RemovedPanel input={input} output={output} options={opts} />
      )}

      {/* ── Safety notice ────────────────────────────────────── */}
      {opts.removeOptionalTags && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-700">
            <strong>Aggressive mode warning:</strong> Removing optional tags like{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">&lt;html&gt;</code>,{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">&lt;head&gt;</code>,{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">&lt;body&gt;</code> may break some parsers
            and older browsers. Test thoroughly before deploying to production.
          </p>
        </div>
      )}
    </div>
  );
}