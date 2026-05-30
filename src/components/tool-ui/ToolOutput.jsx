"use client";

import { useState } from "react";
import CopyButton from "./CopyButton";

// ============================================================
// TOOL OUTPUT
// The right-side output panel used by every tool.
// ============================================================

export default function ToolOutput({
  value = "",
  label = "Output",
  language = "text",
  placeholder = "Output will appear here...",
  isLoading = false,
  error = null,
  downloadFilename,
  downloadMimeType = "text/plain",
  extraActions,
  rows = 16,
  className = "",
  successMessage = null,
}) {
  const [wordWrap,      setWordWrap]      = useState(true);
  const [isFullscreen, setIsFullscreen]  = useState(false);

  const isMono = ["json", "html", "css", "js", "sql", "xml", "yaml"].includes(language);

  const charCount = value?.length || 0;
  const lineCount = value ? value.split("\n").length : 0;
  const showStats = charCount > 0;

  function handleDownload() {
    if (!value || !downloadFilename) return;
    const blob = new Blob([value], { type: downloadMimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const fullscreenClass = isFullscreen
    ? "fixed inset-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
    : `flex flex-col gap-0 ${className}`;

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setIsFullscreen(false)} />
      )}

      <div className={fullscreenClass}>

        {/* ── Panel Header ───────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
            {showStats && (
              <span className="text-xs text-gray-400 tabular-nums">
                {charCount.toLocaleString()} chars
                {lineCount > 1 && ` · ${lineCount.toLocaleString()} lines`}
              </span>
            )}
            {isLoading && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing…
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {extraActions}

            {value && (
              <button
                onClick={() => setWordWrap((w) => !w)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  wordWrap ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
                title="Toggle word wrap"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10a4 4 0 010 8H4m0-8v8" />
                </svg>
                Wrap
              </button>
            )}

            {value && downloadFilename && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title={`Download as ${downloadFilename}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
            )}

            {value && <CopyButton text={value} variant="toolbar" />}

            {value && (
              <button
                onClick={() => setIsFullscreen((f) => !f)}
                className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Success Banner ──────────────────────────────── */}
        {successMessage && value && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-x border-green-200 text-xs font-medium text-green-700">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* ── Error Banner ────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-red-50 border-x border-red-200 text-xs text-red-600">
            <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono leading-relaxed">{error}</span>
          </div>
        )}

        {/* ── Output Textarea ─────────────────────────────── */}
        <div className={`relative flex-1 ${isFullscreen ? "overflow-hidden" : ""}`}>
          <textarea
            value={isLoading ? "" : (value || "")}
            readOnly
            rows={isFullscreen ? undefined : rows}
            placeholder={isLoading ? "" : placeholder}
            spellCheck={false}
            className={`
              w-full px-4 py-3.5 text-sm leading-relaxed
              border border-gray-200 rounded-b-xl
              outline-none resize-none bg-gray-50
              text-gray-800 cursor-default select-all
              transition-colors duration-150
              ${isFullscreen ? "h-full" : "min-h-[220px]"}
              ${isMono ? "font-mono" : "font-sans"}
              ${wordWrap ? "whitespace-pre-wrap" : "whitespace-pre overflow-x-auto"}
              ${error ? "border-red-200 bg-red-50/30" : ""}
              ${successMessage && value ? "border-green-200" : ""}
            `}
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 rounded-b-xl gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400">Processing…</p>
            </div>
          )}

          {/* Empty state — ✨ replaced with sparkle SVG */}
          {!isLoading && !value && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <p className="text-xs text-gray-300">{placeholder}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}