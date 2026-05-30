"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard } from "@/lib/helpers";

// ============================================================
// TYPE HELPERS
// ============================================================

function getType(value) {
  if (value === null)          return "null";
  if (Array.isArray(value))    return "array";
  return typeof value;
}

function getTypeColor(type) {
  const map = {
    string:  "text-green-600",
    number:  "text-blue-600",
    boolean: "text-amber-600",
    null:    "text-gray-400",
    object:  "text-purple-600",
    array:   "text-orange-500",
  };
  return map[type] || "text-gray-700";
}

function getTypeBadgeColor(type) {
  const map = {
    string:  "bg-green-50 text-green-700 border-green-200",
    number:  "bg-blue-50 text-blue-700 border-blue-200",
    boolean: "bg-amber-50 text-amber-700 border-amber-200",
    null:    "bg-gray-100 text-gray-500 border-gray-200",
    object:  "bg-purple-50 text-purple-700 border-purple-200",
    array:   "bg-orange-50 text-orange-700 border-orange-200",
  };
  return map[type] || "bg-gray-100 text-gray-600 border-gray-200";
}

function displayPrimitive(value) {
  if (value === null)              return "null";
  if (typeof value === "string")   return `"${value}"`;
  if (typeof value === "boolean")  return value ? "true" : "false";
  return String(value);
}

function getSize(value) {
  const type = getType(value);
  if (type === "array")  return `${value.length} item${value.length !== 1 ? "s" : ""}`;
  if (type === "object") {
    const keys = Object.keys(value);
    return `${keys.length} key${keys.length !== 1 ? "s" : ""}`;
  }
  return null;
}

// ============================================================
// SEARCH HELPERS
// ============================================================

function nodeContainsSearch(value, query) {
  if (!query) return true;
  if (typeof value !== "object" || value === null) {
    return String(value).toLowerCase().includes(query.toLowerCase());
  }
  const entries = Array.isArray(value)
    ? value.map((v, i) => [i, v])
    : Object.entries(value);
  return entries.some(([k, v]) =>
    String(k).toLowerCase().includes(query.toLowerCase()) ||
    nodeContainsSearch(v, query)
  );
}

// ============================================================
// TREE NODE COMPONENT
// ============================================================

