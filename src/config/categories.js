// ── IMPORTANT ──────────────────────────────────────────────────
// icon values are plain STRINGS, NOT imported Lucide components.
// To render a category icon use getIcon() from @/lib/icon-map:
//
//   import { getIcon } from "@/lib/icon-map";
//   const Icon = getIcon(cat.icon);
//   return <Icon size={20} />;
// ──────────────────────────────────────────────────────────────

export const categories = [
  {
    slug: "json",
    name: "JSON Tools",
    shortName: "JSON",
    description:
      "Format, validate, convert and compare JSON data. Essential tools for developers working with APIs and data.",
    shortDesc: "Format, validate & convert JSON",
    icon: "Puzzle",
    color: "blue",
    toolCount: 10,
    featured: true,
    order: 1,
    metaTitle: "JSON Tools - Free Online JSON Formatter, Validator & Converter",
    metaDescription:
      "Free online JSON tools. Format, validate, minify, convert JSON to CSV, XML, and more. No signup required.",
    popularTools: [
      "json-formatter",
      "json-validator",
      "json-to-csv",
      "json-diff-checker",
      "json-tree-viewer",
    ],
  },
  {
    slug: "encoding",
    name: "Encoding / Decoding Tools",
    shortName: "Encoding",
    description:
      "Encode and decode Base64, URL, HTML, Unicode, ASCII, Binary and Hex. Handle all encoding formats in one place.",
    shortDesc: "Base64, URL, HTML, Binary encode/decode",
    icon: "Lock",
    color: "purple",
    toolCount: 8,
    featured: true,
    order: 2,
    metaTitle: "Encoding Decoding Tools - Base64, URL, HTML Encoder Online",
    metaDescription:
      "Free online encoding and decoding tools. Base64, URL encode/decode, HTML entities, Unicode, Binary, Hex and more.",
    popularTools: [
      "base64-encode-decode",
      "url-encode-decode",
      "html-encode-decode",
      "hex-encoder-decoder",
    ],
  },
  {
    slug: "formatters",
    name: "Code Formatting Tools",
    shortName: "Formatters",
    description:
      "Beautify and format HTML, CSS, JavaScript, SQL, XML and YAML code. Make messy code readable instantly.",
    shortDesc: "Beautify HTML, CSS, JS, SQL, YAML",
    icon: "Sparkles",
    color: "teal",
    toolCount: 6,
    featured: true,
    order: 3,
    metaTitle: "Code Formatter - Format HTML CSS JavaScript SQL Online",
    metaDescription:
      "Free online code formatters. Beautify HTML, CSS, JavaScript, SQL, XML and YAML with one click.",
    popularTools: [
      "html-formatter",
      "javascript-formatter",
      "sql-formatter",
      "yaml-formatter",
    ],
  },
  {
    slug: "minifiers",
    name: "Code Minification Tools",
    shortName: "Minifiers",
    description:
      "Minify and compress HTML, CSS, JavaScript and JSON. Reduce file size for better website performance.",
    shortDesc: "Compress HTML, CSS, JS, JSON",
    icon: "Minimize2",
    color: "orange",
    toolCount: 4,
    featured: false,
    order: 4,
    metaTitle: "Code Minifier - Minify HTML CSS JavaScript JSON Online",
    metaDescription:
      "Free online code minifiers. Compress HTML, CSS, JavaScript and JSON to reduce file size.",
    popularTools: [
      "html-minifier",
      "css-minifier",
      "javascript-minifier",
      "json-minifier-tool",
    ],
  },
  {
    slug: "regex",
    name: "Regex & Text Tools",
    shortName: "Regex",
    description:
      "Test regex patterns, generate common expressions, find and replace text, and compare text differences.",
    shortDesc: "Test regex, compare & diff text",
    icon: "Search",
    color: "red",
    toolCount: 5,
    featured: true,
    order: 5,
    metaTitle: "Regex Tester & Text Tools - Regular Expression Tool Online",
    metaDescription:
      "Free online regex tester and text tools. Test patterns, generate regex, compare text and find differences.",
    popularTools: [
      "regex-tester",
      "regex-generator",
      "text-diff-checker",
      "text-compare",
    ],
  },
  {
    slug: "security",
    name: "Security & Hash Tools",
    shortName: "Security",
    description:
      "Generate MD5, SHA1, SHA256, Bcrypt hashes and HMAC signatures. Essential tools for security and cryptography.",
    shortDesc: "MD5, SHA256, Bcrypt, HMAC hashing",
    icon: "Shield",
    color: "green",
    toolCount: 6,
    featured: true,
    order: 6,
    metaTitle: "Hash Generator - MD5 SHA256 Bcrypt HMAC Online",
    metaDescription:
      "Free online hash generator tools. Generate MD5, SHA1, SHA256, Bcrypt, and HMAC hashes instantly.",
    popularTools: [
      "md5-hash-generator",
      "sha256-hash-generator",
      "bcrypt-hash-generator",
      "hmac-generator",
    ],
  },
  {
    slug: "webdev",
    name: "Web Development Helpers",
    shortName: "Web Dev",
    description:
      "UUID generator, timestamp converter, cron builder, HTTP header checker, API tester and JWT decoder.",
    shortDesc: "UUID, JWT, cron, API testing tools",
    icon: "Rocket",
    color: "indigo",
    toolCount: 6,
    featured: true,
    order: 7,
    metaTitle: "Web Developer Tools - UUID JWT Cron Timestamp Online",
    metaDescription:
      "Free web developer tools. Generate UUIDs, convert timestamps, build cron expressions, test APIs and decode JWTs.",
    popularTools: [
      "uuid-generator",
      "jwt-decoder",
      "cron-expression-generator",
      "api-request-tester",
    ],
  },
  {
    slug: "css",
    name: "CSS Generator Tools",
    shortName: "CSS",
    description:
      "Visually generate CSS box shadows, gradients, border radius, button styles and flexbox layouts.",
    shortDesc: "Box shadow, gradient, flexbox CSS",
    icon: "Palette",
    color: "pink",
    toolCount: 5,
    featured: true,
    order: 8,
    metaTitle: "CSS Generator Tools - Box Shadow Gradient Flexbox Online",
    metaDescription:
      "Free CSS generator tools. Generate box shadows, gradients, border radius, buttons and flexbox layouts visually.",
    popularTools: [
      "css-box-shadow-generator",
      "css-gradient-generator",
      "flexbox-generator",
      "css-button-generator",
    ],
  },
  {
    slug: "html",
    name: "HTML Utilities",
    shortName: "HTML",
    description:
      "Generate HTML tables and encode or decode HTML entities. Quick HTML utility tools for web developers.",
    shortDesc: "HTML tables & entity tools",
    icon: "Globe",
    color: "yellow",
    toolCount: 3,
    featured: false,
    order: 9,
    metaTitle: "HTML Tools - HTML Table Generator Entity Encoder Online",
    metaDescription:
      "Free HTML utility tools. Generate HTML tables and encode or decode HTML entities online.",
    popularTools: [
      "html-table-generator",
      "html-entity-encoder",
      "html-entity-decoder",
    ],
  },
  {
    slug: "data-conversion",
    name: "File & Data Conversion",
    shortName: "Data Convert",
    description:
      "Convert between JSON, Excel, CSV, XML and YAML formats. Download converted files instantly.",
    shortDesc: "JSON, Excel, CSV, XML, YAML convert",
    icon: "RefreshCw",
    color: "cyan",
    toolCount: 6,
    featured: true,
    order: 10,
    metaTitle: "Data Conversion Tools - JSON Excel CSV XML YAML Converter",
    metaDescription:
      "Free online data conversion tools. Convert between JSON, Excel, CSV, XML and YAML formats instantly.",
    popularTools: [
      "json-to-excel",
      "excel-to-json",
      "yaml-to-json",
      "csv-to-excel",
    ],
  },
  {
    slug: "document-conversion",
    name: "Document Conversion Tools",
    shortName: "Documents",
    description:
      "Convert PDF to Word, Word to PDF, PDF to JPG, JPG to PDF and Excel conversions. Handle all document formats.",
    shortDesc: "PDF, Word, Excel, JPG convert",
    icon: "FileText",
    color: "slate",
    toolCount: 6,
    featured: true,
    order: 11,
    metaTitle: "Document Converter - PDF Word Excel JPG Converter Online",
    metaDescription:
      "Free online document conversion tools. Convert PDF, Word, Excel and image files instantly.",
    popularTools: [
      "pdf-to-word",
      "word-to-pdf",
      "pdf-to-jpg",
      "jpg-to-pdf",
    ],
  },
  {
    slug: "misc",
    name: "Misc Developer Utilities",
    shortName: "Utilities",
    description:
      "Lorem ipsum generator, random strings, color converter, favicon generator, URL parser and SQL query builder.",
    shortDesc: "Colors, Lorem ipsum, URL, SQL utils",
    icon: "Wrench",
    color: "gray",
    toolCount: 7,
    featured: false,
    order: 12,
    metaTitle: "Developer Utilities - Lorem Ipsum Color UUID SQL Generator",
    metaDescription:
      "Free miscellaneous developer tools. Generate Lorem Ipsum, random strings, convert colors, parse URLs and more.",
    popularTools: [
      "color-code-converter",
      "sql-query-generator",
      "lorem-ipsum-generator",
      "url-parser",
    ],
  },
];

