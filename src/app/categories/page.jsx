import Link from "next/link";
import {
  getAllCategoriesSorted,
  getCategoryColors,
  getTotalToolCount,
} from "@/config/categories";
import { ChevronRight, ArrowRight } from "lucide-react";
import { getIcon } from "@/lib/icon-map"; // ← added

// ============================================================
// METADATA
// ============================================================

export const metadata = {
  title: "All Developer Tool Categories | DevTools",
  description:
    "Browse all 12 categories of free developer tools. JSON tools, encoding, formatters, security, CSS generators, regex, and more. 70+ tools total.",
  alternates: {
    canonical: "https://devtoolssite.com/categories",
  },
  openGraph: {
    title: "All Developer Tool Categories | DevTools",
    description:
      "Browse all 12 categories of free developer tools. 70+ tools total, no signup required.",
    url: "https://devtoolssite.com/categories",
    type: "website",
  },
};

// ============================================================
// JSON-LD STRUCTURED DATA
// ============================================================

function CategoriesJsonLd({ categories }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Developer Tools Categories",
    description:
      "Browse all categories of free online developer tools including JSON tools, encoding, formatters, security, CSS generators and more.",
    url: "https://devtoolssite.com/categories",
    hasPart: categories.map((cat) => ({
      "@type": "CollectionPage",
      name: cat.name,
      description: cat.description,
      url: `https://devtoolssite.com/categories/${cat.slug}`,
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

function Breadcrumb() {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-gray-500"
    >
      <Link href="/" className="hover:text-blue-600 transition-colors">
        Home
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
      <span className="text-gray-900 font-medium">All Categories</span>
    </nav>
  );
}

// ============================================================
// CATEGORY CARD
// ============================================================

function CategoryCard({ cat }) {
  const colors = getCategoryColors(cat.color);
  const Icon   = getIcon(cat.icon); // ← was: cat.icon (string used as component)

  return (
    <Link
      href={`/categories/${cat.slug}`}
      className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      <div className={`${colors.bg} px-5 pt-5 pb-4 border-b ${colors.border}`}>
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 bg-white border ${colors.border} rounded-xl flex items-center justify-center shadow-sm`}
          >
            <Icon size={22} />
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge}`}
          >
            {cat.toolCount} tools
          </span>
        </div>
        <h2
          className={`mt-3 font-bold text-base ${colors.text} group-hover:underline underline-offset-2`}
        >
          {cat.name}
        </h2>
      </div>

      <div className="px-5 py-4 flex flex-col flex-1">
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1">
          {cat.shortDesc}
        </p>

        {cat.popularTools?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Popular tools
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cat.popularTools.slice(0, 3).map((slug) => (
                <span
                  key={slug}
                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md truncate max-w-[120px]"
                >
                  {slug
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              ))}
            </div>
          </div>
        )}

        <div
          className={`mt-4 flex items-center gap-1.5 text-xs font-semibold ${colors.text} group-hover:gap-3 transition-all`}
        >
          Browse {cat.shortName} tools
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function CategoriesPage() {
  const allCategories = getAllCategoriesSorted();
  const totalTools    = getTotalToolCount();

  return (
    <>
      <CategoriesJsonLd categories={allCategories} />

      <div className="min-h-screen bg-gray-50">

        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumb />
            <div className="mt-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                All Categories
              </h1>
              <p className="text-gray-500 text-base sm:text-lg max-w-2xl leading-relaxed">
                {totalTools}+ free tools across {allCategories.length} categories.
                No signup, no limits, no ads.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {allCategories.map((cat) => (
              <CategoryCard key={cat.slug} cat={cat} />
            ))}
          </div>
        </div>

      </div>
    </>
  );
}