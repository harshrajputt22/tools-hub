import Link from "next/link";
import { TOOL_CATEGORIES, STATIC_PAGES, ALL_TOOLS, BASE_URL } from "@/lib/tools-registry";

export const metadata = {
  title: "Sitemap — DevTools",
  description:
    `Browse every page and tool available on DevTools — ${ALL_TOOLS.length}+ free developer utilities organised by category.`,
  alternates: {
    canonical: `${BASE_URL}/sitemap`,
  },
};

// ── Sub-components ─────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
      {children}
    </h2>
  );
}

function PageLink({ href, children, external = false }) {
  const cls =
    "inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="opacity-50">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }
  return <Link href={href} className={cls}>{children}</Link>;
}

function ToolCard({ name, slug }) {
  return (
    <Link
      href={`/tools/${slug}`}
      className="group flex items-center gap-2.5 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm transition-all"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0 group-hover:bg-blue-600 transition-colors" />
      <span className="text-sm text-gray-700 group-hover:text-blue-700 font-medium leading-snug">
        {name}
      </span>
    </Link>
  );
}

function StatBadge({ value, label }) {
  return (
    <div className="flex flex-col items-center px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      <span className="text-2xl font-extrabold text-gray-900 tabular-nums">{value}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────
export default function SitemapPage() {
  const totalTools = ALL_TOOLS.length;
  const totalPages = STATIC_PAGES.length + totalTools;

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-5">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-semibold text-blue-700 tracking-wide">Complete site index</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Sitemap
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
            Every page and tool available on DevTools, organised by category.
          </p>

          {/* Stats */}
          <div className="inline-flex items-center gap-3 flex-wrap justify-center">
            <StatBadge value={TOOL_CATEGORIES.length} label="Categories" />
            <StatBadge value={totalTools}             label="Tools"      />
            <StatBadge value={STATIC_PAGES.length}    label="Pages"      />
            <StatBadge value={totalPages}             label="Total URLs" />
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-14 space-y-14">

        {/* ── Section 1: Main Pages ──────────────────────────── */}
        <section aria-labelledby="section-main-pages">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <SectionHeading id="section-main-pages">Main Pages</SectionHeading>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {STATIC_PAGES.map(({ name, path }) => (
              <Link
                key={path}
                href={path}
                className="group flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 group-hover:bg-blue-500 transition-colors flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{name}</span>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-blue-400 ml-2 truncate max-w-[120px]">
                  {path}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Section 2: Tools by category ──────────────────── */}
        <section aria-labelledby="section-all-tools">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 id="section-all-tools" className="text-lg font-bold text-gray-900">
              Developer Tools <span className="text-sm font-normal text-gray-400 ml-1">({totalTools} tools)</span>
            </h2>
          </div>

          <div className="space-y-10">
            {TOOL_CATEGORIES.map(({ category, slug, description, tools }) => (
              <div key={slug}>
                {/* Category header */}
                <div className="flex items-start justify-between gap-4 mb-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">{category}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {tools.length} tools
                  </span>
                </div>

                {/* Tool grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tools.map(({ name, slug: toolSlug }) => (
                    <ToolCard key={toolSlug} name={name} slug={toolSlug} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 3: XML / Technical sitemaps ───────────── */}
        <section aria-labelledby="section-technical">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-purple-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 id="section-technical" className="text-lg font-bold text-gray-900">Technical &amp; SEO Files</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label:   "XML Sitemap",
                href:    `${BASE_URL}/sitemap.xml`,
                desc:    "Machine-readable sitemap for search engine crawlers",
                badge:   "For bots",
                badgeCls:"bg-green-50 text-green-700 border-green-100",
                external: true,
              },
              {
                label:   "robots.txt",
                href:    `${BASE_URL}/robots.txt`,
                desc:    "Crawler access rules and sitemap reference",
                badge:   "For bots",
                badgeCls:"bg-green-50 text-green-700 border-green-100",
                external: true,
              },
              {
                label:   "RSS / Changelog",
                href:    "/changelog",
                desc:    "Latest releases, new tools, and bug fixes",
                badge:   "Updates",
                badgeCls:"bg-blue-50 text-blue-700 border-blue-100",
                external: false,
              },
            ].map(({ label, href, desc, badge, badgeCls, external }) => (
              external ? (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-purple-700">{label}</p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${badgeCls}`}>{badge}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                    <p className="text-xs font-mono text-blue-500 mt-1.5 truncate">{href.replace(BASE_URL, "")}</p>
                  </div>
                </a>
              ) : (
                <Link key={label} href={href}
                  className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl hover:border-purple-200 hover:bg-purple-50/30 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-purple-700">{label}</p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${badgeCls}`}>{badge}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                    <p className="text-xs font-mono text-blue-500 mt-1.5">{href}</p>
                  </div>
                </Link>
              )
            ))}
          </div>
        </section>

        {/* ── Footer note ────────────────────────────────────── */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-gray-400">
            Showing all <strong className="text-gray-600">{totalPages}</strong> URLs indexed on DevTools.
            Last updated automatically on every deploy.
          </p>
          <a
            href={`${BASE_URL}/sitemap.xml`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View XML sitemap
          </a>
        </div>

      </div>
    </main>
  );
}