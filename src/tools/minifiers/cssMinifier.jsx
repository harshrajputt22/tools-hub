"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard, downloadText } from "@/lib/helpers";
import { ShieldCheck, Sparkles, Rocket } from "lucide-react";
import {
  Target,
  FileText,
  Smartphone,
  Film,
  Wrench,
  Palette,
  Link,
  Type
} from "lucide-react";
import { Minimize2, Package } from "lucide-react";
// ============================================================
// CSS MINIFIER ENGINE
// Pure JS — no external dependency
// Handles: rules, @media, @keyframes, custom properties,
// calc(), var(), gradients, selectors, comments, values
// ============================================================

// ── Value optimizations ───────────────────────────────────────
function optimizeValue(val) {
  if (!val) return val;
  let v = val.trim();

  // 0 unit removal: 0px → 0, 0em → 0, etc.
  v = v.replace(/\b0(px|em|rem|%|pt|pc|ex|ch|vw|vh|vmin|vmax|cm|mm|in|s|ms)\b/g, "0");

  // Leading zero removal: 0.5 → .5
  v = v.replace(/\b0+\.(\d)/g, ".$1");

  // Trailing zeros in decimals: 1.50 → 1.5
  v = v.replace(/(\.\d*?)0+\b/g, "$1").replace(/\.$/, "");

  // Color shorthand: #ffffff → #fff, #aabbcc → #abc
  v = v.replace(/#([0-9a-fA-F]{6})\b/g, (m, hex) => {
    const r = hex[0], g = hex[2], b = hex[4];
    if (hex[0] === hex[1] && hex[2] === hex[3] && hex[4] === hex[5]) {
      return `#${r}${g}${b}`;
    }
    return m;
  });

  // none → 0 for border, outline
  // (skip — too aggressive, context-dependent)

  // Lowercase color keywords
  v = v.replace(
    /\b(red|blue|green|white|black|gray|grey|transparent|inherit|initial|unset|auto|none|normal|bold|italic)\b/gi,
    (m) => m.toLowerCase()
  );

  // font-weight numeric: bold → 700, normal → 400
  // (skip — changes semantics in some contexts)

  // Remove unnecessary quotes from font names
  v = v.replace(/"([a-zA-Z][a-zA-Z0-9 ]+)"/g, (m, name) => {
    // Only remove if no special chars
    if (/^[a-zA-Z][a-zA-Z0-9 ]*$/.test(name) && !name.includes("  ")) {
      return name;
    }
    return m;
  });

  // Normalize gradient whitespace
  if (v.includes("gradient(")) {
    v = v.replace(/\s*,\s*/g, ",").replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")");
    // Re-add needed spaces
    v = v.replace(/\((\S)/g, "($1").replace(/(\S)\)/g, "$1)");
  }

  return v;
}

// ── Selector optimization ─────────────────────────────────────
function optimizeSelector(sel) {
  if (!sel) return sel;

  // Normalize whitespace around combinators
  return sel
    .replace(/\s*>\s*/g, ">")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*~\s*/g, "~")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── String/comment-aware replacer ────────────────────────────
function processOutsideStrings(css, fn) {
  let result    = "";
  let i         = 0;
  let inSingle  = false;
  let inDouble  = false;

  while (i < css.length) {
    const ch = css[i];

    // String handling
    if (ch === "'" && !inDouble) {
      let str = "'";
      i++;
      while (i < css.length && !(css[i] === "'" && css[i - 1] !== "\\")) {
        str += css[i++];
      }
      str += "'"; i++;
      result += str;
      continue;
    }

    if (ch === '"' && !inSingle) {
      let str = '"';
      i++;
      while (i < css.length && !(css[i] === '"' && css[i - 1] !== "\\")) {
        str += css[i++];
      }
      str += '"'; i++;
      result += str;
      continue;
    }

    result += ch;
    i++;
  }

  return fn(result);
}

