import Link from "next/link";
import {
  Lock,
  Zap,
  Globe,
  Accessibility,
  BookOpen,
  Ban,
  Wrench,
  FileText,
  RefreshCw,
  File,
  Shuffle,
  Image,
  Star
} from "lucide-react";

export const metadata = {
  title: "About — DevTools",
  description:
    "Learn about DevTools — a free, open-source collection of 70+ browser-based utilities built for developers. No sign-up. No tracking. No nonsense.",
};

// ── Data ───────────────────────────────────────────────────────
const STATS = [
  { value: "70+", label: "Tools available" },
  { value: "100%", label: "Free forever" },
  { value: "0", label: "Account required" },
  { value: "∞", label: "No usage limits" },
];

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Privacy by default",
    desc: "Everything runs in your browser. Your data never touches our servers — because we don't have any.",
  },
  {
    icon: Zap,
    title: "Fast & lightweight",
    desc: "No bloated frameworks loaded at runtime. Each tool is lazy-loaded only when you open it.",
  },
  {
    icon: Globe,
    title: "Works offline",
    desc: "Once loaded, most tools work without an internet connection. Your workflow, uninterrupted.",
  },
  {
    icon: Accessibility,
    title: "Accessible",
    desc: "Built with semantic HTML, keyboard navigation and sufficient colour contrast throughout.",
  },
  {
    icon: BookOpen,
    title: "Open source",
    desc: "Every line of code is publicly readable. Audit it, fork it, contribute to it — it's yours.",
  },
  {
    icon: Ban,
    title: "No dark patterns",
    desc: "No pop-ups, no newsletter gates, no forced sign-ups, no ads that track you across the web.",
  },
];

const STACK = [
  { name: "Next.js 14", role: "Framework — App Router, SSG, metadata API" },
  { name: "React 18", role: "UI library — concurrent features, lazy loading" },
  { name: "Tailwind CSS", role: "Styling — utility-first, zero runtime CSS" },
  { name: "SheetJS (xlsx)", role: "Excel / spreadsheet read & write" },
  { name: "pdf.js", role: "Client-side PDF parsing & rendering" },
  { name: "jsPDF", role: "PDF generation in the browser" },
  { name: "Mammoth.js", role: ".docx → HTML conversion" },
  { name: "js-yaml", role: "YAML parse & stringify" },
  { name: "fast-xml-parser", role: "XML parsing without a DOM" },
  { name: "PapaParse", role: "CSV parsing with delimiter detection" },
  { name: "docx", role: "Word document generation" },
  { name: "html2canvas", role: "DOM → canvas rendering for PDF export" },
];

const CATEGORIES = [
  { icon: Wrench, name: "CSS Generators", count: 5 },
  { icon: FileText, name: "HTML Tools", count: 3 },
  { icon: RefreshCw, name: "Data Conversion", count: 6 },
  { icon: File, name: "Document Conversion", count: 6 },
  { icon: Shuffle, name: "Misc Utilities", count: 7 },
  { icon: Image, name: "Image Tools", count: 4 },
];

// ── Sub-components ─────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 px-1">
        {children}
      </span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
      {children}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-blue-700 tracking-wide">
              Free & open source
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight mb-5">
            Developer tools that respect <br className="hidden sm:block" />
            <span className="text-blue-600">your time and privacy</span>
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mb-8">
            DevTools is a free, browser-based toolkit built for developers who want fast answers
            without signing up, handing over data, or waiting for a server response.
            Every tool runs entirely in your browser.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              Browse all tools
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────── */}
      <section className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <SectionLabel>Our mission</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-snug">
                Built out of frustration with tools that should just work
              </h2>
              <p className="text-gray-500 leading-relaxed mb-4">
                Every developer has been there — you need to quickly convert a JSON array to Excel,
                generate a random string, or parse a URL...
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(({ icon: Icon, name, count }) => (
                <div
                  key={name}
                  className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <Icon size={20} className="text-blue-600" />
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{name}</p>
                    <p className="text-xs text-gray-400">{count} tools</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Principles ────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <SectionLabel>What we stand for</SectionLabel>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRINCIPLES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-blue-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}