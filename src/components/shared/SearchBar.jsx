"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchTools } from "@/config/tools";
import { getCategoryBySlug, getCategoryColors, getAllCategoriesSorted } from "@/config/categories";

// ============================================================
// DESIGN SYSTEM — SearchBar Component
//
// Aesthetic direction: Command-palette precision.
// The search bar is the fastest path to any tool.
// Three modes handle every context:
//
// MODES:
//   inline    — Embedded in a page (homepage, categories page).
//               Shows results in a dropdown below.
//               Full-width, prominent, always visible.
//
//   modal     — Floating command-palette triggered by Ctrl+K.
//               Used by Navbar. Backdrop + centered panel.
//
//   compact   — Small toolbar search. Fits in tight spaces.
//               Expands on focus, collapses on blur.
//
// FEATURES:
//   • Live results as you type (debounced 120ms)
//   • Keyboard navigation (↑↓ to move, Enter to open)
//   • Recent searches (localStorage)
//   • Category filter pills
//   • Empty state with popular tools
//   • Zero-results state with suggestions
//   • Escape to clear / close
//   • Click outside to close
//   • Highlighted query match in results
// ============================================================

// ── Constants ─────────────────────────────────────────────────
const MAX_RESULTS     = 8;
const MAX_RECENT      = 5;
const RECENT_KEY      = "devtools_recent_searches";
const DEBOUNCE_MS     = 120;

// ── Popular tools shown in empty state ───────────────────────
const POPULAR_TOOLS = [
  { slug: "json-formatter",         name: "JSON Formatter",       icon: "🧩" },
  { slug: "base64-encode-decode",   name: "Base64 Encode/Decode", icon: "🔐" },
  { slug: "regex-tester",           name: "Regex Tester",         icon: "🔍" },
  { slug: "md5-hash-generator",     name: "MD5 Hash",             icon: "🔒" },
  { slug: "jwt-decoder",            name: "JWT Decoder",          icon: "🔓" },
  { slug: "uuid-generator",         name: "UUID Generator",       icon: "🎲" },
  { slug: "timestamp-converter",    name: "Timestamp",            icon: "⏰" },
  { slug: "css-gradient-generator", name: "CSS Gradient",         icon: "🌈" },
];

// ============================================================
// HOOKS
// ============================================================

// ── Debounce hook ─────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Recent searches hook ──────────────────────────────────────
function useRecentSearches() {
  const [recent, setRecent] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecent(JSON.parse(stored));
    } catch {}
  }, []);

  function addRecent(query) {
    if (!query.trim()) return;
    setRecent((prev) => {
      const next = [
        query.trim(),
        ...prev.filter((q) => q !== query.trim()),
      ].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  }

  return { recent, addRecent, clearRecent };
}

// ── Click outside hook ────────────────────────────────────────
function useClickOutside(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    }
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Query highlight ───────────────────────────────────────────
// Wraps matching characters in a highlight span
function Highlight({ text, query }) {
  if (!query.trim()) return <span>{text}</span>;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-blue-100 text-blue-800 rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

// ── Search result item ────────────────────────────────────────
function ResultItem({ tool, query, isActive, onSelect, onMouseEnter }) {
  const category = getCategoryBySlug(tool.category);
  const colors   = getCategoryColors(category?.color || "gray");
  const ref      = useRef(null);

  // Scroll active item into view
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isActive]);

  return (
    <li ref={ref} role="option" aria-selected={isActive}>
      <Link
        href={`/tools/${tool.slug}`}
        onClick={() => onSelect(tool)}
        onMouseEnter={onMouseEnter}
        className={`
          flex items-center gap-3 px-4 py-3
          transition-colors duration-100
          ${isActive ? "bg-blue-50" : "hover:bg-gray-50"}
        `}
      >
        {/* Icon */}
        <div className={`
          flex-shrink-0 w-9 h-9 rounded-xl
          flex items-center justify-center text-lg
          ${colors.bg} border ${colors.border}
        `}>
          {tool.icon}
        </div>

        {/* Name + desc */}
        <div className="flex-1 min-w-0">
          <div className={`
            text-sm font-semibold truncate
            ${isActive ? "text-blue-700" : "text-gray-800"}
          `}>
            <Highlight text={tool.name} query={query} />
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {tool.shortDesc}
          </div>
        </div>

        {/* Category badge */}
        {category && (
          <span className={`
            flex-shrink-0 hidden sm:inline-flex
            text-xs font-medium px-2 py-0.5
            rounded-full ${colors.badge}
          `}>
            {category.icon} {category.shortName}
          </span>
        )}

        {/* Enter hint */}
        {isActive && (
          <kbd className="
            flex-shrink-0 text-xs px-1.5 py-0.5
            bg-blue-100 text-blue-600
            rounded font-mono
          ">
            ↵
          </kbd>
        )}
      </Link>
    </li>
  );
}

