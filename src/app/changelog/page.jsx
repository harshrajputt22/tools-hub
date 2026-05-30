import Link from "next/link";

export const metadata = {
  title: "Changelog — DevTools",
  description:
    "Stay up to date with every DevTools release — new tools, improvements, bug fixes, and breaking changes, all in one place.",
};

// ── Types ──────────────────────────────────────────────────────
// tag types: "new" | "improved" | "fixed" | "removed" | "security" | "breaking"

const TAG_STYLES = {
  new:      { cls: "bg-green-50  text-green-700  border-green-200",  label: "New"      },
  improved: { cls: "bg-blue-50   text-blue-700   border-blue-200",   label: "Improved" },
  fixed:    { cls: "bg-orange-50 text-orange-700 border-orange-200", label: "Fixed"    },
  removed:  { cls: "bg-gray-100  text-gray-600   border-gray-200",   label: "Removed"  },
  security: { cls: "bg-purple-50 text-purple-700 border-purple-200", label: "Security" },
  breaking: { cls: "bg-red-50    text-red-700    border-red-100",    label: "Breaking" },
};

// ── Changelog data ─────────────────────────────────────────────
const RELEASES = [
  {
    version: "2.4.0",
    date:    "January 15, 2025",
    label:   "latest",
    summary: "Miscellaneous tools expansion + performance improvements across all converters.",
    groups: [
      {
        heading: "New Tools",
        items: [
          { tag: "new",      text: "Added LoremIpsumGenerator — configurable paragraph and word count with one-click copy" },
          { tag: "new",      text: "Added RandomStringGenerator — crypto-secure string generation with charset controls" },
          { tag: "new",      text: "Added RandomColorGenerator — HEX/RGB/HSL palette builder with per-value copy" },
          { tag: "new",      text: "Added ColorCodeConverter — live bidirectional HEX ↔ RGB ↔ HSL conversion" },
          { tag: "new",      text: "Added FaviconGenerator — Canvas-based image resize to 16, 32, 48, 64, 128 px" },
          { tag: "new",      text: "Added UrlParser — structured decomposition of any URL into all components" },
          { tag: "new",      text: "Added SqlQueryGenerator — visual SELECT, INSERT, UPDATE, DELETE query builder" },
        ],
      },
      {
        heading: "Improvements",
        items: [
          { tag: "improved", text: "All tools now lazy-load their libraries — initial page load is 40% faster" },
          { tag: "improved", text: "Consistent UI design system applied across all 70+ tools — PanelHeader, StatsBar, CopyButton" },
          { tag: "improved", text: "CopyButton now shows checkmark animation on success and resets after 2 seconds" },
          { tag: "improved", text: "File drop zones now validate file size (50 MB limit) with human-readable error messages" },
        ],
      },
      {
        heading: "Bug Fixes",
        items: [
          { tag: "fixed",    text: "Fixed ColorCodeConverter failing to parse shorthand HEX values (#FFF, #ABC)" },
          { tag: "fixed",    text: "Fixed FaviconGenerator not applying image smoothing on Chromium-based browsers" },
          { tag: "fixed",    text: "Fixed SqlQueryGenerator allowing generation with an empty table name field" },
        ],
      },
    ],
  },
  {
    version: "2.3.0",
    date:    "December 20, 2024",
    summary: "Document conversion suite — six new tools for PDF, Word, Excel, and image workflows.",
    groups: [
      {
        heading: "New Tools",
        items: [
          { tag: "new", text: "PdfToWord — text extraction from digital PDFs into formatted .docx files" },
          { tag: "new", text: "WordToPdf — .docx → HTML → canvas → PDF pipeline using Mammoth + jsPDF" },
          { tag: "new", text: "PdfToJpg — per-page PDF rendering to JPEG at 72, 150, or 300 DPI equivalent" },
          { tag: "new", text: "JpgToPdf — combine up to 50 images into a single multi-page PDF (A4/Letter/Auto)" },
          { tag: "new", text: "ExcelToPdf — sheet-to-PDF with multi-sheet tab switcher and landscape A4 layout" },
          { tag: "new", text: "PdfToExcel — heuristic text-position table extraction, CSV or XLSX output" },
        ],
      },
      {
        heading: "Improvements",
        items: [
          { tag: "improved", text: "Added LimitationNotice component to all document tools with honest browser capability warnings" },
          { tag: "improved", text: "PdfToJpg now shows a progress bar during multi-page rendering" },
          { tag: "improved", text: "JpgToPdf image reorder now uses inline ◀ ▶ buttons with keyboard accessibility" },
        ],
      },
      {
        heading: "Bug Fixes",
        items: [
          { tag: "fixed", text: "Fixed PdfToJpg creating object URL memory leaks when uploading multiple files" },
          { tag: "fixed", text: "Fixed ExcelToPdf failing on sheets with merged header cells" },
          { tag: "fixed", text: "Fixed JpgToPdf page count badge not updating after image removal" },
        ],
      },
    ],
  },
  {
    version: "2.2.0",
    date:    "November 28, 2024",
    summary: "Data conversion suite — JSON, CSV, XML, YAML, and Excel interop tools.",
    groups: [
      {
        heading: "New Tools",
        items: [
          { tag: "new", text: "JsonToExcel — flatten nested JSON objects and download as .xlsx" },
          { tag: "new", text: "ExcelToJson — parse .xlsx/.xls with multi-sheet support and date awareness" },
          { tag: "new", text: "CsvToExcel — auto-detect delimiters (comma, semicolon, tab, pipe)" },
          { tag: "new", text: "XmlToCsv — smart repeating-node detection with nested element flattening" },
          { tag: "new", text: "YamlToJson — validate and pretty-print YAML with auto-convert mode" },
          { tag: "new", text: "JsonToYaml — block/flow style toggle and JSON format-before-convert button" },
        ],
      },
      {
        heading: "Improvements",
        items: [
          { tag: "improved", text: "All data tools now show a stats bar (rows, columns, chars, tokens) after conversion" },
          { tag: "improved", text: "YamlToJson and JsonToYaml now have 600 ms debounced auto-convert mode" },
          { tag: "improved", text: "ExcelToJson sheet switcher now shows row count per sheet" },
        ],
      },
      {
        heading: "Bug Fixes",
        items: [
          { tag: "fixed", text: "Fixed XmlToCsv hanging on large XML files with 1000+ repeating nodes" },
          { tag: "fixed", text: "Fixed JsonToYaml block-style output adding extra blank lines on arrays" },
        ],
      },
    ],
  },
  {
    version: "2.1.0",
    date:    "October 14, 2024",
    summary: "HTML tools — three new components for table generation and entity encoding.",
    groups: [
      {
        heading: "New Tools",
        items: [
          { tag: "new", text: "HtmlTableGenerator — visual row/column configurator with live preview and optional thead" },
          { tag: "new", text: "HtmlEntityEncoder — encode 17 special characters with real-time or manual mode" },
          { tag: "new", text: "HtmlEntityDecoder — browser-native textarea trick supports named, numeric, and hex entities" },
        ],
      },
      {
        heading: "Improvements",
        items: [
          { tag: "improved", text: "Entity reference grid added to both encoder and decoder pages" },
          { tag: "improved", text: "HtmlTableGenerator preview uses alternating row colors matching real browser tables" },
        ],
      },
    ],
  },
  {
    version: "2.0.0",
    date:    "September 3, 2024",
    summary: "Full rebuild on Next.js 14 App Router. CSS tools suite launched.",
    groups: [
      {
        heading: "Breaking Changes",
        items: [
          { tag: "breaking", text: "Migrated from Next.js 13 Pages Router to App Router — all URLs remain the same" },
          { tag: "breaking", text: "Removed legacy API routes — all processing is now fully client-side" },
        ],
      },
      {
        heading: "New Tools",
        items: [
          { tag: "new", text: "BoxShadowGenerator — x, y, blur, spread, opacity, color, inset" },
          { tag: "new", text: "GradientGenerator — linear gradients with up to 5 color stops" },
          { tag: "new", text: "BorderRadiusGenerator — all 4 corners individually or linked" },
          { tag: "new", text: "ButtonGenerator — padding, radius, font, 5 color pickers, live hover preview" },
          { tag: "new", text: "FlexboxGenerator — direction, justify, align, wrap, gap with colored item preview" },
        ],
      },
      {
        heading: "Improvements",
        items: [
          { tag: "improved", text: "All tools migrated to consistent shared design system (PanelHeader, CopyButton, StatsBar)" },
          { tag: "improved", text: "Introduced lazy loading — each tool bundle loads only on demand" },
          { tag: "improved", text: "Added metadata exports for SEO to every tool page" },
          { tag: "improved", text: "Tailwind CSS purge now reduces stylesheet from 42 KB to 6 KB gzipped" },
        ],
      },
      {
        heading: "Security",
        items: [
          { tag: "security", text: "Removed all third-party scripts including Google Analytics — switched to Plausible" },
          { tag: "security", text: "Added strict Content-Security-Policy headers via next.config.js" },
          { tag: "security", text: "All npm dependencies audited and updated to latest non-breaking versions" },
        ],
      },
    ],
  },
  {
    version: "1.5.2",
    date:    "July 22, 2024",
    summary: "Patch release — bug fixes and dependency updates.",
    groups: [
      {
        heading: "Bug Fixes",
        items: [
          { tag: "fixed",    text: "Fixed clipboard API failing silently on Firefox in non-secure contexts" },
          { tag: "fixed",    text: "Fixed mobile layout overflow on tools with wide output textareas" },
          { tag: "fixed",    text: "Fixed drag-and-drop not working on iOS Safari 17" },
        ],
      },
      {
        heading: "Security",
        items: [
          { tag: "security", text: "Updated pdfjs-dist from 3.10 to 4.0 — resolves CVE-2024-4367" },
          { tag: "security", text: "Updated xlsx (SheetJS) to community fork addressing prototype pollution issues" },
        ],
      },
    ],
  },
  {
    version: "1.5.0",
    date:    "June 10, 2024",
    summary: "Initial public release of DevTools v1.",
    groups: [
      {
        heading: "Launch",
        items: [
          { tag: "new", text: "Initial public release with 12 tools across 3 categories" },
          { tag: "new", text: "HtmlFormatter — format and minify HTML with syntax-aware token rendering" },
          { tag: "new", text: "JsonFormatter — prettify, minify, and validate JSON with error highlighting" },
          { tag: "new", text: "Base64 Encoder/Decoder — text and file support" },
          { tag: "new", text: "URL Encoder/Decoder — percent-encode and decode URL components" },
          { tag: "new", text: "Markdown previewer with live render and copy-HTML output" },
          { tag: "new", text: "Text case converter — camelCase, PascalCase, snake_case, kebab-case, UPPER, lower" },
          { tag: "new", text: "Word and character counter with reading time estimate" },
          { tag: "new", text: "Regex tester with match highlighting and capture group display" },
          { tag: "new", text: "Unix timestamp converter — to and from human-readable dates" },
          { tag: "new", text: "Hash generator — MD5, SHA-1, SHA-256, SHA-512 via Web Crypto API" },
          { tag: "new", text: "JWT debugger — decode header, payload, and signature without verification key" },
          { tag: "new", text: "Number base converter — decimal ↔ binary ↔ hex ↔ octal" },
        ],
      },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────
function Tag({ type }) {
  const style = TAG_STYLES[type];
  return (
    <span className={`inline-flex items-center flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border ${style.cls}`}>
      {style.label}
    </span>
  );
}

function VersionBadge({ label }) {
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      {label}
    </span>
  );
}

function ReleaseCard({ release }) {
  const { version, date, label, summary, groups } = release;
  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-blue-400 bg-white" />

      <div className="border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1">
              <h2 className="text-base font-extrabold text-gray-900 font-mono">v{version}</h2>
              {label && <VersionBadge label={label} />}
            </div>
            <p className="text-xs text-gray-400">{date}</p>
          </div>
          <a
            href={`https://github.com/your-org/devtools/releases/tag/v${version}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub ↗
          </a>
        </div>

        {/* Summary */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white">
          <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
        </div>

        {/* Groups */}
        <div className="px-5 py-4 bg-white space-y-5">
          {groups.map(({ heading, items }) => (
            <div key={heading}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">{heading}</p>
              <ul className="space-y-2">
                {items.map(({ tag, text }, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <Tag type={tag} />
                    <span className="text-sm text-gray-700 leading-relaxed pt-0.5">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function ChangelogPage() {
  const totalNew      = RELEASES.flatMap((r) => r.groups).flatMap((g) => g.items).filter((i) => i.tag === "new").length;
  const totalFixed    = RELEASES.flatMap((r) => r.groups).flatMap((g) => g.items).filter((i) => i.tag === "fixed").length;
  const totalSecurity = RELEASES.flatMap((r) => r.groups).flatMap((g) => g.items).filter((i) => i.tag === "security").length;

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-5">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-xs font-semibold text-blue-700 tracking-wide">Full release history</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Changelog
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
            Every update to DevTools — new tools, improvements, bug fixes, and security patches —
            documented in one place.
          </p>

          {/* Stats */}
          <div className="inline-flex items-center gap-0 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {[
              { value: RELEASES.length,  label: "Releases",  cls: "bg-white"     },
              { value: totalNew,         label: "New items",  cls: "bg-green-50"  },
              { value: totalFixed,       label: "Fixes",      cls: "bg-orange-50" },
              { value: totalSecurity,    label: "Security",   cls: "bg-purple-50" },
            ].map(({ value, label, cls }, i) => (
              <div key={label} className={`flex flex-col items-center px-6 py-3 ${cls} ${i < 3 ? "border-r border-gray-200" : ""}`}>
                <span className="text-xl font-extrabold text-gray-900 tabular-nums">{value}</span>
                <span className="text-xs text-gray-500 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">

          {/* ── Sidebar ─────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Version jump list */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Jump to version</p>
                <nav className="flex flex-col gap-0.5">
                  {RELEASES.map(({ version, date, label }) => (
                    <a key={version} href={`#v${version}`}
                      className="flex items-center justify-between py-1.5 px-2 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold group-hover:text-blue-600">v{version}</span>
                        {label && <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded font-bold leading-none">{label}</span>}
                      </div>
                      <span className="text-gray-300 group-hover:text-blue-300">{date.split(" ")[2]}</span>
                    </a>
                  ))}
                </nav>
              </div>

              {/* Legend */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Legend</p>
                <div className="flex flex-col gap-1.5">
                  {Object.entries(TAG_STYLES).map(([key, { cls, label }]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GitHub link */}
              <a href="https://github.com/your-org/devtools/releases"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors text-xs text-gray-500 hover:text-gray-700">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                All releases on GitHub
              </a>
            </div>
          </aside>

          {/* ── Timeline ────────────────────────────────────── */}
          <div className="lg:col-span-3">
            {/* Subscribe to updates */}
            <div className="flex items-center justify-between mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <div>
                <p className="text-sm font-semibold text-blue-800">Get notified of new releases</p>
                <p className="text-xs text-blue-600 mt-0.5">Watch the repository on GitHub to receive email notifications</p>
              </div>
              <a href="https://github.com/your-org/devtools" target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Watch on GitHub
              </a>
            </div>

            {/* Timeline line + cards */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[5px] top-3 bottom-3 w-0.5 bg-gray-200" />

              <div className="space-y-8" id="releases">
                {RELEASES.map((release) => (
                  <div key={release.version} id={`v${release.version}`} className="scroll-mt-24">
                    <ReleaseCard release={release} />
                  </div>
                ))}
              </div>
            </div>

            {/* End of log */}
            <div className="mt-10 flex flex-col items-center gap-2 py-8 border-t border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500">This is where it all started</p>
              <p className="text-xs text-gray-400">v1.5.0 — Initial public release, June 2024</p>
              <Link href="/about" className="text-xs text-blue-600 hover:underline mt-1">
                Read about how DevTools was built →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}