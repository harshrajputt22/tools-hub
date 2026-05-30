import {
  AlignLeft,
  Braces,
  CheckCircle,
  Clock,
  Code,
  Code2,
  Columns,
  Cpu,
  Database,
  FileCode,
  FileSpreadsheet,
  FileText,
  GitBranch,
  GitMerge,
  Globe,
  Hash,
  Image,
  Key,
  Layout,
  Layers,
  Link,
  Lock,
  Maximize,
  Minimize2,
  MousePointer,
  Paintbrush,
  Palette,
  Radio,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Shuffle,
  Square,
  Star,
  Table,
  Tag,
  Terminal,
  Unlock,
  Zap,
} from "lucide-react";

// icon values are plain STRINGS — NOT imported components.
// To render: import { getToolIcon } from "@/lib/tool-icon-map"
// const Icon = getToolIcon(tool.icon); return <Icon size={18} />;

export const tools = [
  // JSON TOOLS
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format and beautify your JSON data with proper indentation",
    shortDesc: "Beautify JSON with indentation",
    category: "json",
    tags: ["json", "format", "beautify", "pretty print"],
    icon: "Braces",
    featured: true,
    metaTitle: "JSON Formatter - Format & Beautify JSON Online",
    metaDescription:
      "Free online JSON formatter. Paste your JSON and instantly format it with proper indentation and syntax highlighting.",
  },
  {
    slug: "json-validator",
    name: "JSON Validator",
    description: "Validate your JSON and get detailed error messages",
    shortDesc: "Validate JSON syntax instantly",
    category: "json",
    tags: ["json", "validate", "lint", "check"],
    icon: "CheckCircle",
    featured: true,
    metaTitle: "JSON Validator - Validate JSON Online Free",
    metaDescription:
      "Validate JSON syntax online. Get clear error messages with line and column numbers.",
  },
  {
    slug: "json-minifier",
    name: "JSON Minifier",
    description: "Minify and compress JSON by removing whitespace",
    shortDesc: "Compress JSON by removing whitespace",
    category: "json",
    tags: ["json", "minify", "compress", "optimize"],
    icon: "Minimize2",
    featured: false,
    metaTitle: "JSON Minifier - Compress JSON Online",
    metaDescription:
      "Minify JSON data online. Remove all unnecessary whitespace to reduce file size.",
  },
  {
    slug: "json-pretty-print",
    name: "JSON Pretty Print",
    description: "Pretty print JSON with customizable indentation levels",
    shortDesc: "Pretty print JSON with custom indent",
    category: "json",
    tags: ["json", "pretty", "print", "indent"],
    icon: "AlignLeft",
    featured: false,
    metaTitle: "JSON Pretty Print - Pretty Print JSON Online",
    metaDescription:
      "Pretty print JSON with customizable indentation. Choose 2, 4, or tab indentation.",
  },
  {
    slug: "json-to-csv",
    name: "JSON to CSV Converter",
    description: "Convert JSON arrays to CSV format for spreadsheets",
    shortDesc: "Convert JSON arrays to CSV",
    category: "json",
    tags: ["json", "csv", "convert", "export"],
    icon: "Table",
    featured: true,
    metaTitle: "JSON to CSV Converter - Convert JSON to CSV Online",
    metaDescription:
      "Convert JSON to CSV online for free. Download your CSV file instantly.",
  },
  {
    slug: "csv-to-json",
    name: "CSV to JSON Converter",
    description: "Convert CSV data to JSON format instantly",
    shortDesc: "Convert CSV to JSON format",
    category: "json",
    tags: ["csv", "json", "convert", "import"],
    icon: "FileSpreadsheet",
    featured: true,
    metaTitle: "CSV to JSON Converter - Convert CSV to JSON Online",
    metaDescription:
      "Convert CSV to JSON online for free. Supports headers and nested data.",
  },
  {
    slug: "json-to-xml",
    name: "JSON to XML Converter",
    description: "Convert JSON data to XML format",
    shortDesc: "Convert JSON to XML format",
    category: "json",
    tags: ["json", "xml", "convert"],
    icon: "RefreshCw",
    featured: false,
    metaTitle: "JSON to XML Converter - Convert JSON to XML Online",
    metaDescription:
      "Convert JSON to XML online. Free tool with instant conversion.",
  },
  {
    slug: "xml-to-json",
    name: "XML to JSON Converter",
    description: "Convert XML data to JSON format",
    shortDesc: "Convert XML to JSON format",
    category: "json",
    tags: ["xml", "json", "convert"],
    icon: "Code2",
    featured: false,
    metaTitle: "XML to JSON Converter - Convert XML to JSON Online",
    metaDescription:
      "Convert XML to JSON online for free. Handles attributes and nested elements.",
  },
  {
    slug: "json-diff-checker",
    name: "JSON Diff Checker",
    description: "Compare two JSON objects and highlight the differences",
    shortDesc: "Compare two JSON objects",
    category: "json",
    tags: ["json", "diff", "compare", "difference"],
    icon: "GitMerge",
    featured: true,
    metaTitle: "JSON Diff Checker - Compare JSON Online",
    metaDescription:
      "Compare two JSON objects side by side. Highlights added, removed, and changed fields.",
  },
  {
    slug: "json-tree-viewer",
    name: "JSON Tree Viewer",
    description: "Visualize JSON as an interactive expandable tree",
    shortDesc: "Visualize JSON as a tree",
    category: "json",
    tags: ["json", "tree", "visualize", "explore"],
    icon: "GitBranch",
    featured: true,
    metaTitle: "JSON Tree Viewer - Visualize JSON as Tree",
    metaDescription:
      "Explore JSON as an interactive collapsible tree. Makes complex JSON easy to navigate.",
  },
  // ENCODING
  {
    slug: "base64-encode-decode",
    name: "Base64 Encode / Decode",
    description: "Encode text to Base64 or decode Base64 back to text",
    shortDesc: "Encode or decode Base64 strings",
    category: "encoding",
    tags: ["base64", "encode", "decode"],
    icon: "Lock",
    featured: true,
    metaTitle: "Base64 Encode Decode - Online Base64 Tool",
    metaDescription:
      "Encode text to Base64 or decode Base64 strings online. Supports UTF-8.",
  },
  {
    slug: "url-encode-decode",
    name: "URL Encode / Decode",
    description: "Encode or decode URL components and query strings",
    shortDesc: "Encode or decode URLs",
    category: "encoding",
    tags: ["url", "encode", "decode", "percent"],
    icon: "Link",
    featured: true,
    metaTitle: "URL Encode Decode - Online URL Encoder",
    metaDescription:
      "URL encode or decode strings online. Supports full URL and component encoding.",
  },
  {
    slug: "html-encode-decode",
    name: "HTML Encode / Decode",
    description: "Encode special characters to HTML entities or decode them",
    shortDesc: "Encode or decode HTML entities",
    category: "encoding",
    tags: ["html", "encode", "decode", "entities"],
    icon: "Code",
    featured: false,
    metaTitle: "HTML Encode Decode - HTML Entity Tool Online",
    metaDescription:
      "Encode HTML special characters to entities or decode them back online.",
  },
  {
    slug: "unicode-encoder-decoder",
    name: "Unicode Encoder / Decoder",
    description: "Convert text to Unicode escape sequences and back",
    shortDesc: "Encode or decode Unicode text",
    category: "encoding",
    tags: ["unicode", "encode", "decode", "escape"],
    icon: "Globe",
    featured: false,
    metaTitle: "Unicode Encoder Decoder - Unicode Tool Online",
    metaDescription:
      "Convert text to Unicode code points and escape sequences online.",
  },
  {
    slug: "ascii-converter",
    name: "ASCII Converter",
    description: "Convert text to ASCII codes and ASCII codes to text",
    shortDesc: "Convert text to ASCII codes",
    category: "encoding",
    tags: ["ascii", "convert", "text", "codes"],
    icon: "Hash",
    featured: false,
    metaTitle: "ASCII Converter - Text to ASCII Online",
    metaDescription:
      "Convert text to ASCII decimal, hex, binary values online.",
  },
  {
    slug: "binary-to-text",
    name: "Binary to Text Converter",
    description: "Convert binary code (0s and 1s) to readable text",
    shortDesc: "Convert binary to readable text",
    category: "encoding",
    tags: ["binary", "text", "convert", "decode"],
    icon: "Cpu",
    featured: false,
    metaTitle: "Binary to Text Converter - Decode Binary Online",
    metaDescription:
      "Convert binary code to text online. Supports 8-bit binary groups.",
  },
  {
    slug: "text-to-binary",
    name: "Text to Binary Converter",
    description: "Convert text to binary representation",
    shortDesc: "Convert text to binary code",
    category: "encoding",
    tags: ["text", "binary", "convert", "encode"],
    icon: "Terminal",
    featured: false,
    metaTitle: "Text to Binary Converter - Encode Text to Binary",
    metaDescription:
      "Convert any text to binary code online. Shows 8-bit binary for each character.",
  },
  {
    slug: "hex-encoder-decoder",
    name: "Hex Encoder / Decoder",
    description: "Convert text to hexadecimal and hex back to text",
    shortDesc: "Encode or decode hex strings",
    category: "encoding",
    tags: ["hex", "hexadecimal", "encode", "decode"],
    icon: "Hash",
    featured: false,
    metaTitle: "Hex Encoder Decoder - Text to Hex Online",
    metaDescription:
      "Convert text to hexadecimal encoding or decode hex back to text online.",
  },
  // FORMATTERS
  {
    slug: "html-formatter",
    name: "HTML Formatter",
    description: "Format and beautify HTML code with proper indentation",
    shortDesc: "Beautify HTML code",
    category: "formatters",
    tags: ["html", "format", "beautify", "indent"],
    icon: "FileCode",
    featured: true,
    metaTitle: "HTML Formatter - Format HTML Code Online",
    metaDescription:
      "Format and beautify HTML code online. Fix indentation and make HTML readable.",
  },
  {
    slug: "css-formatter",
    name: "CSS Formatter",
    description: "Format and beautify CSS code",
    shortDesc: "Beautify CSS code",
    category: "formatters",
    tags: ["css", "format", "beautify"],
    icon: "Paintbrush",
    featured: false,
    metaTitle: "CSS Formatter - Format CSS Code Online",
    metaDescription:
      "Format and beautify CSS code online. Proper indentation and spacing.",
  },
  {
    slug: "javascript-formatter",
    name: "JavaScript Formatter",
    description: "Format and beautify JavaScript code",
    shortDesc: "Beautify JavaScript code",
    category: "formatters",
    tags: ["javascript", "js", "format", "beautify"],
    icon: "Zap",
    featured: true,
    metaTitle: "JavaScript Formatter - Format JS Code Online",
    metaDescription:
      "Format and beautify JavaScript code online using Prettier.",
  },
  {
    slug: "sql-formatter",
    name: "SQL Formatter",
    description: "Format and beautify SQL queries for readability",
    shortDesc: "Beautify SQL queries",
    category: "formatters",
    tags: ["sql", "format", "beautify", "query"],
    icon: "Database",
    featured: true,
    metaTitle: "SQL Formatter - Format SQL Queries Online",
    metaDescription:
      "Format SQL queries online. Supports MySQL, PostgreSQL, T-SQL and more.",
  },
  {
    slug: "xml-formatter",
    name: "XML Formatter",
    description: "Format and beautify XML documents",
    shortDesc: "Beautify XML documents",
    category: "formatters",
    tags: ["xml", "format", "beautify"],
    icon: "FileCode",
    featured: false,
    metaTitle: "XML Formatter - Format XML Online",
    metaDescription:
      "Format and beautify XML documents online with proper indentation.",
  },
  {
    slug: "yaml-formatter",
    name: "YAML Formatter",
    description: "Format and validate YAML files",
    shortDesc: "Format and validate YAML",
    category: "formatters",
    tags: ["yaml", "format", "validate"],
    icon: "FileText",
    featured: false,
    metaTitle: "YAML Formatter - Format YAML Online",
    metaDescription:
      "Format and validate YAML files online. Highlights syntax errors.",
  },
  // MINIFIERS
  {
    slug: "html-minifier",
    name: "HTML Minifier",
    description: "Minify HTML by removing whitespace and comments",
    shortDesc: "Compress HTML code",
    category: "minifiers",
    tags: ["html", "minify", "compress", "optimize"],
    icon: "Minimize2",
    featured: false,
    metaTitle: "HTML Minifier - Minify HTML Online",
    metaDescription:
      "Minify HTML code online. Remove comments, whitespace, and reduce file size.",
  },
  {
    slug: "css-minifier",
    name: "CSS Minifier",
    description: "Minify CSS by removing whitespace and comments",
    shortDesc: "Compress CSS code",
    category: "minifiers",
    tags: ["css", "minify", "compress", "optimize"],
    icon: "Minimize2",
    featured: false,
    metaTitle: "CSS Minifier - Minify CSS Online",
    metaDescription:
      "Minify CSS code online. Reduce file size for better performance.",
  },
  {
    slug: "javascript-minifier",
    name: "JavaScript Minifier",
    description: "Minify JavaScript code to reduce file size",
    shortDesc: "Compress JavaScript code",
    category: "minifiers",
    tags: ["javascript", "js", "minify", "compress"],
    icon: "Minimize2",
    featured: false,
    metaTitle: "JavaScript Minifier - Minify JS Online",
    metaDescription:
      "Minify JavaScript code online. Reduce file size and improve load times.",
  },
  {
    slug: "json-minifier-tool",
    name: "JSON Minifier",
    description: "Minify JSON by stripping all whitespace",
    shortDesc: "Compress JSON data",
    category: "minifiers",
    tags: ["json", "minify", "compress"],
    icon: "Minimize2",
    featured: false,
    metaTitle: "JSON Minifier - Compress JSON Online",
    metaDescription:
      "Minify JSON data online by removing all unnecessary whitespace.",
  },
  // REGEX & TEXT
  {
    slug: "regex-tester",
    name: "Regex Tester",
    description:
      "Test regular expressions against text in real time with match highlighting",
    shortDesc: "Test regex patterns live",
    category: "regex",
    tags: ["regex", "regular expression", "test", "match"],
    icon: "Search",
    featured: true,
    metaTitle: "Regex Tester - Test Regular Expressions Online",
    metaDescription:
      "Test regular expressions online with real-time match highlighting. Supports JS regex flags.",
  },
  {
    slug: "regex-generator",
    name: "Regex Generator",
    description:
      "Generate common regex patterns for email, URL, phone, date and more",
    shortDesc: "Generate common regex patterns",
    category: "regex",
    tags: ["regex", "generate", "pattern", "email", "url"],
    icon: "Settings",
    featured: true,
    metaTitle: "Regex Generator - Generate Regex Patterns Online",
    metaDescription:
      "Generate common regex patterns for email, URL, phone numbers, dates and more.",
  },
  {
    slug: "regex-replace",
    name: "Regex Replace Tool",
    description: "Find and replace text using regular expressions",
    shortDesc: "Find and replace with regex",
    category: "regex",
    tags: ["regex", "replace", "find", "substitute"],
    icon: "RefreshCw",
    featured: false,
    metaTitle: "Regex Replace Tool - Find and Replace with Regex",
    metaDescription: "Use regular expressions to find and replace text online.",
  },
  {
    slug: "text-diff-checker",
    name: "Text Diff Checker",
    description:
      "Compare two blocks of text and see the differences highlighted",
    shortDesc: "Compare two text blocks",
    category: "regex",
    tags: ["diff", "compare", "text", "difference"],
    icon: "GitMerge",
    featured: true,
    metaTitle: "Text Diff Checker - Compare Text Online",
    metaDescription:
      "Compare two text blocks online. See additions, deletions, and changes highlighted.",
  },
  {
    slug: "text-compare",
    name: "Text Compare Tool",
    description: "Side-by-side text comparison with line-by-line diff",
    shortDesc: "Side-by-side text comparison",
    category: "regex",
    tags: ["compare", "text", "side by side", "diff"],
    icon: "Columns",
    featured: false,
    metaTitle: "Text Compare Tool - Side by Side Text Comparison",
    metaDescription:
      "Compare texts side by side online. Line-by-line diff with color highlighting.",
  },
  // SECURITY
  {
    slug: "md5-hash-generator",
    name: "MD5 Hash Generator",
    description: "Generate MD5 hash of any text string",
    shortDesc: "Generate MD5 hash",
    category: "security",
    tags: ["md5", "hash", "encrypt", "checksum"],
    icon: "Shield",
    featured: true,
    metaTitle: "MD5 Hash Generator - Generate MD5 Online",
    metaDescription:
      "Generate MD5 hash of any string online. Instant MD5 checksum generator.",
  },
  {
    slug: "sha1-hash-generator",
    name: "SHA1 Hash Generator",
    description: "Generate SHA1 hash of any text string",
    shortDesc: "Generate SHA1 hash",
    category: "security",
    tags: ["sha1", "hash", "encrypt", "checksum"],
    icon: "Shield",
    featured: false,
    metaTitle: "SHA1 Hash Generator - Generate SHA1 Online",
    metaDescription: "Generate SHA1 hash of any string online for free.",
  },
  {
    slug: "sha256-hash-generator",
    name: "SHA256 Hash Generator",
    description: "Generate SHA256 hash of any text string",
    shortDesc: "Generate SHA256 hash",
    category: "security",
    tags: ["sha256", "hash", "encrypt", "checksum"],
    icon: "ShieldCheck",
    featured: true,
    metaTitle: "SHA256 Hash Generator - Generate SHA256 Online",
    metaDescription: "Generate SHA256 cryptographic hash of any string online.",
  },
  {
    slug: "bcrypt-hash-generator",
    name: "Bcrypt Hash Generator",
    description: "Generate and verify Bcrypt password hashes",
    shortDesc: "Generate Bcrypt password hashes",
    category: "security",
    tags: ["bcrypt", "hash", "password", "encrypt"],
    icon: "ShieldCheck",
    featured: true,
    metaTitle: "Bcrypt Hash Generator - Generate Bcrypt Online",
    metaDescription:
      "Generate Bcrypt hashes online. Includes hash verification tool.",
  },
  {
    slug: "hmac-generator",
    name: "HMAC Generator",
    description: "Generate HMAC signatures using SHA256 or SHA512",
    shortDesc: "Generate HMAC signatures",
    category: "security",
    tags: ["hmac", "hash", "signature", "crypto"],
    icon: "Key",
    featured: false,
    metaTitle: "HMAC Generator - Generate HMAC Online",
    metaDescription: "Generate HMAC-SHA256 and HMAC-SHA512 signatures online.",
  },
  {
    slug: "password-hash-generator",
    name: "Password Hash Generator",
    description: "Generate secure password hashes using multiple algorithms",
    shortDesc: "Hash passwords securely",
    category: "security",
    tags: ["password", "hash", "bcrypt", "security"],
    icon: "Key",
    featured: false,
    metaTitle: "Password Hash Generator - Hash Passwords Online",
    metaDescription:
      "Generate secure password hashes online using Bcrypt, SHA256 and more.",
  },
  // WEBDEV
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    description: "Generate random UUID v4 strings instantly",
    shortDesc: "Generate random UUIDs",
    category: "webdev",
    tags: ["uuid", "guid", "generate", "random"],
    icon: "Shuffle",
    featured: true,
    metaTitle: "UUID Generator - Generate UUID v4 Online",
    metaDescription:
      "Generate random UUID v4 strings online. Bulk generation supported.",
  },
  {
    slug: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert Unix timestamps to human-readable dates and back",
    shortDesc: "Convert Unix timestamps",
    category: "webdev",
    tags: ["timestamp", "unix", "date", "convert", "epoch"],
    icon: "Clock",
    featured: true,
    metaTitle: "Timestamp Converter - Unix Timestamp to Date Online",
    metaDescription:
      "Convert Unix timestamps to readable dates and dates to timestamps online.",
  },
  {
    slug: "cron-expression-generator",
    name: "Cron Expression Generator",
    description: "Build and validate cron expressions with a visual editor",
    shortDesc: "Build cron expressions visually",
    category: "webdev",
    tags: ["cron", "schedule", "expression", "job"],
    icon: "Clock",
    featured: true,
    metaTitle: "Cron Expression Generator - Cron Builder Online",
    metaDescription:
      "Generate cron expressions with a visual builder. See human-readable schedule.",
  },
  {
    slug: "http-header-checker",
    name: "HTTP Header Checker",
    description: "Check and analyze HTTP response headers for any URL",
    shortDesc: "Check HTTP response headers",
    category: "webdev",
    tags: ["http", "headers", "check", "response"],
    icon: "Radio",
    featured: false,
    metaTitle: "HTTP Header Checker - Check HTTP Headers Online",
    metaDescription:
      "Check HTTP response headers for any URL online. Analyze security headers.",
  },
  {
    slug: "api-request-tester",
    name: "API Request Tester",
    description: "Test API endpoints with custom headers and body",
    shortDesc: "Test API endpoints online",
    category: "webdev",
    tags: ["api", "http", "test", "request", "rest"],
    icon: "Rocket",
    featured: true,
    metaTitle: "API Request Tester - Test REST APIs Online",
    metaDescription:
      "Test REST API endpoints online. Supports GET, POST, PUT, DELETE with custom headers.",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description:
      "Decode and inspect JWT tokens — header, payload, and signature",
    shortDesc: "Decode JWT tokens",
    category: "webdev",
    tags: ["jwt", "token", "decode", "auth"],
    icon: "Unlock",
    featured: true,
    metaTitle: "JWT Decoder - Decode JWT Tokens Online",
    metaDescription:
      "Decode JWT tokens online. Inspect header, payload, and verify structure.",
  },
  // CSS
  {
    slug: "css-box-shadow-generator",
    name: "CSS Box Shadow Generator",
    description: "Generate CSS box shadow with live preview",
    shortDesc: "Generate box-shadow CSS",
    category: "css",
    tags: ["css", "box-shadow", "shadow", "generate"],
    icon: "Square",
    featured: true,
    metaTitle: "CSS Box Shadow Generator - Box Shadow Tool Online",
    metaDescription:
      "Generate CSS box shadow visually with live preview. Copy code instantly.",
  },
  {
    slug: "css-gradient-generator",
    name: "CSS Gradient Generator",
    description: "Create linear and radial CSS gradients with live preview",
    shortDesc: "Generate CSS gradients",
    category: "css",
    tags: ["css", "gradient", "linear", "radial", "generate"],
    icon: "Layers",
    featured: true,
    metaTitle: "CSS Gradient Generator - Create CSS Gradients Online",
    metaDescription:
      "Generate beautiful CSS gradients online. Linear, radial and conic gradients.",
  },
  {
    slug: "css-border-radius-generator",
    name: "CSS Border Radius Generator",
    description: "Generate CSS border-radius values visually",
    shortDesc: "Generate border-radius CSS",
    category: "css",
    tags: ["css", "border-radius", "rounded", "generate"],
    icon: "Maximize",
    featured: false,
    metaTitle: "CSS Border Radius Generator - Border Radius Tool",
    metaDescription:
      "Generate CSS border-radius values with live visual preview.",
  },
  {
    slug: "css-button-generator",
    name: "CSS Button Generator",
    description: "Design and generate CSS button styles with live preview",
    shortDesc: "Generate CSS button styles",
    category: "css",
    tags: ["css", "button", "style", "generate"],
    icon: "MousePointer",
    featured: false,
    metaTitle: "CSS Button Generator - Design CSS Buttons Online",
    metaDescription:
      "Generate CSS button styles online with live preview. Copy ready-to-use CSS.",
  },
  {
    slug: "flexbox-generator",
    name: "Flexbox Generator",
    description: "Visually generate CSS flexbox layouts",
    shortDesc: "Generate flexbox CSS visually",
    category: "css",
    tags: ["css", "flexbox", "layout", "generate"],
    icon: "Layout",
    featured: true,
    metaTitle: "Flexbox Generator - CSS Flexbox Tool Online",
    metaDescription:
      "Generate CSS flexbox layouts visually. See live preview and copy CSS code.",
  },
  // HTML
  {
    slug: "html-table-generator",
    name: "HTML Table Generator",
    description:
      "Generate HTML table code with custom rows, columns, and styling",
    shortDesc: "Generate HTML table code",
    category: "html",
    tags: ["html", "table", "generate", "grid"],
    icon: "Table",
    featured: false,
    metaTitle: "HTML Table Generator - Generate HTML Tables Online",
    metaDescription:
      "Generate HTML table code online. Customize rows, columns, borders and styling.",
  },
  {
    slug: "html-entity-encoder",
    name: "HTML Entity Encoder",
    description: "Encode text into HTML entities",
    shortDesc: "Encode text to HTML entities",
    category: "html",
    tags: ["html", "entity", "encode", "escape"],
    icon: "Tag",
    featured: false,
    metaTitle: "HTML Entity Encoder - Encode HTML Entities Online",
    metaDescription: "Encode special characters to HTML entities online.",
  },
  {
    slug: "html-entity-decoder",
    name: "HTML Entity Decoder",
    description: "Decode HTML entities back to readable text",
    shortDesc: "Decode HTML entities to text",
    category: "html",
    tags: ["html", "entity", "decode", "unescape"],
    icon: "Tag",
    featured: false,
    metaTitle: "HTML Entity Decoder - Decode HTML Entities Online",
    metaDescription: "Decode HTML entities back to plain text online.",
  },
  // DATA CONVERSION
  {
    slug: "json-to-excel",
    name: "JSON to Excel Converter",
    description: "Convert JSON data to Excel (.xlsx) file for download",
    shortDesc: "Convert JSON to Excel file",
    category: "data-conversion",
    tags: ["json", "excel", "xlsx", "convert", "download"],
    icon: "FileSpreadsheet",
    featured: true,
    metaTitle: "JSON to Excel Converter - Convert JSON to XLSX Online",
    metaDescription:
      "Convert JSON to Excel XLSX file online. Download your spreadsheet instantly.",
  },
  {
    slug: "excel-to-json",
    name: "Excel to JSON Converter",
    description: "Convert Excel (.xlsx) files to JSON data",
    shortDesc: "Convert Excel to JSON",
    category: "data-conversion",
    tags: ["excel", "xlsx", "json", "convert", "import"],
    icon: "FileSpreadsheet",
    featured: true,
    metaTitle: "Excel to JSON Converter - Convert XLSX to JSON Online",
    metaDescription:
      "Upload an Excel file and convert it to JSON format online.",
  },
  {
    slug: "csv-to-excel",
    name: "CSV to Excel Converter",
    description: "Convert CSV files to Excel format",
    shortDesc: "Convert CSV to Excel",
    category: "data-conversion",
    tags: ["csv", "excel", "xlsx", "convert"],
    icon: "Table",
    featured: false,
    metaTitle: "CSV to Excel Converter - Convert CSV to XLSX Online",
    metaDescription:
      "Convert CSV to Excel XLSX format online. Free and instant.",
  },
  {
    slug: "xml-to-csv",
    name: "XML to CSV Converter",
    description: "Convert XML data to CSV format",
    shortDesc: "Convert XML to CSV",
    category: "data-conversion",
    tags: ["xml", "csv", "convert"],
    icon: "FileCode",
    featured: false,
    metaTitle: "XML to CSV Converter - Convert XML to CSV Online",
    metaDescription:
      "Convert XML to CSV format online. Free tool with instant results.",
  },
  {
    slug: "yaml-to-json",
    name: "YAML to JSON Converter",
    description: "Convert YAML configuration files to JSON format",
    shortDesc: "Convert YAML to JSON",
    category: "data-conversion",
    tags: ["yaml", "json", "convert", "config"],
    icon: "RefreshCw",
    featured: true,
    metaTitle: "YAML to JSON Converter - Convert YAML to JSON Online",
    metaDescription:
      "Convert YAML to JSON online. Supports nested structures and arrays.",
  },
  {
    slug: "json-to-yaml",
    name: "JSON to YAML Converter",
    description: "Convert JSON to YAML configuration format",
    shortDesc: "Convert JSON to YAML",
    category: "data-conversion",
    tags: ["json", "yaml", "convert", "config"],
    icon: "RefreshCw",
    featured: false,
    metaTitle: "JSON to YAML Converter - Convert JSON to YAML Online",
    metaDescription:
      "Convert JSON to YAML format online. Clean and readable YAML output.",
  },
  // DOCUMENT CONVERSION
  {
    slug: "pdf-to-word",
    name: "PDF to Word Converter",
    description: "Convert PDF files to editable Word documents",
    shortDesc: "Convert PDF to Word doc",
    category: "document-conversion",
    tags: ["pdf", "word", "docx", "convert"],
    icon: "FileText",
    featured: true,
    metaTitle: "PDF to Word Converter - Convert PDF to DOCX Online",
    metaDescription:
      "Convert PDF to editable Word document online. Free and fast.",
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF Converter",
    description: "Convert Word documents to PDF format",
    shortDesc: "Convert Word to PDF",
    category: "document-conversion",
    tags: ["word", "docx", "pdf", "convert"],
    icon: "FileText",
    featured: true,
    metaTitle: "Word to PDF Converter - Convert DOCX to PDF Online",
    metaDescription:
      "Convert Word documents to PDF online. Preserves formatting.",
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG Converter",
    description: "Convert PDF pages to JPG images",
    shortDesc: "Convert PDF pages to JPG",
    category: "document-conversion",
    tags: ["pdf", "jpg", "image", "convert"],
    icon: "Image",
    featured: false,
    metaTitle: "PDF to JPG Converter - Convert PDF to Images Online",
    metaDescription:
      "Convert PDF pages to JPG images online. Each page becomes an image.",
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF Converter",
    description: "Convert JPG images to PDF files",
    shortDesc: "Convert JPG images to PDF",
    category: "document-conversion",
    tags: ["jpg", "jpeg", "pdf", "convert", "image"],
    icon: "Image",
    featured: false,
    metaTitle: "JPG to PDF Converter - Convert Images to PDF Online",
    metaDescription:
      "Convert JPG images to PDF online. Combine multiple images into one PDF.",
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF Converter",
    description: "Convert Excel spreadsheets to PDF format",
    shortDesc: "Convert Excel to PDF",
    category: "document-conversion",
    tags: ["excel", "xlsx", "pdf", "convert"],
    icon: "FileSpreadsheet",
    featured: false,
    metaTitle: "Excel to PDF Converter - Convert XLSX to PDF Online",
    metaDescription:
      "Convert Excel spreadsheets to PDF online. Preserves table formatting.",
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel Converter",
    description: "Extract tables from PDF and convert to Excel",
    shortDesc: "Convert PDF tables to Excel",
    category: "document-conversion",
    tags: ["pdf", "excel", "xlsx", "convert", "table"],
    icon: "FileSpreadsheet",
    featured: false,
    metaTitle: "PDF to Excel Converter - Extract PDF Tables to XLSX",
    metaDescription: "Convert PDF tables to Excel spreadsheet online.",
  },
  // MISC
  {
    slug: "lorem-ipsum-generator",
    name: "Lorem Ipsum Generator",
    description:
      "Generate placeholder Lorem Ipsum text for designs and mockups",
    shortDesc: "Generate placeholder text",
    category: "misc",
    tags: ["lorem ipsum", "placeholder", "text", "generate"],
    icon: "AlignLeft",
    featured: false,
    metaTitle: "Lorem Ipsum Generator - Generate Placeholder Text",
    metaDescription:
      "Generate Lorem Ipsum placeholder text online. Choose paragraphs, sentences or words.",
  },
  {
    slug: "random-string-generator",
    name: "Random String Generator",
    description:
      "Generate random strings with custom length and character sets",
    shortDesc: "Generate random strings",
    category: "misc",
    tags: ["random", "string", "generate", "password"],
    icon: "Shuffle",
    featured: false,
    metaTitle: "Random String Generator - Generate Random Strings Online",
    metaDescription:
      "Generate random strings online. Custom length, uppercase, lowercase, numbers, symbols.",
  },
  {
    slug: "random-color-generator",
    name: "Random Color Generator",
    description: "Generate random colors with HEX, RGB, and HSL values",
    shortDesc: "Generate random colors",
    category: "misc",
    tags: ["color", "random", "hex", "rgb", "generate"],
    icon: "Palette",
    featured: false,
    metaTitle: "Random Color Generator - Generate Random Colors Online",
    metaDescription:
      "Generate random colors online. Get HEX, RGB, and HSL values instantly.",
  },
  {
    slug: "color-code-converter",
    name: "Color Code Converter",
    description: "Convert colors between HEX, RGB, HSL, and CMYK formats",
    shortDesc: "Convert HEX, RGB, HSL colors",
    category: "misc",
    tags: ["color", "hex", "rgb", "hsl", "convert"],
    icon: "Palette",
    featured: true,
    metaTitle: "Color Code Converter - HEX RGB HSL Converter Online",
    metaDescription:
      "Convert colors between HEX, RGB, HSL and CMYK online. Live color preview.",
  },
  {
    slug: "favicon-generator",
    name: "Favicon Generator",
    description: "Generate favicon.ico from text or upload an image",
    shortDesc: "Generate favicon for websites",
    category: "misc",
    tags: ["favicon", "icon", "generate", "website"],
    icon: "Star",
    featured: false,
    metaTitle: "Favicon Generator - Create Favicon Online Free",
    metaDescription:
      "Generate favicon.ico files online. Create from text or upload an image.",
  },
  {
    slug: "url-parser",
    name: "URL Parser",
    description: "Parse and break down any URL into its components",
    shortDesc: "Parse URL into components",
    category: "misc",
    tags: ["url", "parse", "components", "query string"],
    icon: "Link",
    featured: false,
    metaTitle: "URL Parser - Parse URL Components Online",
    metaDescription:
      "Parse any URL into protocol, host, path, query parameters and fragment online.",
  },
  {
    slug: "sql-query-generator",
    name: "SQL Query Generator",
    description: "Generate SQL SELECT, INSERT, UPDATE, DELETE queries visually",
    shortDesc: "Generate SQL queries visually",
    category: "misc",
    tags: ["sql", "query", "generate", "select", "insert"],
    icon: "Database",
    featured: true,
    metaTitle: "SQL Query Generator - Generate SQL Queries Online",
    metaDescription:
      "Generate SQL queries visually. Build SELECT, INSERT, UPDATE and DELETE statements.",
  },
];


// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getToolBySlug(slug) {
  return tools.find((tool) => tool.slug === slug) || null;
}

export function getToolsByCategory(category) {
  return tools.filter((tool) => tool.category === category);
}

export function getFeaturedTools() {
  return tools.filter((tool) => tool.featured === true);
}

export function searchTools(query) {
  const q = query.toLowerCase().trim();
  if (!q) return tools;
  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      tool.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      tool.category.toLowerCase().includes(q)
  );
}

export function getAllSlugs() {
  return tools.map((tool) => tool.slug);
}

export function getAllCategories() {
  return [...new Set(tools.map((tool) => tool.category))];
}

export function getToolCount() {
  return tools.length;
}

export function getToolCountByCategory(category) {
  return tools.filter((tool) => tool.category === category).length;
}