import Link from "next/link";
import { Star } from "lucide-react";
import { getCategoryBySlug, getCategoryColors } from "@/config/categories";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// TOOL HEADER
// Displays tool icon, name, description, category badge
// and breadcrumb. Used at the top of every tool page.
// This is a SERVER component — no "use client" needed.
// ============================================================

export default function ToolHeader({ tool }) {
  if (!tool) return null;

  const category  = getCategoryBySlug(tool.category);
  const colors    = getCategoryColors(category?.color || "gray");
  const ToolIcon  = getIcon(tool.icon);                          // ← was: {tool.icon} string
  const CatIcon   = category ? getIcon(category.icon) : null;   // ← was: {category.icon} string

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* ── Breadcrumb ─────────────────────────────────── */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 flex-wrap"
        >
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <ChevronIcon />
          <Link href="/categories" className="hover:text-blue-600 transition-colors">
            Tools
          </Link>
          <ChevronIcon />
          {category && (
            <>
              <Link
                href={`/categories/${category.slug}`}
                className={`hover:text-blue-600 transition-colors font-medium ${colors.text}`}
              >
                {category.shortName}
              </Link>
              <ChevronIcon />
            </>
          )}
          <span className="text-gray-600 font-medium truncate max-w-[180px]">
            {tool.name}
          </span>
        </nav>

        {/* ── Tool Identity Row ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">

          {/* Icon */}
          <div
            className={`flex-shrink-0 w-14 h-14 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center shadow-sm`}
            aria-hidden="true"
          >
            <ToolIcon size={28} />
          </div>

          {/* Title + description + tags */}
          <div className="flex-1 min-w-0">

            {/* Name + category badge + popular badge */}
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {tool.name}
              </h1>

              {category && CatIcon && (
                <Link
                  href={`/categories/${category.slug}`}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.badge} hover:opacity-80 transition-opacity`}
                >
                  <CatIcon size={12} />
                  {category.shortName}
                </Link>
              )}

            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-2xl">
              {tool.description}
            </p>

            {/* Tags */}
            {tool.tags && tool.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helper ────────────────────────────────────────────
function ChevronIcon() {
  return (
    <svg
      className="w-3 h-3 text-gray-300 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}