// ============================================================
// COLOR MAP
// ============================================================

export const categoryColorMap = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   badge: "bg-blue-100 text-blue-700",   icon: "text-blue-500",   hover: "hover:bg-blue-100",   ring: "ring-blue-200"   },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", badge: "bg-purple-100 text-purple-700", icon: "text-purple-500", hover: "hover:bg-purple-100", ring: "ring-purple-200" },
  teal:   { bg: "bg-teal-50",   text: "text-teal-700",   border: "border-teal-200",   badge: "bg-teal-100 text-teal-700",   icon: "text-teal-500",   hover: "hover:bg-teal-100",   ring: "ring-teal-200"   },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", icon: "text-orange-500", hover: "hover:bg-orange-100", ring: "ring-orange-200" },
  red:    { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200",    badge: "bg-red-100 text-red-700",    icon: "text-red-500",    hover: "hover:bg-red-100",    ring: "ring-red-200"    },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  badge: "bg-green-100 text-green-700",  icon: "text-green-500",  hover: "hover:bg-green-100",  ring: "ring-green-200"  },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700", icon: "text-indigo-500", hover: "hover:bg-indigo-100", ring: "ring-indigo-200" },
  pink:   { bg: "bg-pink-50",   text: "text-pink-700",   border: "border-pink-200",   badge: "bg-pink-100 text-pink-700",   icon: "text-pink-500",   hover: "hover:bg-pink-100",   ring: "ring-pink-200"   },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", badge: "bg-yellow-100 text-yellow-700", icon: "text-yellow-600", hover: "hover:bg-yellow-100", ring: "ring-yellow-200" },
  cyan:   { bg: "bg-cyan-50",   text: "text-cyan-700",   border: "border-cyan-200",   badge: "bg-cyan-100 text-cyan-700",   icon: "text-cyan-500",   hover: "hover:bg-cyan-100",   ring: "ring-cyan-200"   },
  slate:  { bg: "bg-slate-50",  text: "text-slate-700",  border: "border-slate-200",  badge: "bg-slate-100 text-slate-700",  icon: "text-slate-500",  hover: "hover:bg-slate-100",  ring: "ring-slate-200"  },
  gray:   { bg: "bg-gray-50",   text: "text-gray-700",   border: "border-gray-200",   badge: "bg-gray-100 text-gray-700",   icon: "text-gray-500",   hover: "hover:bg-gray-100",   ring: "ring-gray-200"   },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getCategoryBySlug(slug) {
  return categories.find((cat) => cat.slug === slug) || null;
}

export function getFeaturedCategories() {
  return categories
    .filter((cat) => cat.featured === true)
    .sort((a, b) => a.order - b.order);
}

export function getAllCategoriesSorted() {
  return [...categories].sort((a, b) => a.order - b.order);
}

export function getCategoryColors(colorName) {
  return categoryColorMap[colorName] || categoryColorMap["gray"];
}

export function getCategoryIcon(slug) {
  const cat = getCategoryBySlug(slug);
  return cat ? cat.icon : "Wrench";
}

export function getCategoryName(slug) {
  const cat = getCategoryBySlug(slug);
  return cat ? cat.name : slug;
}

export function getTotalToolCount() {
  return categories.reduce((sum, cat) => sum + cat.toolCount, 0);
}