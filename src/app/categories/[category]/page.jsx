import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ChevronRight, ArrowRight } from "lucide-react";
import {
  getCategoryBySlug,
  getAllCategoriesSorted,
  getCategoryColors,
} from "@/config/categories";
import { getToolsByCategory } from "@/config/tools";
import { getIcon } from "@/lib/icon-map";

// ============================================================
// STATIC PARAMS
// ============================================================

export async function generateStaticParams() {
  const categories = getAllCategoriesSorted();
  return categories.map((cat) => ({ category: cat.slug }));
}

// ============================================================
// METADATA
// ============================================================

export async function generateMetadata({ params }) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);

  if (!cat) {
    return {
      title: "Category Not Found | DevTools",
      description: "The requested category could not be found.",
    };
  }

  return {
    title: cat.metaTitle,
    description: cat.metaDescription,
    alternates: { canonical: `https://devtoolssite.com/categories/${category}` },
    openGraph: {
      title: cat.metaTitle,
      description: cat.metaDescription,
      url: `https://devtoolssite.com/categories/${category}`,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: cat.metaTitle,
      description: cat.metaDescription,
    },
  };
}

// ============================================================
// JSON-LD
// ============================================================

function CategoryJsonLd({ cat, tools }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    description: cat.description,
    url: `https://devtoolssite.com/categories/${cat.slug}`,
    numberOfItems: tools.length,
    hasPart: tools.map((tool) => ({
      "@type": "SoftwareApplication",
      name: tool.name,
      description: tool.description,
      url: `https://devtoolssite.com/tools/${tool.slug}`,
      applicationCategory: "DeveloperApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    })),
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

function Breadcrumb({ cat }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap"
    >
      <Link href="/" className="hover:text-blue-600 transition-colors">
        Home
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      <Link href="/categories" className="hover:text-blue-600 transition-colors">
        Categories
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      <span className="text-gray-900 font-medium">{cat.name}</span>
    </nav>
  );
}

// ============================================================
// TOOL CARD
// ============================================================

function ToolCard({ tool, colors }) {
  const Icon = getIcon(tool.icon);

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex flex-col p-5 bg-white border border-gray-200 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-11 h-11 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <Icon size={20} className="text-gray-700" />
        </div>
      </div>

      <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1.5 text-sm sm:text-base">
        {tool.name}
      </h2>

      <p className="text-sm text-gray-500 leading-relaxed flex-1 line-clamp-2">
        {tool.shortDesc}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {tool.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-blue-600 group-hover:gap-2.5 transition-all">
        Open tool
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

// ============================================================
// SIDEBAR
// ============================================================

function CategorySidebar({ currentSlug }) {
  const allCategories = getAllCategoriesSorted();

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden sticky top-20">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">All Categories</h3>
        </div>
        <nav className="p-2">
          {allCategories.map((cat) => {
            const isActive = cat.slug === currentSlug;
            const colors   = getCategoryColors(cat.color);
            const Icon     = getIcon(cat.icon);
            return (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.text} font-medium`
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 truncate">{cat.shortName}</span>
                <span
                  className={`text-xs flex-shrink-0 px-1.5 py-0.5 rounded-full ${
                    isActive ? colors.badge : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {cat.toolCount}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default async function CategoryPage({ params }) {
  const { category } = await params;

  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const tools         = getToolsByCategory(category);
  const colors        = getCategoryColors(cat.color);
  const featuredTools = tools.filter((t) => t.featured);
  const totalTools    = tools.length;
  const CategoryIcon  = getIcon(cat.icon);

  return (
    <>
      <CategoryJsonLd cat={cat} tools={tools} />

      <div className="min-h-screen bg-gray-50">

        {/* ── Page header ──────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumb cat={cat} />

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mt-5">
              <div
                className={`flex-shrink-0 w-16 h-16 ${colors.bg} ${colors.border} border-2 rounded-2xl flex items-center justify-center`}
              >
                <CategoryIcon size={28} />
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {cat.name}
                  </h1>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}
                  >
                    {totalTools} tools
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed max-w-2xl">
                  {cat.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            <CategorySidebar currentSlug={category} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-900">{totalTools}</span>
                  {" "}tools in{" "}
                  <span className={`font-semibold ${colors.text}`}>
                    {cat.shortName}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} colors={colors} />
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}