import { notFound } from "next/navigation";
import Link from "next/link";
import { getToolBySlug, getAllSlugs, getToolsByCategory } from "@/config/tools";
import { getCategoryBySlug, getCategoryColors } from "@/config/categories";
import { getIcon } from "@/lib/icon-map";
import ToolLayout from "@/components/tool-ui/ToolLayout";
import ShareButton from "@/components/tool-ui/ShareButton";

// ============================================================
// STATIC PARAMS
// ============================================================

export async function generateStaticParams() {
  const slugs = getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ============================================================
// METADATA
// ============================================================

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);

  if (!tool) {
    return {
      title: "Tool Not Found | DevTools",
      description: "The requested tool could not be found.",
    };
  }

  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    keywords: tool.tags,
    alternates: { canonical: `https://devtoolssite.com/tools/${slug}` },
    openGraph: {
      title: tool.metaTitle,
      description: tool.metaDescription,
      url: `https://devtoolssite.com/tools/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: tool.metaTitle,
      description: tool.metaDescription,
    },
  };
}

// ============================================================
// JSON-LD
// ============================================================

function ToolJsonLd({ tool }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    description: tool.description,
    url: `https://devtoolssite.com/tools/${tool.slug}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: tool.tags.join(", "),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ============================================================
// BREADCRUMB
// ============================================================

function Breadcrumb({ tool, category }) {
  const colors = getCategoryColors(category?.color || "gray");

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap"
    >
      <Link href="/" className="hover:text-blue-600 transition-colors">
        Home
      </Link>
      <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <Link href="/categories" className="hover:text-blue-600 transition-colors">
        Tools
      </Link>
      <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      {category && (
        <>
          <Link
            href={`/categories/${category.slug}`}
            className={`hover:text-blue-600 transition-colors ${colors.text}`}
          >
            {category.shortName}
          </Link>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </>
      )}
      <span className="text-gray-900 font-medium truncate max-w-[200px]">
        {tool.name}
      </span>
    </nav>
  );
}

// ============================================================
// RELATED TOOLS
// ============================================================

function RelatedTools({ tool, category }) {
  if (!category) return null;

  const related = getToolsByCategory(tool.category)
    .filter((t) => t.slug !== tool.slug)
    .slice(0, 4);

  if (related.length === 0) return null;

  const colors = getCategoryColors(category.color);

  return (
    <section className="mt-10 pt-8 border-t border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        More {category.shortName} Tools
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {related.map((relTool) => {
          const RelIcon = getIcon(relTool.icon); // ← was: {relTool.icon} (string as text)
          return (
            <Link
              key={relTool.slug}
              href={`/tools/${relTool.slug}`}
              className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all group"
            >
              <div
                className={`flex-shrink-0 w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center`}
              >
                <RelIcon size={18} />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 group-hover:text-blue-600 transition-colors truncate">
                  {relTool.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                  {relTool.shortDesc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// TOOL TAGS
// ============================================================

function ToolTags({ tags }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default async function ToolPage({ params }) {
  const { slug } = await params;

  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const category  = getCategoryBySlug(tool.category);
  const colors    = getCategoryColors(category?.color || "gray");
  const ToolIcon  = getIcon(tool.icon);     // ← was: {tool.icon} (string as text)
  const CatIcon   = category ? getIcon(category.icon) : null; // ← was: {category.icon} (string as text)

  return (
    <>
      <ToolJsonLd tool={tool} />

      <div className="min-h-screen bg-gray-50">

        {/* ── Tool Header ──────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

            <Breadcrumb tool={tool} category={category} />

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">

              {/* Tool icon */}
              <div
                className={`flex-shrink-0 w-14 h-14 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center`}
              >
                <ToolIcon size={28} />
              </div>

              {/* Title + description */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {tool.name}
                  </h1>
                  {category && CatIcon && (
                    <Link
                      href={`/categories/${category.slug}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge} hover:opacity-80 transition-opacity`}
                    >
                      <CatIcon size={12} />
                      {category.shortName}
                    </Link>
                  )}
                </div>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                  {tool.description}
                </p>
              </div>

              <ShareButton tool={tool} />
            </div>

            <div className="mt-4">
              <ToolTags tags={tool.tags} />
            </div>
          </div>
        </div>

        {/* ── Tool Area ────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ToolLayout slug={slug} tool={tool} />
          <RelatedTools tool={tool} category={category} />
        </div>

      </div>
    </>
  );
}