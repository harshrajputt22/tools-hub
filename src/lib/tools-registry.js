// ─────────────────────────────────────────────────────────────
// tools-registry.js
// Single source of truth for all tools.
// Imported by sitemap/page.jsx, sitemap.js, and robots.txt.js
// Place at: src/lib/tools-registry.js
// ─────────────────────────────────────────────────────────────

export const BASE_URL = "https://devtools.app";

// ── Tool categories ───────────────────────────────────────────
export const TOOL_CATEGORIES = [
  {
    category: "CSS Tools",
    slug:     "css",
    description: "Visual editors and generators for CSS properties",
    tools: [
      { name: "Box Shadow Generator",    slug: "box-shadow-generator"    },
      { name: "Gradient Generator",      slug: "gradient-generator"      },
      { name: "Border Radius Generator", slug: "border-radius-generator" },
      { name: "Button Generator",        slug: "button-generator"        },
      { name: "Flexbox Generator",       slug: "flexbox-generator"       },
    ],
  },
  {
    category: "HTML Tools",
    slug:     "html",
    description: "HTML formatting, encoding, and generation utilities",
    tools: [
      { name: "HTML Formatter",       slug: "html-formatter"        },
      { name: "HTML Table Generator", slug: "html-table-generator"  },
      { name: "HTML Entity Encoder",  slug: "html-entity-encoder"   },
      { name: "HTML Entity Decoder",  slug: "html-entity-decoder"   },
    ],
  },
  {
    category: "Data Conversion",
    slug:     "data-conversion",
    description: "Convert between JSON, CSV, XML, YAML, and Excel",
    tools: [
      { name: "JSON to Excel",  slug: "json-to-excel"  },
      { name: "Excel to JSON",  slug: "excel-to-json"  },
      { name: "CSV to Excel",   slug: "csv-to-excel"   },
      { name: "XML to CSV",     slug: "xml-to-csv"     },
      { name: "YAML to JSON",   slug: "yaml-to-json"   },
      { name: "JSON to YAML",   slug: "json-to-yaml"   },
    ],
  },
  {
    category: "Document Conversion",
    slug:     "document-conversion",
    description: "Convert between PDF, Word, Excel, and image formats",
    tools: [
      { name: "PDF to Word",   slug: "pdf-to-word"   },
      { name: "Word to PDF",   slug: "word-to-pdf"   },
      { name: "PDF to JPG",    slug: "pdf-to-jpg"    },
      { name: "JPG to PDF",    slug: "jpg-to-pdf"    },
      { name: "Excel to PDF",  slug: "excel-to-pdf"  },
      { name: "PDF to Excel",  slug: "pdf-to-excel"  },
    ],
  },
  {
    category: "Text & Generators",
    slug:     "text",
    description: "Text manipulation, random generation, and formatting tools",
    tools: [
      { name: "JSON Formatter",         slug: "json-formatter"          },
      { name: "Lorem Ipsum Generator",  slug: "lorem-ipsum-generator"   },
      { name: "Random String Generator",slug: "random-string-generator" },
      { name: "Random Color Generator", slug: "random-color-generator"  },
      { name: "Color Code Converter",   slug: "color-code-converter"    },
      { name: "URL Parser",             slug: "url-parser"              },
      { name: "SQL Query Generator",    slug: "sql-query-generator"     },
      { name: "Favicon Generator",      slug: "favicon-generator"       },
    ],
  },
  {
    category: "Encoding & Hashing",
    slug:     "encoding",
    description: "Encode, decode, hash, and transform data",
    tools: [
      { name: "Base64 Encoder",       slug: "base64-encoder"        },
      { name: "Base64 Decoder",       slug: "base64-decoder"        },
      { name: "URL Encoder",          slug: "url-encoder"           },
      { name: "URL Decoder",          slug: "url-decoder"           },
      { name: "Hash Generator",       slug: "hash-generator"        },
      { name: "JWT Debugger",         slug: "jwt-debugger"          },
      { name: "Number Base Converter",slug: "number-base-converter" },
    ],
  },
  {
    category: "Developer Utilities",
    slug:     "utilities",
    description: "Everyday utilities for developers",
    tools: [
      { name: "Markdown Previewer",    slug: "markdown-previewer"     },
      { name: "Regex Tester",          slug: "regex-tester"           },
      { name: "Unix Timestamp Converter", slug: "unix-timestamp-converter" },
      { name: "Text Case Converter",   slug: "text-case-converter"    },
      { name: "Word Counter",          slug: "word-counter"           },
      { name: "Diff Checker",          slug: "diff-checker"           },
      { name: "Cron Expression Parser",slug: "cron-expression-parser" },
    ],
  },
];

// ── Flat list of all tools (used by sitemap.js) ────────────────
export const ALL_TOOLS = TOOL_CATEGORIES.flatMap((cat) =>
  cat.tools.map((tool) => ({ ...tool, category: cat.category, categorySlug: cat.slug }))
);

// ── Static pages (used by sitemap.js and sitemap/page.jsx) ────
export const STATIC_PAGES = [
  { name: "Home",            path: "/",               priority: 1.0  },
  { name: "All Tools",       path: "/tools",           priority: 0.9  },
  { name: "About",           path: "/about",           priority: 0.7  },
  { name: "Contact",         path: "/contact",         priority: 0.6  },
  { name: "Changelog",       path: "/changelog",       priority: 0.6  },
  { name: "Privacy Policy",  path: "/privacy-policy",  priority: 0.4  },
  { name: "Terms of Service",path: "/terms-of-service",priority: 0.4  },
  { name: "Disclaimer",      path: "/disclaimer",      priority: 0.3  },
  { name: "Sitemap",         path: "/sitemap",         priority: 0.3  },
];