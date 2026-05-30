import Link from "next/link";
import { getAllCategoriesSorted, getCategoryColors, getTotalToolCount } from "@/config/categories";
import { getFeaturedTools, getToolsByCategory } from "@/config/tools";
import { getIcon } from "@/lib/icon-map";

export const metadata = {
  title: "DevTools — Free Online Developer Tools",
  description: "70+ free online developer tools. JSON formatter, Base64 encoder, regex tester, hash generator, code formatter, UUID generator and more. No signup required.",
  alternates: { canonical: "https://devtoolssite.com" },
};

export default function HomePage() {
  const allCategories = getAllCategoriesSorted();
  const featuredTools = getFeaturedTools();
  const totalTools    = getTotalToolCount();

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Page header ──────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Developer Tools
            </h1>
            <SearchShell />
          </div>
        </div>
      </section>

      {/* ── 1. Categories grid ───────────────────────────────── */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Browse by Category" subtitle={`${allCategories.length} categories`} linkHref="/categories" linkLabel="All categories" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {allCategories.map((cat) => {
              const colors  = getCategoryColors(cat.color);
              const CatIcon = getIcon(cat.icon); // cat.icon is now a string
              return (
                <Link key={cat.slug} href={`/categories/${cat.slug}`}
                  className="group flex flex-col items-center gap-2.5 p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:border-gray-300 hover:bg-white hover:shadow-sm transition-all duration-150 text-center">
                  <div className={`w-11 h-11 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <CatIcon size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-blue-600 transition-colors leading-snug">{cat.shortName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{cat.toolCount} tools</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 2. Popular tools ─────────────────────────────────── */}
      <section className="py-12 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Most Popular Tools" subtitle="Used by developers every day" linkHref="/categories" linkLabel={`See all ${totalTools} tools`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featuredTools.map((tool) => {
              const cat    = allCategories.find((c) => c.slug === tool.category);
              const colors = getCategoryColors(cat?.color || "gray");
              const TIcon  = getIcon(tool.icon); // tool.icon is a string
              return (
                <Link key={tool.slug} href={`/tools/${tool.slug}`}
                  className="group flex flex-col p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <TIcon size={18} />
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {cat?.shortName || tool.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{tool.name}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed flex-1">{tool.shortDesc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
                    Open tool
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3. All tools by category ─────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader title="All Tools" subtitle={`${totalTools} tools across ${allCategories.length} categories`} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {allCategories.map((cat) => {
              const colors   = getCategoryColors(cat.color);
              const catTools = getToolsByCategory(cat.slug);
              const CatIcon  = getIcon(cat.icon); // cat.icon is a string
              if (!catTools.length) return null;
              return (
                <div key={cat.slug} className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                  {/* Card header */}
                  <div className={`flex items-center justify-between px-5 py-4 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0"><CatIcon size={20} /></div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-gray-900 leading-tight">{cat.name}</h2>
                        <p className="text-xs text-gray-500 mt-0.5 truncate hidden sm:block">{cat.shortDesc}</p>
                      </div>
                    </div>
                    <Link href={`/categories/${cat.slug}`}
                      className={`flex-shrink-0 ml-4 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${colors.badge} hover:opacity-80 transition-opacity`}>
                      {cat.toolCount}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  {/* Tool list */}
                  <div className="px-3 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {catTools.map((tool) => {
                        const TIcon = getIcon(tool.icon); // tool.icon is a string
                        return (
                          <Link key={tool.slug} href={`/tools/${tool.slug}`}
                            className="group/tool flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-all duration-100">
                            <span className="flex-shrink-0 w-5 flex items-center justify-center">
                              <TIcon size={14} />
                            </span>
                            <span className="truncate font-medium leading-snug">{tool.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. Bottom CTA ────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">All {totalTools}+ tools. Always free.</h2>
          <p className="text-blue-100 text-base mb-7">No account, no ads, no limits. Everything runs in your browser.</p>
          <Link href="/categories" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
            Explore all categories
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SectionHeader({ title, subtitle, linkHref, linkLabel }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {linkHref && linkLabel && (
        <Link href={linkHref} className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function SearchShell() {
  return (
    <Link href="/categories" className="flex items-center gap-3 w-full sm:w-72 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-white transition-all group">
      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="text-sm text-gray-400 flex-1">Search tools…</span>
      <span className="hidden sm:flex items-center gap-0.5 text-xs text-gray-300 bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</span>
    </Link>
  );
}