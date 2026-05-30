"use client";

import { useRef, useEffect, useState } from "react";

// ============================================================
// TOOL INPUT
// The left-side input panel used by every text-based tool.
// Handles textarea, paste, file upload, char count,
// clear, and sample data loading.
// ============================================================

export default function ToolInput({
  value = "",
  onChange,
  placeholder = "Paste your input here...",
  label = "Input",
  language = "text",
  rows = 16,
  onClear,
  onSample,
  sampleLabel = "Try Sample",
  maxLength,
  disabled = false,
  autoProcess = false,
  extraActions,
  className = "",
}) {
  const textareaRef = useRef(null);
  const [isFocused,  setIsFocused]  = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Auto-resize textarea ──────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = 560;
    el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [value]);

  // ── Paste from clipboard ──────────────────────────────────
  async function handlePasteClick() {
    try {
      const text = await navigator.clipboard.readText();
      onChange?.(text);
      textareaRef.current?.focus();
    } catch {
      textareaRef.current?.focus();
    }
  }

  // ── Drag and drop ─────────────────────────────────────────
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 2 * 1024 * 1024) return;
      const text = await file.text();
      onChange?.(text);
      return;
    }
    const text = e.dataTransfer.getData("text/plain");
    if (text) onChange?.(text);
  }

  // ── Counts ────────────────────────────────────────────────
  const charCount = value.length;
  const lineCount = value ? value.split("\n").length : 0;
  const showCount = charCount > 0;

  // ── Font class ────────────────────────────────────────────
  const isMono = ["json", "html", "css", "js", "sql", "xml", "yaml"].includes(language);

  return (
    <div className={`flex flex-col gap-0 ${className}`}>

      {/* ── Panel Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {label}
          </span>
          {showCount && (
            <span className="text-xs text-gray-400 tabular-nums">
              {charCount.toLocaleString()} chars
              {lineCount > 1 && ` · ${lineCount.toLocaleString()} lines`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onSample && (
            <button
              onClick={onSample}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Load sample data"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {sampleLabel}
            </button>
          )}

          <button
            onClick={handlePasteClick}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Paste from clipboard"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Paste
          </button>

          {extraActions}

          {value && onClear && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear input"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Textarea ─────────────────────────────────────── */}
      <div
        className="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            if (maxLength && e.target.value.length > maxLength) return;
            onChange?.(e.target.value);
          }}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          rows={rows}
          className={`
            w-full px-4 py-3.5 text-sm leading-relaxed
            border border-gray-200 rounded-b-xl
            outline-none resize-none
            transition-all duration-150
            min-h-[220px]
            ${isMono ? "font-mono" : "font-sans"}
            ${disabled
              ? "bg-gray-50 text-gray-400 cursor-not-allowed"
              : isDragging
              ? "bg-blue-50 border-blue-300 border-dashed"
              : isFocused
              ? "bg-white border-blue-400 ring-2 ring-blue-100 shadow-sm"
              : "bg-white hover:border-gray-300"
            }
          `}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 rounded-b-xl pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-blue-300 border-dashed rounded-xl shadow-sm">
              {/* ← was: 📂 emoji */}
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span className="text-sm font-semibold text-blue-600">
                Drop to load file
              </span>
            </div>
          </div>
        )}

        {/* Max length counter */}
        {maxLength && (
          <div className={`absolute bottom-3 right-3 text-xs tabular-nums pointer-events-none ${charCount > maxLength * 0.9 ? "text-amber-500" : "text-gray-300"}`}>
            {charCount}/{maxLength}
          </div>
        )}
      </div>

      {/* ── Drag hint ────────────────────────────────────── */}
      {!value && (
        <p className="text-xs text-gray-300 text-center mt-1.5">
          You can also drag &amp; drop a file
        </p>
      )}
    </div>
  );
}