function TreeNode({ nodeKey, value, depth, isLast, defaultExpanded, searchQuery, onCopyPath }) {
  const type         = getType(value);
  const isExpandable = type === "object" || type === "array";
  const size         = getSize(value);
  const shouldAutoExpand = searchQuery && nodeContainsSearch(value, searchQuery);

  const [expanded, setExpanded] = useState(depth < defaultExpanded || shouldAutoExpand);

  useEffect(() => {
    if (searchQuery && shouldAutoExpand) setExpanded(true);
  }, [searchQuery, shouldAutoExpand]);

  const isMatch = searchQuery &&
    (String(nodeKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
     (type !== "object" && type !== "array" &&
      String(value).toLowerCase().includes(searchQuery.toLowerCase())));

  if (
    searchQuery &&
    !nodeContainsSearch(value, searchQuery) &&
    !String(nodeKey).toLowerCase().includes(searchQuery.toLowerCase())
  ) {
    return null;
  }

  const indent = depth * 20;

  return (
    <div className="select-none">
      <div
        className={`group flex items-start gap-1.5 py-0.5 pr-4 rounded-md transition-colors hover:bg-gray-50 ${
          isMatch ? "bg-yellow-50 hover:bg-yellow-100" : ""
        }`}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {/* Expand / collapse */}
        <button
          onClick={() => isExpandable && setExpanded((v) => !v)}
          className={`flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded transition-colors ${
            isExpandable ? "hover:bg-gray-200 cursor-pointer" : "cursor-default"
          }`}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {isExpandable ? (
            <svg
              width="10"
              height="10"
              className={`text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="w-1 h-1 rounded-full bg-gray-300" />
          )}
        </button>

        {/* Key */}
        {nodeKey !== null && (
          <span className={`text-xs font-mono font-semibold flex-shrink-0 ${isMatch ? "text-amber-700" : "text-purple-700"}`}>
            {typeof nodeKey === "number" ? (
              <span className="text-orange-500">{nodeKey}</span>
            ) : (
              `"${nodeKey}"`
            )}
            <span className="text-gray-400 font-normal">: </span>
          </span>
        )}

        {/* Value or type indicator */}
        {isExpandable ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-xs font-mono text-gray-500">
              {type === "array" ? "[" : "{"}
            </span>
            {!expanded && (
              <>
                <span className="text-xs text-gray-400 italic">{size}</span>
                <span className="text-xs font-mono text-gray-500">
                  {type === "array" ? "]" : "}"}
                </span>
              </>
            )}
            {size && (
              <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${getTypeBadgeColor(type)}`}>
                {size}
              </span>
            )}
          </div>
        ) : (
          <span className={`text-xs font-mono flex-1 min-w-0 break-all ${getTypeColor(type)} ${isMatch ? "bg-yellow-100 rounded px-0.5" : ""}`}>
            {displayPrimitive(value)}
            <span className={`ml-1.5 text-xs px-1 py-0.5 rounded border font-medium ${getTypeBadgeColor(type)}`}>
              {type}
            </span>
          </span>
        )}

        {/* Copy value on hover */}
        <button
          onClick={() => onCopyPath(nodeKey, value)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-500 rounded transition-all"
          title="Copy value"
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Children */}
      {isExpandable && expanded && (
        <div>
          {(Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value))
            .map(([k, v], idx, arr) => (
              <TreeNode
                key={`${k}-${idx}`}
                nodeKey={k}
                value={v}
                depth={depth + 1}
                isLast={idx === arr.length - 1}
                defaultExpanded={defaultExpanded}
                searchQuery={searchQuery}
                onCopyPath={onCopyPath}
              />
            ))}
          <div
            className="text-xs font-mono text-gray-500 py-0.5"
            style={{ paddingLeft: `${8 + indent + 20}px` }}
          >
            {type === "array" ? "]" : "}"}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// STATS BAR
// ============================================================

function TreeStats({ parsed }) {
  function getMaxDepth(val, d = 0) {
    if (typeof val !== "object" || val === null) return d;
    const children = Array.isArray(val) ? val : Object.values(val);
    if (children.length === 0) return d;
    return Math.max(...children.map((c) => getMaxDepth(c, d + 1)));
  }

  function countAll(obj) {
    let strings = 0, numbers = 0, booleans = 0, nulls = 0, objects = 0, arrays = 0, total = 0;
    function walk(v) {
      total++;
      if (v === null)               { nulls++;    return; }
      if (typeof v === "string")    { strings++;  return; }
      if (typeof v === "number")    { numbers++;  return; }
      if (typeof v === "boolean")   { booleans++; return; }
      if (Array.isArray(v))         { arrays++;  v.forEach(walk); return; }
      if (typeof v === "object")    { objects++; Object.values(v).forEach(walk); }
    }
    walk(obj);
    return { strings, numbers, booleans, nulls, objects, arrays, total };
  }

  const stats = countAll(parsed);
  const depth = getMaxDepth(parsed);

  const items = [
    { label: "Strings",  value: stats.strings,  color: "text-green-600"  },
    { label: "Numbers",  value: stats.numbers,  color: "text-blue-600"   },
    { label: "Booleans", value: stats.booleans, color: "text-amber-600"  },
    { label: "Nulls",    value: stats.nulls,    color: "text-gray-500"   },
    { label: "Objects",  value: stats.objects,  color: "text-purple-600" },
    { label: "Arrays",   value: stats.arrays,   color: "text-orange-500" },
    { label: "Depth",    value: depth,          color: "text-indigo-600" },
  ];

  return (
    <div className="flex flex-wrap gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value, color }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className={`font-mono font-bold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function JsonTreeViewer() {
  const [input,       setInput]       = useState("");
  const [parsed,      setParsed]      = useState(null);
  const [error,       setError]       = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandDepth, setExpandDepth] = useState(2);
  const [treeKey,     setTreeKey]     = useState(0);
  const [copyMsg,     setCopyMsg]     = useState(null);
  const searchRef = useRef(null);

  const handleParse = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Input is empty. Please paste valid JSON.");
      setParsed(null);
      return;
    }
    try {
      const result = JSON.parse(trimmed);
      setParsed(result);
      setError(null);
      setTreeKey((k) => k + 1);
    } catch (e) {
      setParsed(null);
      const posMatch = e.message.match(/position (\d+)/i);
      if (posMatch) {
        const pos    = parseInt(posMatch[1], 10);
        const before = trimmed.slice(0, pos);
        const line   = before.split("\n").length;
        const col    = pos - before.lastIndexOf("\n");
        setError(`Parse error at line ${line}, col ${col}: ${e.message}`);
      } else {
        setError(`Parse error: ${e.message}`);
      }
    }
  }, [input]);

  // Auto-parse debounced
  useEffect(() => {
    const t = setTimeout(() => {
      if (input.trim()) handleParse();
    }, 400);
    return () => clearTimeout(t);
  }, [input, handleParse]);

  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleParse();
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && parsed) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleParse, parsed]);

  async function handleCopyPath(key, value) {
    const text = typeof value === "object"
      ? JSON.stringify(value, null, 2)
      : String(value === null ? "null" : value);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopyMsg(`Copied "${key}"`);
      setTimeout(() => setCopyMsg(null), 2000);
    }
  }

  function handleClear() {
    setInput("");
    setParsed(null);
    setError(null);
    setSearchQuery("");
  }

  function handleExpandAll() {
    setExpandDepth(99);
    setTreeKey((k) => k + 1);
  }

  function handleCollapseAll() {
    setExpandDepth(0);
    setTreeKey((k) => k + 1);
  }

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        <button
          onClick={handleParse}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          Visualize JSON
        </button>

        {parsed && (
          <>
            <button
              onClick={handleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg transition-all"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Expand all
            </button>
            <button
              onClick={handleCollapseAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg transition-all"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
              Collapse all
            </button>
          </>
        )}

        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-gray-500">Default depth:</label>
          <select
            value={expandDepth}
            onChange={(e) => { setExpandDepth(Number(e.target.value)); setTreeKey((k) => k + 1); }}
            className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-gray-700 cursor-pointer"
          >
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>{d} {d === 1 ? "level" : "levels"}</option>
            ))}
          </select>
        </div>

        {(input || parsed) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 transition-colors"
          >
            Clear
          </button>
        )}

        {copyMsg && (
          <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            ✓ {copyMsg}
          </span>
        )}
      </div>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Input panel — 2 of 5 cols */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Input</span>
              {input && (
                <span className="text-xs text-gray-400 tabular-nums">
                  {input.length.toLocaleString()} chars
                </span>
              )}
            </div>
            {input && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                parsed
                  ? "bg-green-50 text-green-600 border border-green-200"
                  : "bg-red-50 text-red-500 border border-red-200"
              }`}>
                {parsed ? "✓ Valid" : "✗ Invalid"}
              </span>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Paste JSON to visualize...\n\n{\n  "name": "DevTools",\n  "tools": 70\n}`}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={`flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-t-0 rounded-b-xl outline-none resize-none min-h-[420px] transition-colors placeholder:text-gray-300 placeholder:font-sans ${
              error ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
            }`}
          />
        </div>

        {/* Tree panel — 3 of 5 cols */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tree View</span>

            {parsed && (
              <div className="relative">
                <svg
                  width="12" height="12"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search keys/values..."
                  className="pl-7 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 w-44 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-white">
            {parsed ? (
              <div className="h-full overflow-auto min-h-[420px] py-2">
                <TreeNode
                  key={treeKey}
                  nodeKey={null}
                  value={parsed}
                  depth={0}
                  isLast={true}
                  defaultExpanded={expandDepth}
                  searchQuery={searchQuery}
                  onCopyPath={handleCopyPath}
                />
              </div>
            ) : error ? (
              /* ── Error state — triangle SVG instead of ⚠️ emoji ── */
              <div className="flex flex-col items-center justify-center min-h-[420px] gap-4 p-6">
                <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <div className="text-center max-w-sm">
                  <p className="text-sm font-semibold text-red-700 mb-2">Invalid JSON</p>
                  <p className="text-xs font-mono text-red-500 leading-relaxed break-all">{error}</p>
                </div>
              </div>
            ) : (
              /* ── Empty state — folder SVG instead of 🌳 emoji ── */
              <div className="flex flex-col items-center justify-center min-h-[420px] gap-4">
                <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-400">Paste JSON to visualize</p>
                  <p className="text-xs text-gray-300 mt-1">Tree updates automatically as you type</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {parsed && <TreeStats parsed={parsed} />}

      {parsed && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">Types:</span>
          {["string", "number", "boolean", "null", "object", "array"].map((label) => (
            <span key={label} className={`text-xs px-2 py-0.5 rounded border font-medium ${getTypeBadgeColor(label)}`}>
              {label}
            </span>
          ))}
          <span className="text-xs text-gray-400 ml-auto">Hover any row to copy its value</span>
        </div>
      )}
    </div>
  );
}