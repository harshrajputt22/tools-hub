"use client";

import { useState, useEffect, useRef, Suspense, lazy, Component } from "react";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// DYNAMIC TOOL IMPORTS — lazy loaded per tool
// ============================================================

const toolComponents = {
  // JSON Tools
  "json-formatter":       lazy(() => import("@/tools/json/jsonFormatter")),
  "json-validator":       lazy(() => import("@/tools/json/jsonValidator")),
  "json-minifier":        lazy(() => import("@/tools/json/jsonMinifier")),
  "json-pretty-print":    lazy(() => import("@/tools/json/jsonPrettyPrint")),
  "json-to-csv":          lazy(() => import("@/tools/json/jsonToCsv")),
  "csv-to-json":          lazy(() => import("@/tools/json/csvToJson")),
  "json-to-xml":          lazy(() => import("@/tools/json/jsonToXml")),
  "xml-to-json":          lazy(() => import("@/tools/json/xmlToJson")),
  "json-diff-checker":    lazy(() => import("@/tools/json/jsonDiffChecker")),
  "json-tree-viewer":     lazy(() => import("@/tools/json/jsonTreeViewer")),

  // Encoding
  "base64-encode-decode":    lazy(() => import("@/tools/encoding/base64EncodeDecode")),
  "url-encode-decode":       lazy(() => import("@/tools/encoding/urlEncodeDecode")),
  "html-encode-decode":      lazy(() => import("@/tools/encoding/htmlEncodeDecode")),
  "unicode-encoder-decoder": lazy(() => import("@/tools/encoding/unicodeEncoderDecoder")),
  "ascii-converter":         lazy(() => import("@/tools/encoding/asciiConverter")),
  "binary-to-text":          lazy(() => import("@/tools/encoding/binaryToText")),
  "text-to-binary":          lazy(() => import("@/tools/encoding/textToBinary")),
  "hex-encoder-decoder":     lazy(() => import("@/tools/encoding/hexEncoderDecoder")),

  // Formatters
  "html-formatter":       lazy(() => import("@/tools/formatters/htmlFormatter")),
  "css-formatter":        lazy(() => import("@/tools/formatters/cssFormatter")),
  "javascript-formatter": lazy(() => import("@/tools/formatters/javascriptFormatter")),
  "sql-formatter":        lazy(() => import("@/tools/formatters/sqlFormatter")),
  "xml-formatter":        lazy(() => import("@/tools/formatters/xmlFormatter")),
  "yaml-formatter":       lazy(() => import("@/tools/formatters/yamlFormatter")),

  // Minifiers
  "html-minifier":        lazy(() => import("@/tools/minifiers/htmlMinifier")),
  "css-minifier":         lazy(() => import("@/tools/minifiers/cssMinifier")),
  "javascript-minifier":  lazy(() => import("@/tools/minifiers/javascriptMinifier")),
  "json-minifier-tool":   lazy(() => import("@/tools/minifiers/jsonMinifier")),

  // Regex
  "regex-tester":         lazy(() => import("@/tools/regex/regexTester")),
  "regex-generator":      lazy(() => import("@/tools/regex/regexGenerator")),
  "regex-replace":        lazy(() => import("@/tools/regex/regexReplace")),
  "text-diff-checker":    lazy(() => import("@/tools/regex/textDiffChecker")),
  "text-compare":         lazy(() => import("@/tools/regex/textCompare")),

  // Security
  "md5-hash-generator":      lazy(() => import("@/tools/security/md5HashGenerator")),
  "sha1-hash-generator":     lazy(() => import("@/tools/security/sha1HashGenerator")),
  "sha256-hash-generator":   lazy(() => import("@/tools/security/sha256HashGenerator")),
  "bcrypt-hash-generator":   lazy(() => import("@/tools/security/bcryptHashGenerator")),
  "hmac-generator":          lazy(() => import("@/tools/security/hmacGenerator")),
  "password-hash-generator": lazy(() => import("@/tools/security/passwordHashGenerator")),

  // Web Dev
  "uuid-generator":            lazy(() => import("@/tools/webdev/uuidGenerator")),
  "timestamp-converter":       lazy(() => import("@/tools/webdev/timestampConverter")),
  "cron-expression-generator": lazy(() => import("@/tools/webdev/cronExpressionGenerator")),
  "http-header-checker":       lazy(() => import("@/tools/webdev/httpHeaderChecker")),
  "api-request-tester":        lazy(() => import("@/tools/webdev/apiRequestTester")),
  "jwt-decoder":               lazy(() => import("@/tools/webdev/jwtDecoder")),

  // CSS
  "css-box-shadow-generator":    lazy(() => import("@/tools/css/cssBoxShadowGenerator")),
  "css-gradient-generator":      lazy(() => import("@/tools/css/cssGradientGenerator")),
  "css-border-radius-generator": lazy(() => import("@/tools/css/cssBorderRadiusGenerator")),
  "css-button-generator":        lazy(() => import("@/tools/css/cssButtonGenerator")),
  "flexbox-generator":           lazy(() => import("@/tools/css/flexboxGenerator")),

  // HTML
  "html-table-generator": lazy(() => import("@/tools/html/htmlTableGenerator")),
  "html-entity-encoder":  lazy(() => import("@/tools/html/htmlEntityEncoder")),
  "html-entity-decoder":  lazy(() => import("@/tools/html/htmlEntityDecoder")),

  // Data Conversion
  "json-to-excel": lazy(() => import("@/tools/data-conversion/jsonToExcel")),
  "excel-to-json": lazy(() => import("@/tools/data-conversion/excelToJson")),
  "csv-to-excel":  lazy(() => import("@/tools/data-conversion/csvToExcel")),
  "xml-to-csv":    lazy(() => import("@/tools/data-conversion/xmlToCsv")),
  "yaml-to-json":  lazy(() => import("@/tools/data-conversion/yamlToJson")),
  "json-to-yaml":  lazy(() => import("@/tools/data-conversion/jsonToYaml")),

  // Document Conversion
  "pdf-to-word":  lazy(() => import("@/tools/document-conversion/pdfToWord")),
  "word-to-pdf":  lazy(() => import("@/tools/document-conversion/wordToPdf")),
  "pdf-to-jpg":   lazy(() => import("@/tools/document-conversion/pdfToJpg")),
  "jpg-to-pdf":   lazy(() => import("@/tools/document-conversion/jpgToPdf")),
  "excel-to-pdf": lazy(() => import("@/tools/document-conversion/excelToPdf")),
  "pdf-to-excel": lazy(() => import("@/tools/document-conversion/pdfToExcel")),

  // Misc
  "lorem-ipsum-generator":   lazy(() => import("@/tools/misc/loremIpsumGenerator")),
  "random-string-generator": lazy(() => import("@/tools/misc/randomStringGenerator")),
  "random-color-generator":  lazy(() => import("@/tools/misc/randomColorGenerator")),
  "color-code-converter":    lazy(() => import("@/tools/misc/colorCodeConverter")),
  "favicon-generator":       lazy(() => import("@/tools/misc/faviconGenerator")),
  "url-parser":              lazy(() => import("@/tools/misc/urlParser")),
  "sql-query-generator":     lazy(() => import("@/tools/misc/sqlQueryGenerator")),
};