// ── Recent searches list ──────────────────────────────────────
function RecentSearches({ recent, onSelect, onClear }) {
  if (recent.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Recent
        </p>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recent.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="
              inline-flex items-center gap-1.5
              px-2.5 py-1 rounded-lg
              text-xs font-medium
              bg-gray-100 text-gray-600
              hover:bg-gray-200 hover:text-gray-800
              transition-colors
            "
          >
            <svg
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Popular tools grid ────────────────────────────────────────
function PopularTools({ onSelect }) {
  return (
    <div className="p-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Popular tools
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {POPULAR_TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            onClick={() => onSelect(tool.name)}
            className="
              flex items-center gap-2.5 px-3 py-2.5
              rounded-xl bg-gray-50 border border-gray-100
              hover:bg-blue-50 hover:border-blue-100
              transition-all group
            "
          >
            <span className="text-base flex-shrink-0">{tool.icon}</span>
            <span className="
              text-xs font-semibold text-gray-700
              group-hover:text-blue-700
              truncate transition-colors
            ">
              {tool.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Category filter pills ─────────────────────────────────────
function CategoryPills({ active, onChange }) {
  const categories = getAllCategoriesSorted();

  return (
    <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100">
      {/* All pill */}
      <button
        onClick={() => onChange(null)}
        className={`
          flex-shrink-0 px-3 py-1.5 rounded-full
          text-xs font-semibold transition-all
          ${!active
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }
        `}
      >
        All
      </button>

      {categories.map((cat) => {
        const colors  = getCategoryColors(cat.color);
        const isActive = active === cat.slug;
        return (
          <button
            key={cat.slug}
            onClick={() => onChange(isActive ? null : cat.slug)}
            className={`
              flex-shrink-0 flex items-center gap-1.5
              px-3 py-1.5 rounded-full
              text-xs font-semibold transition-all
              ${isActive
                ? `${colors.bg} ${colors.text} ${colors.border} border`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }
            `}
          >
            <span className="text-xs">{cat.icon}</span>
            {cat.shortName}
          </button>
        );
      })}
    </div>
  );
}

// ── Zero results state ────────────────────────────────────────
function ZeroResults({ query }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
      <div className="
        w-14 h-14 bg-gray-100 rounded-2xl
        flex items-center justify-center text-3xl
      ">
        🔍
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">
          No tools found
        </p>
        <p className="text-xs text-gray-400 mt-1">
          No results for &ldquo;<span className="font-medium text-gray-600">{query}</span>&rdquo;
        </p>
      </div>
      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
        Try a shorter search or browse by category
      </p>
      <Link
        href="/categories"
        className="
          inline-flex items-center gap-1.5
          px-4 py-2 text-xs font-semibold
          bg-blue-50 text-blue-700
          border border-blue-200
          rounded-xl hover:bg-blue-100
          transition-colors
        "
      >
        Browse all categories
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ── Keyboard hint footer ──────────────────────────────────────
function KeyboardHints({ resultCount }) {
  return (
    <div className="
      flex items-center justify-between
      px-4 py-2.5
      border-t border-gray-100
      bg-gray-50/80
    ">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm">↑</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm">↓</kbd>
          <span>navigate</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm">↵</kbd>
          <span>open</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono shadow-sm">Esc</kbd>
          <span>close</span>
        </span>
      </div>
      {resultCount > 0 && (
        <span className="text-xs text-gray-400">
          {resultCount} result{resultCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ── Search input ──────────────────────────────────────────────
function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  inputRef,
  size = "md",
  autoFocus = false,
  onKeyDown,
}) {
  const heights = {
    sm: "h-10 text-sm px-4",
    md: "h-12 text-sm px-5",
    lg: "h-14 text-base px-5",
  };

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <svg
        className="absolute left-4 w-4 h-4 text-gray-400 pointer-events-none flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={!!value}
        className={`
          w-full pl-10 pr-10
          ${heights[size]}
          bg-transparent
          text-gray-900 placeholder-gray-400
          outline-none
          transition-colors
        `}
      />

      {/* Clear button */}
      {value && (
        <button
          onClick={onClear}
          className="
            absolute right-3 p-1.5
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100 rounded-lg
            transition-colors
          "
          aria-label="Clear search"
          tabIndex={-1}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Results dropdown ──────────────────────────────────────────
function ResultsPanel({
  query,
  results,
  activeIndex,
  setActiveIndex,
  onSelect,
  recent,
  onRecentSelect,
  onRecentClear,
  showCategories,
  activeCategory,
  onCategoryChange,
  mode,
}) {
  const hasQuery   = query.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <div
      className={`
        bg-white border border-gray-200 overflow-hidden
        ${mode === "inline"
          ? "absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-xl z-40"
          : mode === "compact"
          ? "absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-40 min-w-[320px]"
          : ""
        }
      `}
      role="listbox"
    >
      {/* Category filter pills — shown when there are results */}
      {hasQuery && hasResults && showCategories && (
        <CategoryPills
          active={activeCategory}
          onChange={onCategoryChange}
        />
      )}

      {/* Recent searches — shown when no query */}
      {!hasQuery && (
        <RecentSearches
          recent={recent}
          onSelect={onRecentSelect}
          onClear={onRecentClear}
        />
      )}

      {/* Results list */}
      {hasQuery && hasResults && (
        <ul className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
          {results.map((tool, i) => (
            <ResultItem
              key={tool.slug}
              tool={tool}
              query={query}
              isActive={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onSelect={(t) => onSelect(t.name)}
            />
          ))}
        </ul>
      )}

      {/* Zero results */}
      {hasQuery && !hasResults && <ZeroResults query={query} />}

      {/* Popular tools — shown when no query */}
      {!hasQuery && <PopularTools onSelect={onRecentSelect} />}

      {/* Keyboard hints */}
      <KeyboardHints resultCount={hasResults ? results.length : 0} />
    </div>
  );
}

// ============================================================
// INLINE MODE
// Full-width search bar embedded in a page
// ============================================================

function InlineSearch({
  placeholder = "Search 70+ developer tools...",
  showCategories = true,
  autoFocus = false,
  size = "md",
  className = "",
}) {
  const [query, setQuery]               = useState("");
  const [open, setOpen]                 = useState(false);
  const [results, setResults]           = useState([]);
  const [activeIndex, setActiveIndex]   = useState(-1);
  const [activeCategory, setActiveCategory] = useState(null);
  const debouncedQuery                  = useDebounce(query, DEBOUNCE_MS);
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const inputRef                        = useRef(null);
  const containerRef                    = useRef(null);
  const router                          = useRouter();

  useClickOutside(containerRef, () => setOpen(false));

  // Run search when debounced query changes
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    let res = searchTools(q);
    if (activeCategory) {
      res = res.filter((t) => t.category === activeCategory);
    }
    setResults(res.slice(0, MAX_RESULTS));
    setActiveIndex(-1);
  }, [debouncedQuery, activeCategory]);

  function handleKeyDown(e) {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          const tool = results[activeIndex];
          addRecent(query);
          router.push(`/tools/${tool.slug}`);
          setOpen(false);
          setQuery("");
        }
        break;
      case "Escape":
        if (query) {
          setQuery("");
          setResults([]);
        } else {
          setOpen(false);
        }
        break;
    }
  }

  function handleSelect(name) {
    addRecent(name);
    setOpen(false);
    setQuery("");
  }

  // Heights for the input wrapper
  const wrapperHeights = {
    sm: "rounded-xl border border-gray-200 shadow-sm",
    md: "rounded-2xl border border-gray-300 shadow-md",
    lg: "rounded-2xl border border-gray-300 shadow-lg",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input wrapper */}
      <div className={`
        bg-white overflow-hidden
        transition-all duration-200
        focus-within:border-blue-400
        focus-within:shadow-lg focus-within:shadow-blue-100/50
        ${wrapperHeights[size]}
      `}>
        <SearchInput
          value={query}
          onChange={(v) => { setQuery(v); setOpen(true); }}
          onClear={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
          placeholder={placeholder}
          inputRef={inputRef}
          size={size}
          autoFocus={autoFocus}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <ResultsPanel
          query={query}
          results={results}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onSelect={handleSelect}
          recent={recent}
          onRecentSelect={(q) => { setQuery(q); inputRef.current?.focus(); }}
          onRecentClear={clearRecent}
          showCategories={showCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          mode="inline"
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL MODE
// Full command-palette overlay
// ============================================================

function ModalSearch({ onClose, placeholder = "Search 70+ developer tools..." }) {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [activeIndex, setActiveIndex]   = useState(-1);
  const [activeCategory, setActiveCategory] = useState(null);
  const debouncedQuery                  = useDebounce(query, DEBOUNCE_MS);
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const inputRef                        = useRef(null);
  const router                          = useRouter();
  const pathname                        = usePathname();

  // Close on route change
  useEffect(() => { onClose(); }, [pathname]);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Run search
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      setActiveIndex(-1);
      return;
    }
    let res = searchTools(q);
    if (activeCategory) {
      res = res.filter((t) => t.category === activeCategory);
    }
    setResults(res.slice(0, MAX_RESULTS));
    setActiveIndex(-1);
  }, [debouncedQuery, activeCategory]);

  function handleKeyDown(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          const tool = results[activeIndex];
          addRecent(query);
          router.push(`/tools/${tool.slug}`);
          onClose();
        }
        break;
      case "Escape":
        if (query) {
          setQuery("");
          setResults([]);
        } else {
          onClose();
        }
        break;
    }
  }

  function handleSelect(name) {
    addRecent(name);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="
          fixed inset-0 z-50
          bg-black/50 backdrop-blur-sm
          transition-opacity duration-200
        "
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="
          fixed top-[8vh] left-1/2 -translate-x-1/2
          z-50 w-full max-w-xl px-4
        "
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
      >
        <div className="
          bg-white rounded-2xl shadow-2xl
          border border-gray-200 overflow-hidden
        ">
          {/* Input row */}
          <div className="border-b border-gray-100">
            <SearchInput
              value={query}
              onChange={setQuery}
              onClear={() => { setQuery(""); setResults([]); }}
              placeholder={placeholder}
              inputRef={inputRef}
              size="md"
              autoFocus
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Results panel */}
          <ResultsPanel
            query={query}
            results={results}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            onSelect={handleSelect}
            recent={recent}
            onRecentSelect={(q) => setQuery(q)}
            onRecentClear={clearRecent}
            showCategories
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            mode="modal"
          />
        </div>
      </div>
    </>
  );
}

// ============================================================
// COMPACT MODE
// Small inline search that expands on focus
// ============================================================

function CompactSearch({
  placeholder = "Search tools...",
  className = "",
}) {
  const [query, setQuery]             = useState("");
  const [open, setOpen]               = useState(false);
  const [focused, setFocused]         = useState(false);
  const [results, setResults]         = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery                = useDebounce(query, DEBOUNCE_MS);
  const { recent, addRecent, clearRecent } = useRecentSearches();
  const inputRef                      = useRef(null);
  const containerRef                  = useRef(null);
  const router                        = useRouter();

  useClickOutside(containerRef, () => {
    setOpen(false);
    setFocused(false);
  });

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) { setResults([]); return; }
    setResults(searchTools(q).slice(0, 6));
    setActiveIndex(-1);
  }, [debouncedQuery]);

  function handleKeyDown(e) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          addRecent(query);
          router.push(`/tools/${results[activeIndex].slug}`);
          setOpen(false);
          setQuery("");
        }
        break;
      case "Escape":
        setQuery("");
        setResults([]);
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`
        flex items-center gap-2
        bg-gray-100 border rounded-xl
        transition-all duration-200
        ${focused
          ? "border-blue-400 bg-white shadow-md shadow-blue-100/50 w-72"
          : "border-transparent w-48 hover:bg-gray-200"
        }
      `}>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="
            flex-1 py-2 pr-3 text-xs
            bg-transparent text-gray-800
            placeholder-gray-400 outline-none
          "
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            className="mr-2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Compact dropdown */}
      {open && focused && (
        <ResultsPanel
          query={query}
          results={results}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          onSelect={(name) => { addRecent(name); setOpen(false); setQuery(""); }}
          recent={recent}
          onRecentSelect={(q) => { setQuery(q); inputRef.current?.focus(); }}
          onRecentClear={clearRecent}
          showCategories={false}
          activeCategory={null}
          onCategoryChange={() => {}}
          mode="compact"
        />
      )}
    </div>
  );
}

// ============================================================
// MAIN EXPORT — SearchBar
// ============================================================

export default function SearchBar({
  // Mode
  mode = "inline",          // "inline" | "modal" | "compact"

  // Inline + compact props
  placeholder,
  showCategories = true,
  autoFocus = false,
  size = "md",              // "sm" | "md" | "lg"
  className = "",

  // Modal props
  onClose,                  // required when mode="modal"
}) {
  if (mode === "modal") {
    return (
      <ModalSearch
        onClose={onClose}
        placeholder={placeholder}
      />
    );
  }

  if (mode === "compact") {
    return (
      <CompactSearch
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <InlineSearch
      placeholder={placeholder}
      showCategories={showCategories}
      autoFocus={autoFocus}
      size={size}
      className={className}
    />
  );
}

// ============================================================
// NAMED EXPORTS
// ============================================================

export { InlineSearch, ModalSearch, CompactSearch };