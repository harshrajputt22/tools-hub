"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllCategoriesSorted, getCategoryColors } from "@/config/categories";
import { searchTools } from "@/config/tools";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// CONSTANTS
// ============================================================

const SCROLL_THRESHOLD = 12;

// Quick-access nav pills — icon string keys match icon-map
const NAV_PILLS = [
  { slug: "json-formatter",        label: "JSON Formatter", icon: "Braces"          },
  { slug: "json-to-csv",           label: "JSON to CSV",    icon: "Table"           },
  { slug: "base64-encode-decode",  label: "Base64",         icon: "Lock"            },
  { slug: "pdf-to-word",           label: "PDF to Word",    icon: "FileText"        },
  { slug: "json-to-excel",         label: "JSON to Excel",  icon: "FileSpreadsheet" },
];

// ============================================================
// HOOKS
// ============================================================

function useScrolled(threshold = SCROLL_THRESHOLD) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

function useSearchShortcut(onOpen) {
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}

// ============================================================
// SEARCH PANEL
// ============================================================

function SearchPanel({ onClose }) {
  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setActiveIndex(-1); return; }
    setResults(searchTools(q).slice(0, 8));
    setActiveIndex(-1);
  }, [query]);

  function handleKeyDown(e) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const tool = results[activeIndex];
      if (tool) window.location.href = `/tools/${tool.slug}`;
    }
  }

  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const categories = getAllCategoriesSorted();

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="fixed top-[5vh] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4"
        role="dialog" aria-modal="true" aria-label="Search tools">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tools..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery("")} className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <kbd onClick={onClose}
              className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-200 text-gray-500 rounded-md cursor-pointer hover:bg-gray-200 transition-colors">
              Esc
            </kbd>
          </div>

          {/* Results */}
          {query.trim() ? (
            results.length > 0 ? (
              <ul ref={listRef} className="max-h-[380px] overflow-y-auto py-1.5" role="listbox">
                {results.map((tool, i) => {
                  const cat      = categories.find((c) => c.slug === tool.category);
                  const colors   = getCategoryColors(cat?.color || "gray");
                  const isActive = i === activeIndex;
                  const TIcon    = getIcon(tool.icon); // string → component
                  return (
                    <li key={tool.slug} role="option" aria-selected={isActive}>
                      <Link href={`/tools/${tool.slug}`} onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors group ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg}`}>
                          <TIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate ${isActive ? "text-blue-700" : "text-gray-800 group-hover:text-gray-900"}`}>
                            {tool.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">{tool.shortDesc}</div>
                        </div>
                        {cat && (
                          <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {cat.shortName}
                          </span>
                        )}
                        {isActive && (
                          <kbd className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-mono">↵</kbd>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">No tools found</p>
                  <p className="text-xs text-gray-400 mt-0.5">No results for &ldquo;{query}&rdquo;</p>
                </div>
              </div>
            )
          ) : (
            // Default — category grid
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                Browse by category
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map((cat) => {
                  const colors  = getCategoryColors(cat.color);
                  const CatIcon = getIcon(cat.icon); // ✅ string → component
                  return (
                    <Link key={cat.slug} href={`/categories/${cat.slug}`} onClick={onClose}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group hover:bg-gray-50 border border-transparent hover:border-gray-200">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                        <CatIcon size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-700 group-hover:text-gray-900 truncate">
                          {cat.shortName}
                        </div>
                        <div className="text-xs text-gray-400">{cat.toolCount} tools</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono">↵</kbd>
                open
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MEGA DROPDOWN
// ============================================================

function MegaDropdown({ onClose }) {
  const categories = getAllCategoriesSorted();

  return (
    <div className="absolute top-full left-0 mt-2 w-[680px] max-w-[calc(100vw-2rem)]" onMouseLeave={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div>
            <p className="text-sm font-bold text-white">All Tool Categories</p>
          </div>
          <Link href="/categories" onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors">
            View all
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-3 gap-px bg-gray-100">
          {categories.map((cat) => {
            const colors  = getCategoryColors(cat.color);
            const CatIcon = getIcon(cat.icon); //  string → component
            return (
              <Link key={cat.slug} href={`/categories/${cat.slug}`} onClick={onClose}
                className="flex items-start gap-3 p-4 bg-white hover:bg-gray-50 transition-colors group">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border} group-hover:scale-110 transition-transform duration-200`}>
                  <CatIcon size={20} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm font-semibold ${colors.text} group-hover:underline underline-offset-2 truncate`}>
                      {cat.shortName}
                    </span>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${colors.badge}`}>
                      {cat.toolCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-relaxed">{cat.shortDesc}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">All tools are free — no signup required</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MOBILE DRAWER
// ============================================================

function MobileDrawer({ isOpen, onClose }) {
  const categories = getAllCategoriesSorted();
  const pathname   = usePathname();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => { onClose(); }, [pathname]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed top-0 right-0 z-50 h-full w-[320px] max-w-[90vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              {/* ✅ SVG instead of ⚙️ emoji */}
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">DevTools</span>
          </Link>
          <button onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close menu">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* All Tools shortcut */}
          <div className="px-4 py-3 border-b border-gray-100">
            <Link href="/categories" onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                {/* ✅ SVG instead of 🛠️ emoji */}
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <svg className="w-4 h-4 text-blue-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Categories list */}
          <div className="px-4 py-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Categories</p>
            <nav className="space-y-0.5">
              {categories.map((cat) => {
                const colors  = getCategoryColors(cat.color);
                const CatIcon = getIcon(cat.icon); // ✅ string → component
                return (
                  <Link key={cat.slug} href={`/categories/${cat.slug}`} onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                      <CatIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                        {cat.shortName}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{cat.shortDesc}</div>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                      {cat.toolCount}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">All tools free forever</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 font-medium">No signup</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// MAIN NAVBAR
// ============================================================

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen,   setMegaOpen]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled  = useScrolled();
  const pathname  = usePathname();
  const megaRef   = useRef(null);
  const megaTimer = useRef(null);

  const openSearch  = useCallback(() => setSearchOpen(true),  []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useSearchShortcut(openSearch);

  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  function handleMegaEnter() {
    clearTimeout(megaTimer.current);
    setMegaOpen(true);
  }
  function handleMegaLeave() {
    megaTimer.current = setTimeout(() => setMegaOpen(false), 120);
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <header className={`sticky top-0 z-30 w-full transition-all duration-200 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_1px_20px_rgba(0,0,0,0.08)] border-b border-gray-200/80"
          : "bg-white border-b border-gray-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0" aria-label="DevTools home">
              <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  DevTools
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">

              {/* All Tools mega trigger */}
              <div ref={megaRef} className="relative" onMouseEnter={handleMegaEnter} onMouseLeave={handleMegaLeave}>
                <button
                  onClick={() => setMegaOpen((o) => !o)}
                  aria-expanded={megaOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    megaOpen ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  All Tools
                  <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {megaOpen && <MegaDropdown onClose={() => setMegaOpen(false)} />}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-gray-200 mx-1" />

              {/* Quick-access pills — all Lucide icons, no emojis */}
              <div className="hidden lg:flex items-center gap-0.5">
                {NAV_PILLS.map((t) => {
                  const PillIcon = getIcon(t.icon); // ✅ string → component
                  return (
                    <Link
                      key={t.slug}
                      href={`/tools/${t.slug}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive(`/tools/${t.slug}`)
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <PillIcon size={13} className="flex-shrink-0" />
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">

              {/* Search — desktop */}
              <button
                onClick={openSearch}
                aria-label="Search tools (Ctrl+K)"
                className="hidden sm:flex items-center gap-2 pl-3 pr-2 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 hover:border-gray-300 rounded-xl text-sm text-gray-400 transition-all duration-150 group"
              >
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden lg:block text-xs">Search tools...</span>
                <div className="hidden lg:flex items-center gap-0.5 ml-1">
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded text-gray-500">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded text-gray-500">K</kbd>
                </div>
              </button>

              {/* Search — mobile */}
              <button onClick={openSearch} aria-label="Search"
                className="sm:hidden p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Hamburger — mobile */}
              <button onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}
                className="md:hidden p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Active page indicator */}
        {pathname !== "/" && (
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-60" />
        )}
      </header>

      {searchOpen && <SearchPanel onClose={closeSearch} />}
      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}