// ============================================================
// LOADING SKELETON
// ============================================================

function ToolSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <div className="h-8 w-28 bg-gray-200 rounded-lg" />
        <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 bg-gray-200 rounded-xl" />
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

// ============================================================
// COMING SOON — for tools not yet built
// ============================================================

function ComingSoon({ tool }) {
  // Resolve icon string → Lucide component, fallback to wrench SVG
  const ToolIcon = tool?.icon ? getIcon(tool.icon) : null;

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-blue-50 border-2 border-blue-200 rounded-3xl flex items-center justify-center">
          {ToolIcon ? (
            <ToolIcon size={36} className="text-blue-400" />
          ) : (
            // Fallback — wrench SVG instead of 🛠️ emoji
            <svg className="w-9 h-9 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        {tool?.name} — Coming Soon
      </h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        This tool is currently being built. Check back soon.
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        In development
      </div>
    </div>
  );
}

// ============================================================
// ERROR BOUNDARY
// ============================================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Tool render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mb-4">
            {/* ← was: ⚠️ emoji */}
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Tool failed to load
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm">
            {this.state.error?.message || "Something went wrong."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// KEYBOARD SHORTCUT — Ctrl+Enter triggers primary button
// ============================================================

function useKeyboardShortcut() {
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        const btn = document.querySelector("[data-primary='true']");
        if (btn) btn.click();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

// ============================================================
// MAIN TOOL LAYOUT
// ============================================================

export default function ToolLayout({ slug, tool }) {
  useKeyboardShortcut();

  const ToolComponent = toolComponents[slug];

  if (!ToolComponent) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <ComingSoon tool={tool} />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-5 sm:p-6">
      <ErrorBoundary>
        <Suspense fallback={<ToolSkeleton />}>
          <ToolComponent tool={tool} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}