// ── Core CSS Minifier ─────────────────────────────────────────
function minifyCss(raw, options = {}) {
  const {
    removeComments        = true,
    collapseWhitespace    = true,
    removeLastSemicolon   = true,
    optimizeValues        = true,
    optimizeColors        = true,
    optimizeSelectors     = true,
    removeEmptyRules      = true,
    mergeMediaQueries     = false, // experimental
    level                 = "standard",
  } = options;

  if (!raw || !raw.trim()) {
    return { success: false, output: "", error: "Input is empty." };
  }

  try {
    let css = raw.trim();

    // ── Step 1: Remove comments ─────────────────────────────
    if (removeComments) {
      // Preserve /*! important comments (licenses, banners)
      css = css.replace(/\/\*!([\s\S]*?)\*\//g, "\x00IMPORTANT$1\x00");
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
      css = css.replace(/\x00IMPORTANT([\s\S]*?)\x00/g, "/*!$1*/");
    }

    // ── Step 2: Normalize line endings ──────────────────────
    css = css.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // ── Step 3: Remove whitespace inside rules ───────────────
    if (collapseWhitespace) {
      // Collapse all whitespace (preserve strings)
      css = css
        .replace(/\s+/g, " ")             // collapse multi-space
        .replace(/\s*{\s*/g, "{")         // around {
        .replace(/\s*}\s*/g, "}")         // around }
        .replace(/\s*:\s*/g, ":")         // around :
        .replace(/\s*;\s*/g, ";")         // around ;
        .replace(/\s*,\s*/g, ",")         // around ,
        .replace(/\s*>\s*/g, ">")         // combinator >
        .replace(/\s*\+\s*/g, "+")        // combinator +
        .replace(/\s*~\s*/g, "~");        // combinator ~
    }

    // ── Step 4: Remove last semicolon before } ───────────────
    if (removeLastSemicolon) {
      css = css.replace(/;}/g, "}");
    }

    // ── Step 5: Remove empty rules ───────────────────────────
    if (removeEmptyRules) {
      // Remove rules with no declarations
      css = css.replace(/[^{}]+\{\s*\}/g, "");
      // Remove empty @rules
      css = css.replace(/@[^{]+\{\s*\}/g, "");
    }

    // ── Step 6: Value optimization ───────────────────────────
    if (optimizeValues || optimizeColors) {
      // Process each declaration value
      css = css.replace(/([\w-]+)\s*:\s*([^;{}]+)/g, (match, prop, val) => {
        let optimized = val;
        if (optimizeValues) optimized = optimizeValue(optimized);
        return `${prop}:${optimized}`;
      });
    }

    // ── Step 7: Level-specific optimizations ─────────────────
    if (level === "aggressive") {
      // Remove quotes from url() when safe
      css = css.replace(/url\(['"]([^'")\s]+)['"]\)/g, "url($1)");

      // Collapse to/from in gradients
      css = css.replace(/from\(([^)]+)\)/g, "$1 0%");

      // Shorten 4-value to 2-value when pairs match
      // margin: 10px 20px 10px 20px → margin: 10px 20px
      css = css.replace(
        /(margin|padding)\s*:\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/g,
        (m, prop, t, r, b, l) => {
          if (t === b && r === l) return `${prop}:${t} ${r}`;
          if (t === b) return `${prop}:${t} ${r} ${b} ${l}`;
          if (r === l) return `${prop}:${t} ${r} ${b}`;
          return m;
        }
      );

      // border: none → border:0
      css = css.replace(/border\s*:\s*none\b/gi, "border:0");

      // background: none → background:0 0
      // (skip — too aggressive)

      // Convert named colors to hex where shorter
      const namedToHex = {
        white:  "#fff",
        black:  "#000",
        red:    "#f00",
        lime:   "#0f0",
        blue:   "#00f",
        cyan:   "#0ff",
        yellow: "#ff0",
        magenta:"#f0f",
        silver: "#c0c0c0",
        gray:   "#808080",
        grey:   "#808080",
      };
      css = css.replace(
        /:\s*(white|black|red|lime|blue|cyan|yellow|magenta|silver|gray|grey)\b/gi,
        (m, color) => `:${namedToHex[color.toLowerCase()] || color.toLowerCase()}`
      );
    }

    // ── Step 8: Final cleanup ────────────────────────────────
    css = css
      .replace(/;;+/g, ";")        // double semicolons
      .replace(/\s*\n\s*/g, "")    // remaining newlines
      .trim();

    const saved    = raw.length - css.length;
    const savedPct = Math.round((saved / raw.length) * 100);
    const gzip     = Math.round(css.length * 0.3);

    // Parse stats
    const rules      = (css.match(/[^@][^{]*\{[^}]*\}/g) || []).length;
    const mediaBlocks = (css.match(/@media[^{]+\{/g) || []).length;
    const keyframes  = (css.match(/@keyframes[^{]+\{/g) || []).length;
    const declarations = (css.match(/[\w-]+:[^;{}]+/g) || []).length;

    return {
      success: true,
      output:  css,
      stats: {
        inputLength:   raw.length,
        outputLength:  css.length,
        saved,
        savedPct,
        inputLines:    raw.split("\n").length,
        gzipEstimate:  gzip,
        rules,
        mediaBlocks,
        keyframes,
        declarations,
      },
    };
  } catch (e) {
    return { success: false, output: "", error: `Minification error: ${e.message}` };
  }
}

// ── Multi-file / bundle support ───────────────────────────────
function minifyMultiple(files, options) {
  return files.map((f) => ({
    name:   f.name,
    result: minifyCss(f.content, options),
  }));
}

// ── CSS Analyzer ──────────────────────────────────────────────
function analyzeCss(css) {
  const selectors  = (css.match(/[^{}]+(?=\s*\{)/g) || [])
    .filter((s) => !s.trim().startsWith("@"))
    .length;
  const declarations = (css.match(/[\w-]+\s*:[^;{}]+/g) || []).length;
  const mediaQueries = (css.match(/@media/gi) || []).length;
  const keyframes    = (css.match(/@keyframes/gi) || []).length;
  const variables    = (css.match(/--[\w-]+\s*:/g) || []).length;
  const comments     = (css.match(/\/\*[\s\S]*?\*\//g) || []).length;
  const colors       = new Set(
    (css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || [])
      .map((c) => c.toLowerCase())
  ).size;
  const urls         = (css.match(/url\([^)]+\)/g) || []).length;
  const imports      = (css.match(/@import/gi) || []).length;
  const fonts        = (css.match(/@font-face/gi) || []).length;

  // Property frequency
  const propCounts = {};
  for (const m of (css.match(/(?:^|[;{])\s*([\w-]+)\s*:/gm) || [])) {
    const prop = m.replace(/^[;{]\s*/, "").replace(/:$/, "").trim();
    if (prop && /^[a-z]/.test(prop) && !prop.startsWith("--")) {
      propCounts[prop] = (propCounts[prop] || 0) + 1;
    }
  }
  const topProps = Object.entries(propCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([prop, count]) => ({ prop, count }));

  return {
    selectors, declarations, mediaQueries, keyframes,
    variables, comments, colors, urls, imports, fonts, topProps,
  };
}

// ── Diff breakdown ────────────────────────────────────────────
function buildDiff(original, minified) {
  const commentContent = (original.match(/\/\*[\s\S]*?\*\//g) || []).join("");
  const commentChars   = commentContent.length;
  const wsOriginal     = (original.match(/\s/g) || []).length;
  const wsMinified     = (minified.match(/\s/g) || []).length;
  const wsRemoved      = Math.max(0, wsOriginal - wsMinified);
  const other          = Math.max(0, original.length - minified.length - commentChars - wsRemoved);

  return {
    comments:   commentChars,
    whitespace: wsRemoved,
    other,
    total:      original.length - minified.length,
  };
}

// ============================================================
// CONSTANTS
// ============================================================

const PRESETS = {
  safe: {
    label:              "Safe",
    desc:               "Removes comments and collapses whitespace only",
    icon:               ShieldCheck,
    color:              "text-green-700 bg-green-50 border-green-200",
    ring:               "ring-green-400",
    removeComments:     true,
    collapseWhitespace: true,
    removeLastSemicolon:true,
    optimizeValues:     false,
    optimizeColors:     false,
    optimizeSelectors:  false,
    removeEmptyRules:   false,
    level:              "safe",
  },
  standard: {
    label:              "Standard",
    desc:               "Recommended — safe optimizations + value/color shortening",
    icon:               Sparkles,
    color:              "text-blue-700 bg-blue-50 border-blue-200",
    ring:               "ring-blue-400",
    removeComments:     true,
    collapseWhitespace: true,
    removeLastSemicolon:true,
    optimizeValues:     true,
    optimizeColors:     true,
    optimizeSelectors:  true,
    removeEmptyRules:   true,
    level:              "standard",
  },
  aggressive: {
    label:              "Aggressive",
    desc:               "Maximum savings — shorthand merging, color conversion, url() unquoting",
    icon:               Rocket,
    color:              "text-purple-700 bg-purple-50 border-purple-200",
    ring:               "ring-purple-400",
    removeComments:     true,
    collapseWhitespace: true,
    removeLastSemicolon:true,
    optimizeValues:     true,
    optimizeColors:     true,
    optimizeSelectors:  true,
    removeEmptyRules:   true,
    level:              "aggressive",
  },
};

const SAMPLES = {
  components: `/* ===========================================
   DevTools UI Components
   Version: 2.1.0 | Author: DevTools Team
   =========================================== */

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #111827;
  background-color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Container */
.container {
  max-width: 1280px;
  margin: 0px auto;
  padding: 0px 16px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: all 150ms ease;
  white-space: nowrap;
  user-select: none;
}

.btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.btn--primary {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.btn--primary:hover {
  background-color: #1d4ed8;
  border-color: #1d4ed8;
  transform: translateY(-1px);
  box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.10), 0px 2px 4px -2px rgba(0, 0, 0, 0.10);
}

.btn--primary:active {
  transform: translateY(0px);
  box-shadow: none;
}

.btn--secondary {
  background-color: transparent;
  color: #374151;
  border-color: #d1d5db;
}

.btn--secondary:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.btn--ghost {
  background-color: transparent;
  color: #6b7280;
  border-color: transparent;
}

.btn--ghost:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.btn--sm {
  padding: 6px 12px;
  font-size: 0.75rem;
  border-radius: 6px;
}

.btn--lg {
  padding: 14px 28px;
  font-size: 1rem;
  border-radius: 10px;
}

.btn--full {
  width: 100%;
}

.btn:disabled,
.btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Cards */
.card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
}

.card--hover:hover {
  border-color: #d1d5db;
  box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.10);
  transform: translateY(-2px);
  transition: all 200ms ease;
}

.card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.card__title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0px;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge--blue   { background-color: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.badge--green  { background-color: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.badge--red    { background-color: #fef2f2; color: #b91c1c; border-color: #fecaca; }
.badge--yellow { background-color: #fefce8; color: #a16207; border-color: #fde68a; }
.badge--gray   { background-color: #f9fafb; color: #374151; border-color: #e5e7eb; }`,

  animations: `/* Keyframe Animations */

@keyframes   fadeIn   {
  from   {   opacity: 0.0;   transform: translateY( 8px );   }
  to     {   opacity: 1.0;   transform: translateY( 0px );   }
}

@keyframes   fadeInDown   {
  from   {   opacity: 0.0;   transform: translateY( -20px );   }
  to     {   opacity: 1.0;   transform: translateY( 0px );     }
}

@keyframes   slideInLeft   {
  from   {   opacity: 0.0;   transform: translateX( -100% );  }
  to     {   opacity: 1.0;   transform: translateX( 0% );     }
}

@keyframes   spin   {
  from   {   transform: rotate( 0deg );   }
  to     {   transform: rotate( 360deg ); }
}

@keyframes   pulse   {
  0%, 100%   {   opacity: 1.0;   }
  50%        {   opacity: 0.50;  }
}

@keyframes   bounce   {
  0%, 100%   {   transform: translateY( 0px ); animation-timing-function: cubic-bezier(0.8, 0.0, 1.0, 1.0); }
  50%        {   transform: translateY( -25px ); animation-timing-function: cubic-bezier(0.0, 0.0, 0.2, 1.0); }
}

@keyframes   shimmer   {
  0%     {   background-position: -200% 0;   }
  100%   {   background-position:  200% 0;   }
}

@keyframes   scaleUp   {
  from   {   opacity: 0.0;   transform: scale( 0.95 );   }
  to     {   opacity: 1.0;   transform: scale( 1.00 );   }
}

/* Utility animation classes */
.animate-fade-in        {   animation: fadeIn      300ms ease            both;  }
.animate-fade-in-down   {   animation: fadeInDown  300ms ease            both;  }
.animate-slide-in-left  {   animation: slideInLeft 300ms ease            both;  }
.animate-spin           {   animation: spin        700ms linear infinite;        }
.animate-pulse          {   animation: pulse       2000ms ease-in-out infinite;  }
.animate-bounce         {   animation: bounce      1000ms infinite;               }
.animate-scale-up       {   animation: scaleUp     200ms ease            both;  }

/* Skeleton loader */
.skeleton   {
  background: linear-gradient(
    90deg,
    #f3f4f6  25%,
    #e5e7eb  50%,
    #f3f4f6  75%
  );
  background-size: 200% 100%;
  animation: shimmer 1500ms infinite;
  border-radius: 4px;
}

/* Stagger delays */
.stagger-1   {   animation-delay: 50ms;  }
.stagger-2   {   animation-delay: 100ms; }
.stagger-3   {   animation-delay: 150ms; }
.stagger-4   {   animation-delay: 200ms; }
.stagger-5   {   animation-delay: 250ms; }
.stagger-6   {   animation-delay: 300ms; }

/* Reduced motion */
@media ( prefers-reduced-motion: reduce ) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms  !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms  !important;
  }
}`,

  responsive: `/* ======================
   Responsive Grid System
   ====================== */

/* Custom properties */
:root {
  --grid-cols:   12;
  --grid-gap:    24px;
  --container-sm:  640px;
  --container-md:  768px;
  --container-lg:  1024px;
  --container-xl:  1280px;
  --container-2xl: 1536px;

  /* Spacing scale */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
}

.grid {
  display: grid;
  grid-template-columns: repeat( var(--grid-cols), 1fr );
  gap: var(--grid-gap);
}

.col-1  { grid-column: span 1; }
.col-2  { grid-column: span 2; }
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-6  { grid-column: span 6; }
.col-8  { grid-column: span 8; }
.col-12 { grid-column: span 12; }

@media ( max-width: 1280px ) {
  :root { --grid-gap: 20px; }
  .col-xl-6  { grid-column: span 6; }
  .col-xl-12 { grid-column: span 12; }
}

@media ( max-width: 1024px ) {
  :root { --container-xl: 100%; }
  .col-lg-6  { grid-column: span 6; }
  .col-lg-12 { grid-column: span 12; }
  .hide-lg   { display: none; }
}

@media ( max-width: 768px ) {
  :root { --grid-gap: 16px; }
  .col-md-12   { grid-column: span 12; }
  .col-md-6    { grid-column: span 6; }
  .hide-md     { display: none; }
  .show-md     { display: block; }
}

@media ( max-width: 640px ) {
  :root { --grid-gap: 12px; }
  .col-sm-12 { grid-column: span 12; }
  .hide-sm   { display: none; }
  .show-sm   { display: block; }

  .container {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
}

@media ( prefers-color-scheme: dark ) {
  :root {
    --bg-primary:   #0f172a;
    --bg-secondary: #1e293b;
    --text-primary: #f1f5f9;
    --text-muted:   #94a3b8;
    --border:       #334155;
  }

  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
}`,

  forms: `/* Form Components */

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.form-label--required::after {
  content: " *";
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.5;
  color: #111827;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  appearance: none;
}

.form-control::placeholder {
  color: #9ca3af;
}

.form-control:hover {
  border-color: #9ca3af;
}

.form-control:focus {
  border-color: #2563eb;
  box-shadow: 0px 0px 0px 3px rgba(37, 99, 235, 0.15);
}

.form-control:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.form-control--error {
  border-color: #ef4444;
}

.form-control--error:focus {
  border-color: #ef4444;
  box-shadow: 0px 0px 0px 3px rgba(239, 68, 68, 0.15);
}

.form-control--success {
  border-color: #22c55e;
}

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
}

.form-error {
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 500;
}

/* Checkbox & Radio */
.form-check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.form-check-input {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background-color: #ffffff;
  cursor: pointer;
  appearance: none;
  transition: all 150ms ease;
}

.form-check-input:checked {
  background-color: #2563eb;
  border-color: #2563eb;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
}

.form-check-input[type="radio"] {
  border-radius: 9999px;
}

.form-check-label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

/* Select */
.form-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
  cursor: pointer;
}`,
};

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

function PresetSelector({ active, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Object.entries(PRESETS).map(([key, p]) => {
        const Icon = p.icon; // 👈 same pattern, don’t forget again

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
              active === key
                ? `${p.color} ring-2 shadow-sm`
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Icon size={20} className="flex-shrink-0" />
            <div>
              <p className={`text-sm font-bold ${active === key ? "" : "text-gray-700"}`}>
                {p.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {p.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
// ── Size card ─────────────────────────────────────────────────
function SizeCard({ stats, input, output }) {
  if (!stats || !output) return null;

  const bytesOrig   = new TextEncoder().encode(input).length;
  const bytesMin    = new TextEncoder().encode(output).length;
  const miniPct     = Math.round((stats.outputLength / stats.inputLength) * 100);

  function fmt(b) {
    if (b < 1024) return `${b} B`;
    return `${(b / 1024).toFixed(1)} KB`;
  }

  const diff = buildDiff(input, output);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Size Reduction
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {stats.savedPct}% smaller
        </span>
      </div>

      {/* Bars */}
      <div className="px-5 py-4 space-y-3 bg-white">
        {[
          { label: "Original",   size: stats.inputLength,  bytes: bytesOrig, pct: 100,     bar: "bg-gray-300", tc: "text-gray-600"  },
          { label: "Minified",   size: stats.outputLength, bytes: bytesMin,  pct: miniPct, bar: "bg-green-500",tc: "text-green-600" },
          { label: "~Gzip est.", size: stats.gzipEstimate, bytes: null,      pct: Math.round(stats.gzipEstimate / stats.inputLength * 100), bar: "bg-blue-400", tc: "text-blue-600" },
        ].map(({ label, size, bytes, pct, bar, tc }) => (
          <div key={label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">{label}</span>
              <span className={`font-mono font-bold ${tc}`}>
                {size.toLocaleString()} chars
                {bytes != null && ` · ${fmt(bytes)}`}
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full ${bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Savings breakdown
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: "Comments removed",    value: diff.comments.toLocaleString() + " chars",   color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Whitespace removed",  value: diff.whitespace.toLocaleString() + " chars",  color: "text-blue-600 bg-blue-50 border-blue-200"       },
            { label: "Other optimizations", value: diff.other.toLocaleString() + " chars",       color: "text-purple-600 bg-purple-50 border-purple-200"  },
          ].map(({ label, value, color }) => (
            <div key={label} className={`px-3 py-2.5 rounded-xl border ${color}`}>
              <p className="text-xs font-medium opacity-70">{label}</p>
              <p className="text-sm font-bold font-mono mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100">
        {[
          { label: "Saved chars",   value: stats.saved.toLocaleString()         },
          { label: "Saved bytes",   value: fmt(bytesOrig - bytesMin)             },
          { label: "CSS rules",     value: stats.rules?.toLocaleString()         },
          { label: "Declarations",  value: stats.declarations?.toLocaleString()  },
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

// ── Analysis panel ────────────────────────────────────────────
function AnalysisPanel({ css }) {
  if (!css.trim()) return null;
  const a = analyzeCss(css);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          CSS Analysis
        </span>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
  {[
    { label: "Selectors",    value: a.selectors,    color: "text-blue-600",   icon: Target },
    { label: "Declarations", value: a.declarations, color: "text-green-600",  icon: FileText },
    { label: "Media queries",value: a.mediaQueries, color: "text-purple-600", icon: Smartphone },
    { label: "Keyframes",    value: a.keyframes,    color: "text-orange-600", icon: Film },
    { label: "Variables",    value: a.variables,    color: "text-indigo-600", icon: Wrench },
    { label: "Colors",       value: a.colors,       color: "text-rose-600",   icon: Palette },
    { label: "URLs",         value: a.urls,         color: "text-teal-600",   icon: Link },
    { label: "Font faces",   value: a.fonts,        color: "text-amber-600",  icon: Type },
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

      {/* Top properties chart */}
      {a.topProps.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Most used properties
          </p>
          <div className="space-y-1.5">
            {a.topProps.map(({ prop, count }) => (
              <div key={prop} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-600 w-36 flex-shrink-0 truncate">
                  {prop}
                </span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full"
                    style={{ width: `${Math.min(100, (count / a.topProps[0].count) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Optimization options ──────────────────────────────────────
function OptimizationOptions({ opts, onChange }) {
  const options = [
    {
      key:  "removeComments",
      label:"Remove comments",
      desc: "Strip /* */ block comments (preserves /*! license comments)",
      risk: "safe",
    },
    {
      key:  "collapseWhitespace",
      label:"Collapse whitespace",
      desc: "Remove unnecessary spaces, newlines, and indentation",
      risk: "safe",
    },
    {
      key:  "removeLastSemicolon",
      label:"Remove last semicolon",
      desc: "Strip the trailing ; before each } closing brace",
      risk: "safe",
    },
    {
      key:  "optimizeValues",
      label:"Optimize values",
      desc: "0px → 0, 0.5 → .5, #ffffff → #fff, trailing zeros",
      risk: "safe",
    },
    {
      key:  "optimizeColors",
      label:"Optimize colors",
      desc: "Shorten hex colors and lowercase color keywords",
      risk: "safe",
    },
    {
      key:  "optimizeSelectors",
      label:"Optimize selectors",
      desc: "Normalize whitespace around combinators (>, +, ~)",
      risk: "safe",
    },
    {
      key:  "removeEmptyRules",
      label:"Remove empty rules",
      desc: "Strip rules and @-rules with no declarations",
      risk: "safe",
    },
  ];

  const riskColor = { safe: "text-green-600", caution: "text-amber-600", risky: "text-red-600" };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map(({ key, label, desc, risk }) => (
        <div
          key={key}
          onClick={() => onChange(key, !opts[key])}
          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
            opts[key]
              ? "bg-blue-50 border-blue-200"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}
        >
          <button
            role="switch"
            aria-checked={opts[key]}
            onClick={(e) => { e.stopPropagation(); onChange(key, !opts[key]); }}
            className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none mt-0.5 ${
              opts[key] ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
              opts[key] ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-xs font-semibold ${opts[key] ? "text-blue-800" : "text-gray-700"}`}>
                {label}
              </p>
              <span className={`text-xs font-medium ${riskColor[risk]}`}>
                ({risk})
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Multiple file panel ───────────────────────────────────────
function MultiFilePanel({ opts }) {
  const [files,    setFiles]    = useState([]);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function processFiles(fileList) {
    setLoading(true);
    const loaded = [];
    for (const file of Array.from(fileList)) {
      if (!file.name.endsWith(".css")) continue;
      try {
        const content = await file.text();
        loaded.push({ name: file.name, content, size: file.size });
      } catch {
        loaded.push({ name: file.name, content: "", size: 0, error: "Failed to read file" });
      }
    }
    setFiles(loaded);
    const res = minifyMultiple(loaded, opts);
    setResults(res);
    setLoading(false);
  }

  function fmt(b) {
    if (b < 1024) return `${b} B`;
    return `${(b / 1024).toFixed(1)} KB`;
  }

  const totalSaved = results.reduce((acc, r) => {
    if (r.result.success) acc += r.result.stats.saved;
    return acc;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
        <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="text-xs text-blue-700 leading-relaxed">
          Drop multiple <code className="font-mono font-bold">.css</code> files to minify them all at once.
          Uses the same preset selected in the main tool.
          Results show per-file savings with download links.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => !loading && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 py-14 border-2 border-dashed rounded-xl cursor-pointer transition-all select-none ${
          loading
            ? "border-blue-300 bg-blue-50/50 cursor-default"
            : dragging
            ? "border-blue-400 bg-blue-50 scale-[1.01]"
            : files.length > 0
            ? "border-green-300 bg-green-50/50 hover:border-green-400"
            : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".css"
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) processFiles(e.target.files); }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <svg width="28" height="28" className="animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold text-blue-700">Minifying {files.length} files...</p>
          </div>
        ) : files.length > 0 ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-green-700">
              {files.length} file{files.length !== 1 ? "s" : ""} processed
            </p>
            <p className="text-xs text-green-500 mt-1">
              Total saved: {totalSaved.toLocaleString()} chars · Click to add more files
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
              <svg width="28" height="28" className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-600">
                Drop .css files or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">Multiple files supported</p>
            </div>
          </>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Results — {results.length} file{results.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs font-semibold text-green-600">
              Total saved: {totalSaved.toLocaleString()} chars
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {results.map(({ name, result }) => (
              <div key={name} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">CSS</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-700 truncate">{name}</p>
                  {result.success ? (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {result.stats.inputLength.toLocaleString()} → {result.stats.outputLength.toLocaleString()} chars
                      <span className="ml-2 text-green-600 font-semibold">
                        (-{result.stats.savedPct}%)
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                  )}
                </div>
                {result.success && (
                  <div className="flex items-center gap-1.5">
                    <CopyButton text={result.output} />
                    <button
                      onClick={() => downloadText(result.output, name.replace(".css", ".min.css"), "text/css")}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                    >
                      <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      .min.css
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CssMinifier() {
  const [activeTab,    setActiveTab]    = useState("minify");
  const [input,        setInput]        = useState("");
  const [output,       setOutput]       = useState("");
  const [error,        setError]        = useState(null);
  const [stats,        setStats]        = useState(null);
  const [preset,       setPreset]       = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showLines,    setShowLines]    = useState(false);
  const [autoMinify,   setAutoMinify]   = useState(false);
  const [activeSample, setActiveSample] = useState(null);
  const [opts, setOpts] = useState({ ...PRESETS.standard });

 const TABS = [
  { value: "minify", label: "Minify",      icon: Minimize2 },
  { value: "batch",  label: "Batch files", icon: Package },
];

  function handlePresetChange(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
    if (input.trim() && output) {
      setOutput("");
      setStats(null);
    }
  }

  function handleOptChange(key, value) {
    setOpts((prev) => ({ ...prev, [key]: value }));
    setPreset("custom");
  }

  // ── Process ──────────────────────────────────────────────────
  const handleMinify = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter CSS to minify.");
      setOutput("");
      setStats(null);
      return;
    }

    const result = minifyCss(trimmed, opts);
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
    setInput(SAMPLES[key]); setOutput("");
    setError(null); setStats(null); setActiveSample(key);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars · ${input.split("\n").length} lines` : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  return (
    <div className="space-y-5">

    {/* ── Top tabs ─────────────────────────────────────────── */}
<div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {TABS.map((tab) => {
    const Icon = tab.icon;

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
        <Icon size={16} />
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>

      {/* ── Batch tab ─────────────────────────────────────────── */}
      {activeTab === "batch" && <MultiFilePanel opts={opts} />}

      {/* ── Minify tab ────────────────────────────────────────── */}
      {activeTab === "minify" && (
        <>
          {/* Preset selector */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Minification preset
            </p>
            <PresetSelector active={preset} onChange={handlePresetChange} />
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <button
              onClick={handleMinify}
              data-primary="true"
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Minify CSS
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
            <Toggle
              checked={showAnalysis}
              onChange={setShowAnalysis}
              label="Analysis"
              description="Show CSS analysis panel"
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
              {showAdvanced ? "Hide options" : "Fine-tune"}
            </button>

            {/* Samples */}
            <div className="flex items-center gap-1 ml-auto flex-wrap">
              {[
                { key: "components",  label: "Components" },
                { key: "animations",  label: "Animations" },
                { key: "responsive",  label: "Responsive" },
                { key: "forms",       label: "Forms"      },
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
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↵</kbd>
            </div>
          </div>

          {/* Advanced options */}
          {showAdvanced && (
            <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Individual optimizations
              </p>
              <OptimizationOptions opts={opts} onChange={handleOptChange} />
            </div>
          )}

          {/* Two-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Input */}
            <div className="flex flex-col">
              <PanelHeader
                label="CSS Input"
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
              <div className="flex flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden min-h-[400px]">
                {showLines && input && <LineNumbers text={input} />}
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                  placeholder={`Paste CSS to minify...\n\nSupports:\n• Standard CSS (selectors, properties, values)\n• @media queries and @supports\n• @keyframes animations\n• CSS custom properties (variables)\n• @font-face declarations\n• Calc(), var(), gradients\n• Nested selectors (PostCSS/Sass output)\n• /*! License comments (preserved)`}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white outline-none resize-none min-h-[400px] focus:outline-none transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
                />
              </div>
            </div>

            {/* Output */}
            <div className="flex flex-col">
              <PanelHeader
                label="Minified CSS"
                meta={outputMeta}
                actions={
                  <>
                    {output && <CopyButton text={output} />}
                    {output && (
                      <button
                        onClick={() => downloadText(output, "minified.css", "text/css")}
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
                {output ? (
                  <textarea
                    value={output}
                    readOnly
                    spellCheck={false}
                    className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[400px] text-gray-800 cursor-default select-all whitespace-pre-wrap"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <p className="text-xs text-gray-300">Minified CSS appears here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error */}
          <ErrorBanner message={error} />

          {/* Size card */}
          {stats && output && (
            <SizeCard stats={stats} input={input} output={output} />
          )}

          {/* Analysis */}
          {showAnalysis && input.trim() && (
            <AnalysisPanel css={output || input} />
          )}

          {/* License comment notice */}
          {opts.removeComments && output && output.includes("/*!") && (
            <div className="flex items-start gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
              <svg width="15" height="15" className="flex-shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-xs text-green-700">
                <strong>License comments preserved:</strong> <code className="font-mono bg-green-100 px-1 rounded">/*!...*/</code> comments
                are always kept even with comment removal enabled — required for license attribution.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}