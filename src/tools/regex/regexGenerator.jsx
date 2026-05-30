"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { copyToClipboard } from "@/lib/helpers";
import { CheckCircle, Search, Globe, FileText } from "lucide-react";
import { BookOpen, Wrench } from "lucide-react";

// ============================================================
// REGEX GENERATOR
// Pattern library + builder + live tester
// Covers: validation, extraction, transformation patterns
// ============================================================

// ── Pattern library ───────────────────────────────────────────
const PATTERN_LIBRARY = {
  validation: {
    label: "Validation",
    icon:  CheckCircle,
    color: "text-green-700 bg-green-50 border-green-200",
    patterns: [
      {
        id:      "email",
        name:    "Email address",
        desc:    "Validates standard email addresses",
        pattern: "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$",
        flags:   "i",
        examples:{
          valid:   ["user@example.com","name.last+tag@sub.domain.co.uk","test123@company.io"],
          invalid: ["notanemail","@nodomain.com","missing@.com","user@domain"],
        },
        lang: {
          js:     `/^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$/i`,
          python: `r"^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"`,
          java:   `"^[a-zA-Z0-9._%+\\\\-]+@[a-zA-Z0-9.\\\\-]+\\\\.[a-zA-Z]{2,}$"`,
          php:    `'/^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$/i'`,
        },
      },
      {
        id:      "url",
        name:    "URL (http/https)",
        desc:    "Matches http and https URLs with optional path, query and fragment",
        pattern: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&\\/=]*)",
        flags:   "i",
        examples:{
          valid:   ["https://devtools.app","http://www.example.com/path?q=1#section","https://sub.domain.co.uk:8080/api"],
          invalid: ["ftp://not-http.com","just-text","missing-protocol.com"],
        },
        lang: {
          js:     `/https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&\\/=]*)/i`,
          python: `r"https?://(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)"`,
          java:   `"https?://(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)"`,
          php:    `'/https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&\\/=]*)/i'`,
        },
      },
      {
        id:      "phone-us",
        name:    "US phone number",
        desc:    "Matches US phone numbers in various formats",
        pattern: "^(\\+1[\\s.-]?)?\\(?([2-9]\\d{2})\\)?[\\s.-]?([2-9]\\d{2})[\\s.-]?(\\d{4})$",
        flags:   "",
        examples:{
          valid:   ["(415) 555-1234","415-555-1234","4155551234","+1 415 555 1234","415.555.1234"],
          invalid: ["123-456-7890","555-1234","not-a-phone"],
        },
        lang: {
          js:     `/^(\\+1[\\s.-]?)?\\(?([2-9]\\d{2})\\)?[\\s.-]?([2-9]\\d{2})[\\s.-]?(\\d{4})$/`,
          python: `r"^(\\+1[\\s.-]?)?\\(?([2-9]\\d{2})\\)?[\\s.-]?([2-9]\\d{2})[\\s.-]?(\\d{4})$"`,
          java:   `"^(\\\\+1[\\\\s.-]?)?\\\\(?([2-9]\\\\d{2})\\\\)?[\\\\s.-]?([2-9]\\\\d{2})[\\\\s.-]?(\\\\d{4})$"`,
          php:    `'/^(\\+1[\\s.-]?)?\\(?([2-9]\\d{2})\\)?[\\s.-]?([2-9]\\d{2})[\\s.-]?(\\d{4})$/'`,
        },
      },
      {
        id:      "ip-v4",
        name:    "IPv4 address",
        desc:    "Validates IPv4 addresses (0-255 per octet)",
        pattern: "^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$",
        flags:   "",
        examples:{
          valid:   ["192.168.1.1","0.0.0.0","255.255.255.255","10.0.0.1"],
          invalid: ["256.0.0.1","192.168.1","999.999.999.999","not.an.ip.addr"],
        },
        lang: {
          js:     `/^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/`,
          python: `r"^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$"`,
          java:   `"^((25[0-5]|2[0-4]\\\\d|[01]?\\\\d\\\\d?)\\\\.){3}(25[0-5]|2[0-4]\\\\d|[01]?\\\\d\\\\d?)$"`,
          php:    `'/^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$/'`,
        },
      },
      {
        id:      "hex-color",
        name:    "Hex color code",
        desc:    "Matches 3 or 6 digit hex color codes with optional #",
        pattern: "^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$",
        flags:   "i",
        examples:{
          valid:   ["#FF5733","#fff","FF5733","abc","#A1B2C3"],
          invalid: ["#GG0000","#12345","red","12345678"],
        },
        lang: {
          js:     `/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/i`,
          python: `r"^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"`,
          java:   `"(?i)^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"`,
          php:    `'/^#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$/i'`,
        },
      },
      {
        id:      "slug",
        name:    "URL slug",
        desc:    "Validates URL-friendly slugs (lowercase, hyphens, numbers)",
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        flags:   "",
        examples:{
          valid:   ["my-blog-post","article-123","devtools","hello-world-2024"],
          invalid: ["My-Post","has spaces","ends-with-","--double-hyphen"],
        },
        lang: {
          js:     `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`,
          python: `r"^[a-z0-9]+(?:-[a-z0-9]+)*$"`,
          java:   `"^[a-z0-9]+(?:-[a-z0-9]+)*$"`,
          php:    `'/^[a-z0-9]+(?:-[a-z0-9]+)*$/'`,
        },
      },
      {
        id:      "password-strong",
        name:    "Strong password",
        desc:    "Min 8 chars, uppercase, lowercase, digit, special char",
        pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$",
        flags:   "",
        examples:{
          valid:   ["P@ssw0rd!","Secur3#Pass","MyStr0ng&Pwd!"],
          invalid: ["password","Password1","PASS@WORD1","short1!A"],
        },
        lang: {
          js:     `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$/`,
          python: `r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$"`,
          java:   `"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\\\d)(?=.*[^a-zA-Z\\\\d]).{8,}$"`,
          php:    `'/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).{8,}$/'`,
        },
      },
      {
        id:      "date-iso",
        name:    "ISO 8601 date",
        desc:    "Matches YYYY-MM-DD format dates",
        pattern: "^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$",
        flags:   "",
        examples:{
          valid:   ["2024-03-19","2000-01-01","1999-12-31"],
          invalid: ["2024-13-01","2024-00-15","19-03-2024","2024/03/19"],
        },
        lang: {
          js:     `/^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/`,
          python: `r"^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$"`,
          java:   `"^(\\\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\\\d|3[01])$"`,
          php:    `'/^(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/'`,
        },
      },
      {
        id:      "uuid",
        name:    "UUID / GUID",
        desc:    "Matches UUID v1-v5 in standard format",
        pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
        flags:   "i",
        examples:{
          valid:   ["550e8400-e29b-41d4-a716-446655440000","6ba7b810-9dad-11d1-80b4-00c04fd430c8"],
          invalid: ["not-a-uuid","550e8400-e29b-41d4-a716","123456789012345678901234567890123456"],
        },
        lang: {
          js:     `/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`,
          python: `r"(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"`,
          java:   `"(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"`,
          php:    `'/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i'`,
        },
      },
      {
        id:      "credit-card",
        name:    "Credit card number",
        desc:    "Matches major card formats (Visa, MC, Amex, Discover)",
        pattern: "^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})$",
        flags:   "",
        examples:{
          valid:   ["4111111111111111","5500005555555559","371449635398431","6011111111111117"],
          invalid: ["1234567890123456","411111111111111","not-a-card"],
        },
        lang: {
          js:     `/^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})$/`,
          python: `r"^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})$"`,
          java:   `"^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\\\d{3})\\\\d{11})$"`,
          php:    `'/^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\\d{3})\\d{11})$/'`,
        },
      },
      {
        id:      "zip-us",
        name:    "US ZIP code",
        desc:    "Matches 5-digit or 5+4 digit ZIP codes",
        pattern: "^\\d{5}(?:-\\d{4})?$",
        flags:   "",
        examples:{
          valid:   ["94105","10001-1234","00501","99999-0000"],
          invalid: ["1234","123456","9410A","94105-12345"],
        },
        lang: {
          js:     `/^\\d{5}(?:-\\d{4})?$/`,
          python: `r"^\\d{5}(?:-\\d{4})?$"`,
          java:   `"^\\\\d{5}(?:-\\\\d{4})?$"`,
          php:    `'/^\\d{5}(?:-\\d{4})?$/'`,
        },
      },
      {
        id:      "username",
        name:    "Username",
        desc:    "3–20 chars: letters, numbers, underscores, hyphens",
        pattern: "^[a-zA-Z0-9_\\-]{3,20}$",
        flags:   "",
        examples:{
          valid:   ["john_doe","user123","my-handle","DevTools_2024"],
          invalid: ["ab","this_username_is_too_long_for_validation","has space","has@symbol"],
        },
        lang: {
          js:     `/^[a-zA-Z0-9_\\-]{3,20}$/`,
          python: `r"^[a-zA-Z0-9_\\-]{3,20}$"`,
          java:   `"^[a-zA-Z0-9_\\\\-]{3,20}$"`,
          php:    `'/^[a-zA-Z0-9_\\-]{3,20}$/'`,
        },
      },
    ],
  },
  extraction: {
    label: "Extraction",
    icon:  Search,
    color: "text-blue-700 bg-blue-50 border-blue-200",
    patterns: [
      {
        id:      "extract-email",
        name:    "Extract emails",
        desc:    "Find all email addresses in text (global match)",
        pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}",
        flags:   "gi",
        examples:{
          valid:   ["Contact us at hello@example.com or support@devtools.app","Email: john.doe@company.co.uk"],
          invalid: [],
        },
        lang: {
          js:     `/[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/gi`,
          python: `r"[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}"`,
          java:   `"[a-zA-Z0-9._%+\\\\-]+@[a-zA-Z0-9.\\\\-]+\\\\.[a-zA-Z]{2,}"`,
          php:    `'/[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}/gi'`,
        },
      },
      {
        id:      "extract-url",
        name:    "Extract URLs",
        desc:    "Find all http/https URLs in text",
        pattern: "https?:\\/\\/[^\\s<>\"']+",
        flags:   "gi",
        examples:{
          valid:   ["Visit https://devtools.app and http://example.com/path?q=1 for more info."],
          invalid: [],
        },
        lang: {
          js:     `/https?:\\/\\/[^\\s<>"']+/gi`,
          python: `r"https?://[^\\s<>\"']+"`,
          java:   `"https?://[^\\s<>\"']+"`,
          php:    `'/https?:\\/\\/[^\\s<>"\']+/gi'`,
        },
      },
      {
        id:      "extract-hashtag",
        name:    "Hashtags",
        desc:    "Extract social media hashtags",
        pattern: "#[a-zA-Z_][a-zA-Z0-9_]*",
        flags:   "g",
        examples:{
          valid:   ["Check out #DevTools and #WebDev for #programming tips!","#JavaScript #TypeScript #React"],
          invalid: [],
        },
        lang: {
          js:     `/#[a-zA-Z_][a-zA-Z0-9_]*/g`,
          python: `r"#[a-zA-Z_][a-zA-Z0-9_]*"`,
          java:   `"#[a-zA-Z_][a-zA-Z0-9_]*"`,
          php:    `'/#[a-zA-Z_][a-zA-Z0-9_]*/g'`,
        },
      },
      {
        id:      "extract-number",
        name:    "Numbers (int & float)",
        desc:    "Extract integers and decimal numbers from text",
        pattern: "-?\\d+(?:\\.\\d+)?",
        flags:   "g",
        examples:{
          valid:   ["The price is $29.99 and tax is 8.75%, total: 32.60","Temperature: -15.5°C to 42°F"],
          invalid: [],
        },
        lang: {
          js:     `/-?\\d+(?:\\.\\d+)?/g`,
          python: `r"-?\\d+(?:\\.\\d+)?"`,
          java:   `"-?\\\\d+(?:\\\\.\\\\d+)?"`,
          php:    `'/-?\\d+(?:\\.\\d+)?/g'`,
        },
      },
      {
        id:      "extract-ip",
        name:    "IP addresses",
        desc:    "Extract IPv4 addresses from text or logs",
        pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b",
        flags:   "g",
        examples:{
          valid:   ["Server at 192.168.1.100 failed, redirecting to 10.0.0.1","Access from 203.0.113.42"],
          invalid: [],
        },
        lang: {
          js:     `/\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b/g`,
          python: `r"\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b"`,
          java:   `"\\\\b(?:(?:25[0-5]|2[0-4]\\\\d|[01]?\\\\d\\\\d?)\\\\.){3}(?:25[0-5]|2[0-4]\\\\d|[01]?\\\\d\\\\d?)\\\\b"`,
          php:    `'/\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b/g'`,
        },
      },
      {
        id:      "extract-hex-color",
        name:    "Hex colors in CSS",
        desc:    "Extract hex color values from CSS/code",
        pattern: "#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b",
        flags:   "g",
        examples:{
          valid:   ["color: #FF5733; background: #fff; border: 1px solid #A1B2C3;"],
          invalid: [],
        },
        lang: {
          js:     `/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b/g`,
          python: `r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b"`,
          java:   `"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\\\b"`,
          php:    `'/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b/g'`,
        },
      },
      {
        id:      "extract-mention",
        name:    "@mentions",
        desc:    "Extract @username mentions from text",
        pattern: "@[a-zA-Z0-9_]{1,50}",
        flags:   "g",
        examples:{
          valid:   ["Thanks @john_doe and @jane_smith for your help!","Ping @devtools for support"],
          invalid: [],
        },
        lang: {
          js:     `/@[a-zA-Z0-9_]{1,50}/g`,
          python: `r"@[a-zA-Z0-9_]{1,50}"`,
          java:   `"@[a-zA-Z0-9_]{1,50}"`,
          php:    `'/@[a-zA-Z0-9_]{1,50}/g'`,
        },
      },
      {
        id:      "extract-date",
        name:    "Dates (multiple formats)",
        desc:    "Extract MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD dates",
        pattern: "(?:\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})",
        flags:   "g",
        examples:{
          valid:   ["Order placed on 03/19/2026, ships by 2026-03-25","Event: 25-12-2025"],
          invalid: [],
        },
        lang: {
          js:     `/(?:\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})/g`,
          python: `r"(?:\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})"`,
          java:   `"(?:\\\\d{1,2}[\\\\/-]\\\\d{1,2}[\\\\/-]\\\\d{2,4}|\\\\d{4}-\\\\d{2}-\\\\d{2})"`,
          php:    `'/(?:\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|\\d{4}-\\d{2}-\\d{2})/g'`,
        },
      },
    ],
  },
  web: {
    label: "Web & Code",
    icon:  Globe,
    color: "text-purple-700 bg-purple-50 border-purple-200",
    patterns: [
      {
        id:      "html-tag",
        name:    "HTML tags",
        desc:    "Match HTML tags (opening, closing, self-closing)",
        pattern: "<\\/?[a-z][a-z0-9]*(?:\\s+[^>]*)?>",
        flags:   "gi",
        examples:{
          valid:   ['<div class="container">','<img src="photo.jpg" alt=""/>','</p>','<br/>'],
          invalid: ["<<double","< spaced","<123invalid>"],
        },
        lang: {
          js:     `/<\\/?[a-z][a-z0-9]*(?:\\s+[^>]*)?>/ gi`,
          python: `r"<\\/?[a-z][a-z0-9]*(?:\\s+[^>]*)?>`, 
          java:   `"<\\\\/?[a-z][a-z0-9]*(?:\\\\s+[^>]*)?>`, 
          php:    `'/<\\/?[a-z][a-z0-9]*(?:\\s+[^>]*)?>/gi'`,
        },
      },
      {
        id:      "css-class",
        name:    "CSS class names",
        desc:    "Match CSS class selectors in stylesheets",
        pattern: "\\.[a-zA-Z_-][a-zA-Z0-9_-]*",
        flags:   "g",
        examples:{
          valid:   [".container .hero__title .btn--primary .nav_link"],
          invalid: [],
        },
        lang: {
          js:     `/\\.[a-zA-Z_-][a-zA-Z0-9_-]*/g`,
          python: `r"\\.[a-zA-Z_-][a-zA-Z0-9_-]*"`,
          java:   `"\\\\.[a-zA-Z_-][a-zA-Z0-9_-]*"`,
          php:    `'/\\.[a-zA-Z_-][a-zA-Z0-9_-]*/g'`,
        },
      },
      {
        id:      "js-variable",
        name:    "JS const/let/var declarations",
        desc:    "Match variable declarations in JavaScript",
        pattern: "\\b(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\b",
        flags:   "g",
        examples:{
          valid:   ["const userName = 'Alice';","let count = 0;","var legacyVar = true;"],
          invalid: [],
        },
        lang: {
          js:     `/\\b(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\b/g`,
          python: `r"\\b(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\b"`,
          java:   `"\\\\b(?:const|let|var)\\\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\\\b"`,
          php:    `'/\\b(?:const|let|var)\\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\\b/g'`,
        },
      },
      {
        id:      "json-key",
        name:    "JSON keys",
        desc:    "Extract all keys from a JSON string",
        pattern: '"([^"]+)"\\s*:',
        flags:   "g",
        examples:{
          valid:   ['{"name":"Alice","age":30,"city":"SF"}','{"id":1,"data":{"key":"value"}}'],
          invalid: [],
        },
        lang: {
          js:     `/"([^"]+)"\\s*:/g`,
          python: `r'"([^"]+)"\\s*:'`,
          java:   `"\\"([^\\"]+)\\"\\\\s*:"`,
          php:    `'/"([^"]+)"\\s*:/g'`,
        },
      },
      {
        id:      "import-statement",
        name:    "ES module imports",
        desc:    "Match import statements in JavaScript/TypeScript",
        pattern: "import\\s+(?:[^;]+)\\s+from\\s+['\"]([^'\"]+)['\"]",
        flags:   "gm",
        examples:{
          valid:   ["import { useState, useEffect } from 'react';","import axios from \"axios\";","import type { FC } from 'react';"],
          invalid: [],
        },
        lang: {
          js:     `/import\\s+(?:[^;]+)\\s+from\\s+['"]([^'"]+)['"]/gm`,
          python: `r"import\\s+(?:[^;]+)\\s+from\\s+['\"]([^'\"]+)['\"]"`,
          java:   `"import\\\\s+(?:[^;]+)\\\\s+from\\\\s+['\\\"]([^'\\\"]+)['\\\"]"`,
          php:    `'/import\\s+(?:[^;]+)\\s+from\\s+[\'"]([^\'"]+)[\'"]/gm'`,
        },
      },
      {
        id:      "sql-table",
        name:    "SQL table names",
        desc:    "Extract table names from SELECT/FROM/JOIN clauses",
        pattern: "(?:FROM|JOIN|INTO|UPDATE)\\s+([a-zA-Z_][a-zA-Z0-9_]*)",
        flags:   "gi",
        examples:{
          valid:   ["SELECT * FROM users WHERE id = 1","INSERT INTO orders (user_id) VALUES (1)","JOIN products ON orders.product_id = products.id"],
          invalid: [],
        },
        lang: {
          js:     `/(?:FROM|JOIN|INTO|UPDATE)\\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi`,
          python: `r"(?:FROM|JOIN|INTO|UPDATE)\\s+([a-zA-Z_][a-zA-Z0-9_]*)"`,
          java:   `"(?i)(?:FROM|JOIN|INTO|UPDATE)\\\\s+([a-zA-Z_][a-zA-Z0-9_]*)"`,
          php:    `'/(?:FROM|JOIN|INTO|UPDATE)\\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi'`,
        },
      },
    ],
  },
  text: {
    label: "Text Processing",
    icon:  FileText,
    color: "text-amber-700 bg-amber-50 border-amber-200",
    patterns: [
      {
        id:      "whitespace",
        name:    "Multiple whitespace",
        desc:    "Match 2 or more consecutive whitespace characters",
        pattern: "\\s{2,}",
        flags:   "g",
        examples:{
          valid:   ["too    many   spaces","tabs\there"],
          invalid: [],
        },
        lang: {
          js:     `/\\s{2,}/g`,
          python: `r"\\s{2,}"`,
          java:   `"\\\\s{2,}"`,
          php:    `'/\\s{2,}/g'`,
        },
      },
      {
        id:      "duplicate-words",
        name:    "Duplicate consecutive words",
        desc:    "Find repeated words like 'the the'",
        pattern: "\\b(\\w+)\\s+\\1\\b",
        flags:   "gi",
        examples:{
          valid:   ["The the quick quick brown fox","I went to to the store"],
          invalid: [],
        },
        lang: {
          js:     `/\\b(\\w+)\\s+\\1\\b/gi`,
          python: `r"\\b(\\w+)\\s+\\1\\b"`,
          java:   `"(?i)\\\\b(\\\\w+)\\\\s+\\\\1\\\\b"`,
          php:    `'/\\b(\\w+)\\s+\\1\\b/gi'`,
        },
      },
      {
        id:      "trim-spaces",
        name:    "Leading/trailing spaces",
        desc:    "Match leading and trailing whitespace for trimming",
        pattern: "^\\s+|\\s+$",
        flags:   "gm",
        examples:{
          valid:   ["  hello world  ","   indented line"],
          invalid: [],
        },
        lang: {
          js:     `/^\\s+|\\s+$/gm`,
          python: `r"^\\s+|\\s+$"`,
          java:   `"^\\\\s+|\\\\s+$"`,
          php:    `'/^\\s+|\\s+$/m'`,
        },
      },
      {
        id:      "camel-to-snake",
        name:    "camelCase to snake_case",
        desc:    "Find camelCase word boundaries for conversion",
        pattern: "([a-z])([A-Z])",
        flags:   "g",
        examples:{
          valid:   ["camelCaseVariable","myFunctionName","getUserById"],
          invalid: [],
        },
        lang: {
          js:     `/([a-z])([A-Z])/g  // replace with '$1_$2'.toLowerCase()`,
          python: `r"([a-z])([A-Z])"  # sub(r'\\1_\\2', s).lower()`,
          java:   `"([a-z])([A-Z])"   // replaceAll("$1_$2").toLowerCase()`,
          php:    `'/([a-z])([A-Z])/g'  // preg_replace + strtolower`,
        },
      },
      {
        id:      "empty-lines",
        name:    "Empty lines",
        desc:    "Match empty or whitespace-only lines",
        pattern: "^[\\t ]*$",
        flags:   "gm",
        examples:{
          valid:   ["line 1\n\nline 3\n   \nline 5"],
          invalid: [],
        },
        lang: {
          js:     `/^[\\t ]*$/gm`,
          python: `r"^[\\t ]*$"`,
          java:   `"^[\\\\t ]*$"`,
          php:    `'/^[\\t ]*$/m'`,
        },
      },
      {
        id:      "markdown-code",
        name:    "Markdown code blocks",
        desc:    "Match fenced code blocks in Markdown",
        pattern: "```([a-z]*)\\n([\\s\\S]*?)```",
        flags:   "g",
        examples:{
          valid:   ["```javascript\nconst x = 1;\n```","```\nplain text\n```"],
          invalid: [],
        },
       lang: {
  js:     "/```([a-z]*)\\n([\\s\\S]*?)```/g",
  python: "r'```([a-z]*)\\n([\\s\\S]*?)```'",
  java:   "\"```([a-z]*)\\n([\\s\\S]*?)```\"",
  php:    "'/```([a-z]*)\\n([\\s\\S]*?)```/g'",
},
      },
    ],
  },
};

// ── Pattern builder tokens ────────────────────────────────────
const BUILDER_TOKENS = [
  { group: "Character classes", tokens: [
    { label: "Any digit",         insert: "\\d",        desc: "Matches 0-9"               },
    { label: "Non-digit",         insert: "\\D",        desc: "Matches non-digit"          },
    { label: "Any word char",     insert: "\\w",        desc: "Matches a-z, A-Z, 0-9, _"  },
    { label: "Non-word char",     insert: "\\W",        desc: "Matches non-word"           },
    { label: "Whitespace",        insert: "\\s",        desc: "Matches space, tab, newline" },
    { label: "Non-whitespace",    insert: "\\S",        desc: "Matches non-whitespace"     },
    { label: "Any character",     insert: ".",          desc: "Matches any char except \\n"},
    { label: "Lowercase a-z",     insert: "[a-z]",      desc: "Character range a to z"     },
    { label: "Uppercase A-Z",     insert: "[A-Z]",      desc: "Character range A to Z"     },
    { label: "Alphanumeric",      insert: "[a-zA-Z0-9]",desc: "Letters and digits"         },
    { label: "Custom range",      insert: "[abc]",      desc: "Any of these characters"    },
    { label: "Negated class",     insert: "[^abc]",     desc: "None of these characters"   },
  ]},
  { group: "Anchors", tokens: [
    { label: "Start of string",   insert: "^",          desc: "Start of string or line"    },
    { label: "End of string",     insert: "$",          desc: "End of string or line"      },
    { label: "Word boundary",     insert: "\\b",        desc: "Between word and non-word"  },
    { label: "Non-word boundary", insert: "\\B",        desc: "Not at word boundary"       },
  ]},
  { group: "Quantifiers", tokens: [
    { label: "Zero or more",      insert: "*",          desc: "0 or more (greedy)"         },
    { label: "One or more",       insert: "+",          desc: "1 or more (greedy)"         },
    { label: "Zero or one",       insert: "?",          desc: "0 or 1 (optional)"          },
    { label: "Exactly N",         insert: "{3}",        desc: "Exactly N times"            },
    { label: "At least N",        insert: "{3,}",       desc: "N or more times"            },
    { label: "Between N and M",   insert: "{3,6}",      desc: "Between N and M times"      },
    { label: "Lazy (non-greedy)", insert: "*?",         desc: "Match as few as possible"   },
  ]},
  { group: "Groups & Alternation", tokens: [
    { label: "Capture group",     insert: "(abc)",      desc: "Capture for backreference"  },
    { label: "Non-capture group", insert: "(?:abc)",    desc: "Group without capturing"    },
    { label: "Named group",       insert: "(?<name>abc)",desc:"Named capture group"        },
    { label: "Lookahead",         insert: "(?=abc)",    desc: "Followed by abc"            },
    { label: "Neg. lookahead",    insert: "(?!abc)",    desc: "NOT followed by abc"        },
    { label: "Lookbehind",        insert: "(?<=abc)",   desc: "Preceded by abc"            },
    { label: "Neg. lookbehind",   insert: "(?<!abc)",   desc: "NOT preceded by abc"        },
    { label: "Alternation",       insert: "a|b",        desc: "Match a OR b"               },
  ]},
  { group: "Escaped characters", tokens: [
    { label: "Literal dot",       insert: "\\.",        desc: "Actual . character"         },
    { label: "Literal slash",     insert: "\\/",        desc: "Actual / character"         },
    { label: "Literal backslash", insert: "\\\\",       desc: "Actual \\ character"        },
    { label: "Newline",           insert: "\\n",        desc: "Line feed character"        },
    { label: "Tab",               insert: "\\t",        desc: "Tab character"              },
    { label: "Carriage return",   insert: "\\r",        desc: "Carriage return"            },
  ]},
];

// ── Flags ────────────────────────────────────────────────────
const FLAGS_INFO = [
  { flag: "g", name: "Global",      desc: "Find all matches, not just the first"      },
  { flag: "i", name: "Insensitive", desc: "Case-insensitive matching"                 },
  { flag: "m", name: "Multiline",   desc: "^ and $ match start/end of each line"      },
  { flag: "s", name: "Dotall",      desc: ". matches newline characters too"           },
  { flag: "u", name: "Unicode",     desc: "Treat pattern as Unicode code points"       },
  { flag: "y", name: "Sticky",      desc: "Match only at lastIndex position"          },
];

// ── Code generation ───────────────────────────────────────────
const LANGUAGES = [
  { value: "js",     label: "JavaScript",  icon: "JS"  },
  { value: "python", label: "Python",      icon: "PY"  },
  { value: "java",   label: "Java",        icon: "JV"  },
  { value: "php",    label: "PHP",         icon: "PHP" },
];

function generateCode(pattern, flags, language) {
  const escaped = pattern.replace(/\\/g, "\\\\");

  switch (language) {
    case "js":
      return `const regex = /${pattern}/${flags};\nconst result = regex.test(str);\nconst matches = str.match(regex);`;

    case "python":
      return `import re\n\npattern = re.compile(r"${pattern}"${flags.includes("i") ? ", re.IGNORECASE" : ""}${flags.includes("m") ? " | re.MULTILINE" : ""}${flags.includes("s") ? " | re.DOTALL" : ""})\nresult = pattern.search(text)\nmatches = pattern.findall(text)`;

    case "java":
      return `import java.util.regex.*;\n\nPattern pattern = Pattern.compile("${escaped}"${flags.includes("i") ? ", Pattern.CASE_INSENSITIVE" : ""});\nMatcher matcher = pattern.matcher(input);\nboolean matches = matcher.matches();\n// Find all: while (matcher.find()) { matcher.group(); }`;

    case "php":
      return `$pattern = '/${pattern}/${flags}';\n$result = preg_match($pattern, $str);\npreg_match_all($pattern, $str, $matches);`;

    default:
      return `/${pattern}/${flags}`;
  }
}

// ── Explain regex tokens ──────────────────────────────────────
function explainPattern(pattern) {
  if (!pattern) return [];

  const explanations = [];
  let i = 0;

  const rules = [
    { re: /^\^/,                   label: "^",        desc: "Start of string/line"                   },
    { re: /^\$/,                   label: "$",        desc: "End of string/line"                     },
    { re: /^\\d/,                  label: "\\d",      desc: "Any digit (0-9)"                        },
    { re: /^\\D/,                  label: "\\D",      desc: "Any non-digit"                          },
    { re: /^\\w/,                  label: "\\w",      desc: "Word character (a-z, A-Z, 0-9, _)"      },
    { re: /^\\W/,                  label: "\\W",      desc: "Non-word character"                     },
    { re: /^\\s/,                  label: "\\s",      desc: "Whitespace character"                   },
    { re: /^\\S/,                  label: "\\S",      desc: "Non-whitespace character"               },
    { re: /^\\b/,                  label: "\\b",      desc: "Word boundary"                          },
    { re: /^\\B/,                  label: "\\B",      desc: "Non-word boundary"                      },
    { re: /^\\n/,                  label: "\\n",      desc: "Newline character"                      },
    { re: /^\\t/,                  label: "\\t",      desc: "Tab character"                          },
    { re: /^\\r/,                  label: "\\r",      desc: "Carriage return"                        },
    { re: /^\\./,                  label: "\\.",      desc: "Literal dot character"                  },
    { re: /^\\\\/,                 label: "\\\\",     desc: "Literal backslash"                      },
    { re: /^\\\//,                 label: "\\/",      desc: "Literal forward slash"                  },
    { re: /^\\./, match: "gen",    label: "\\X",      desc: "Escaped character"                      },
    { re: /^\(\?<\w+>/,            label: "(?<name>", desc: "Named capture group"                    },
    { re: /^\(\?<=/,               label: "(?<=",     desc: "Positive lookbehind"                    },
    { re: /^\(\?<!/,               label: "(?<!",     desc: "Negative lookbehind"                    },
    { re: /^\(\?=/,                label: "(?=",      desc: "Positive lookahead"                     },
    { re: /^\(\?!/,                label: "(?!",      desc: "Negative lookahead"                     },
    { re: /^\(\?:/,                label: "(?:",      desc: "Non-capturing group"                    },
    { re: /^\(/,                   label: "(",        desc: "Start of capture group"                 },
    { re: /^\)/,                   label: ")",        desc: "End of group"                           },
    { re: /^\[/,                   label: "[...]",    desc: "Character class — match any inside"     },
    { re: /^\{(\d+),(\d+)\}/,      label: "{n,m}",    desc: "Between N and M repetitions"            },
    { re: /^\{(\d+),\}/,           label: "{n,}",     desc: "N or more repetitions"                 },
    { re: /^\{(\d+)\}/,            label: "{n}",      desc: "Exactly N repetitions"                 },
    { re: /^\*\?/,                 label: "*?",       desc: "Zero or more (lazy/non-greedy)"        },
    { re: /^\+\?/,                 label: "+?",       desc: "One or more (lazy/non-greedy)"         },
    { re: /^\?\?/,                 label: "??",       desc: "Zero or one (lazy)"                    },
    { re: /^\*/,                   label: "*",        desc: "Zero or more (greedy)"                 },
    { re: /^\+/,                   label: "+",        desc: "One or more (greedy)"                  },
    { re: /^\?/,                   label: "?",        desc: "Zero or one (optional)"                },
    { re: /^\|/,                   label: "|",        desc: "Alternation — OR"                      },
    { re: /^\./,                   label: ".",        desc: "Any character (except newline)"         },
  ];

  while (i < pattern.length) {
    const remaining = pattern.slice(i);
    let matched = false;

    for (const rule of rules) {
      const m = remaining.match(rule.re);
      if (m) {
        explanations.push({
          token: m[0],
          label: rule.label,
          desc:  rule.desc,
          index: i,
        });
        i += m[0].length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Literal character
      const ch = pattern[i];
      if (/[a-zA-Z0-9]/.test(ch)) {
        explanations.push({ token: ch, label: ch, desc: `Literal character "${ch}"`, index: i });
      } else {
        explanations.push({ token: ch, label: ch, desc: `Character "${ch}"`, index: i });
      }
      i++;
    }
  }

  return explanations;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");
  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

// ── Flag toggle ───────────────────────────────────────────────
function FlagToggle({ flag, active, onToggle }) {
  const info = FLAGS_INFO.find((f) => f.flag === flag);
  return (
    <button
      onClick={() => onToggle(flag)}
      title={`${info?.name}: ${info?.desc}`}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono border cursor-pointer transition-all ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
      }`}
    >
      {flag}
    </button>
  );
}

// ── Regex input with live validation ─────────────────────────
function RegexInput({ pattern, flags, onPatternChange, onFlagsChange, error }) {
  return (
    <div className="space-y-2">
      {/* Pattern input */}
      <div className={`flex items-center bg-white border-2 rounded-xl overflow-hidden transition-colors ${
        error ? "border-red-300" : pattern ? "border-blue-300" : "border-gray-200"
      }`}>
        <span className="px-3 text-gray-400 font-mono text-lg font-light select-none">/</span>
        <input
          type="text"
          value={pattern}
          onChange={(e) => onPatternChange(e.target.value)}
          placeholder="Enter or paste regex pattern..."
          spellCheck={false}
          autoCorrect="off"
          className="flex-1 px-1 py-3 text-sm font-mono outline-none bg-transparent text-gray-900 placeholder:text-gray-300"
        />
        <span className="px-1 text-gray-400 font-mono text-lg font-light select-none">/</span>
        <div className="flex items-center gap-1 px-3 border-l border-gray-200">
          {["g","i","m","s"].map((f) => (
            <FlagToggle
              key={f}
              flag={f}
              active={flags.includes(f)}
              onToggle={(fl) => {
                const newFlags = flags.includes(fl)
                  ? flags.replace(fl, "")
                  : flags + fl;
                onFlagsChange(newFlags);
              }}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <svg width="12" height="12" className="flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-mono text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Live tester ───────────────────────────────────────────────
function LiveTester({ pattern, flags }) {
  const [testInput, setTestInput] = useState("");
  const [matches,   setMatches]   = useState([]);
  const [regexErr,  setRegexErr]  = useState(null);
  const [isValid,   setIsValid]   = useState(null);

  useEffect(() => {
    if (!pattern || !testInput) {
      setMatches([]);
      setIsValid(null);
      setRegexErr(null);
      return;
    }

    try {
      const regex   = new RegExp(pattern, flags);
      const allMatches = [];
      let m;

      if (flags.includes("g")) {
        const re = new RegExp(pattern, flags);
        let lastIndex = -1;
        while ((m = re.exec(testInput)) !== null) {
          if (m.index === lastIndex) { re.lastIndex++; continue; }
          lastIndex = m.index;
          allMatches.push({
            match:  m[0],
            index:  m.index,
            end:    m.index + m[0].length,
            groups: m.slice(1),
          });
          if (allMatches.length > 200) break; // safety
        }
      } else {
        m = regex.exec(testInput);
        if (m) {
          allMatches.push({
            match:  m[0],
            index:  m.index,
            end:    m.index + m[0].length,
            groups: m.slice(1),
          });
        }
      }

      setMatches(allMatches);
      setIsValid(allMatches.length > 0);
      setRegexErr(null);
    } catch (e) {
      setMatches([]);
      setIsValid(false);
      setRegexErr(e.message);
    }
  }, [pattern, flags, testInput]);

  // Build highlighted segments
  function buildHighlighted() {
    if (!matches.length) return [{ text: testInput, highlight: false }];

    const segments = [];
    let pos = 0;

    for (const m of matches) {
      if (m.index > pos) {
        segments.push({ text: testInput.slice(pos, m.index), highlight: false });
      }
      segments.push({ text: m.match, highlight: true });
      pos = m.end;
    }

    if (pos < testInput.length) {
      segments.push({ text: testInput.slice(pos), highlight: false });
    }

    return segments;
  }

  const segments = buildHighlighted();

  return (
    <div className="space-y-3">
      {/* Input */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border border-gray-200 rounded-t-xl">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Test Input</span>
          <div className="flex items-center gap-2">
            {isValid !== null && (
              <span className={`text-xs font-bold ${isValid ? "text-green-600" : "text-red-500"}`}>
                {isValid
                  ? `${matches.length} match${matches.length !== 1 ? "es" : ""}`
                  : "No matches"}
              </span>
            )}
            {testInput && (
              <button
                onClick={() => setTestInput("")}
                className="text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <textarea
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Type test strings here to see live matches highlighted below..."
          spellCheck={false}
          className="w-full px-4 py-3 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[100px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans"
        />
      </div>

      {/* Highlighted output */}
      {testInput && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Highlighted Matches
            </span>
          </div>
          <div className="px-4 py-3 font-mono text-sm leading-relaxed bg-white break-all whitespace-pre-wrap">
            {segments.map((seg, i) => (
              seg.highlight ? (
                <mark
                  key={i}
                  className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic font-semibold"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i} className="text-gray-700">{seg.text}</span>
              )
            ))}
          </div>
        </div>
      )}

      {/* Match details */}
      {matches.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Match Details
            </span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
            {matches.slice(0, 50).map((m, idx) => (
              <div key={idx} className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50">
                <span className="text-xs font-bold text-blue-600 w-6 flex-shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <code className="text-xs font-mono font-bold text-gray-800 bg-yellow-100 px-1.5 py-0.5 rounded">
                    {m.match || "(empty string)"}
                  </code>
                  <span className="ml-2 text-xs text-gray-400">
                    pos {m.index}–{m.end}
                  </span>
                  {m.groups.filter(Boolean).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.groups.map((g, gi) => g != null && (
                        <span key={gi} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded font-mono">
                          Group {gi + 1}: {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {matches.length > 50 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                Showing 50 of {matches.length} matches
              </div>
            )}
          </div>
        </div>
      )}

      {regexErr && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <svg width="12" height="12" className="flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-mono text-red-700">{regexErr}</p>
        </div>
      )}
    </div>
  );
}

// ── Pattern explainer ─────────────────────────────────────────
function PatternExplainer({ pattern }) {
  if (!pattern) return null;

  let tokens;
  try {
    tokens = explainPattern(pattern);
  } catch {
    return null;
  }

  if (tokens.length === 0) return null;

  const colors = [
    "bg-blue-50 border-blue-300 text-blue-800",
    "bg-purple-50 border-purple-300 text-purple-800",
    "bg-green-50 border-green-300 text-green-800",
    "bg-amber-50 border-amber-300 text-amber-800",
    "bg-rose-50 border-rose-300 text-rose-800",
    "bg-teal-50 border-teal-300 text-teal-800",
    "bg-orange-50 border-orange-300 text-orange-800",
    "bg-indigo-50 border-indigo-300 text-indigo-800",
  ];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Pattern Explanation
        </span>
      </div>
      <div className="p-4 space-y-3">
        {/* Visual token strip */}
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((tok, i) => (
            <span
              key={i}
              title={tok.desc}
              className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-mono font-bold cursor-default ${
                colors[i % colors.length]
              }`}
            >
              {tok.token}
            </span>
          ))}
        </div>

        {/* Explanation table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider w-20">Token</th>
                <th className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tokens.map((tok, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors cursor-default">
                  <td className="px-3 py-2">
                    <code className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${colors[i % colors.length]}`}>
                      {tok.token}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{tok.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Pattern card ──────────────────────────────────────────────
function PatternCard({ pattern, onSelect, isActive }) {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
        isActive
          ? "border-blue-300 ring-2 ring-blue-100 shadow-sm"
          : "border-gray-200 hover:border-blue-200 hover:shadow-sm"
      }`}
    >
      {/* Card header */}
      <div
        className={`px-4 py-3 flex items-start justify-between gap-3 ${
          isActive ? "bg-blue-50" : "bg-white hover:bg-gray-50"
        }`}
        onClick={() => onSelect(pattern)}
      >
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${isActive ? "text-blue-800" : "text-gray-800"}`}>
            {pattern.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{pattern.desc}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowExamples((v) => !v); }}
            className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            {showExamples ? "▲" : "▼"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(pattern.pattern);
            }}
            className="text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg cursor-pointer transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Pattern preview */}
      <div
        className="px-4 py-2 bg-gray-900 cursor-pointer"
        onClick={() => onSelect(pattern)}
      >
        <code className="text-xs font-mono text-green-400">
          /{pattern.pattern}/{pattern.flags}
        </code>
      </div>

      {/* Examples */}
      {showExamples && (
        <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
          {pattern.examples.valid.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1">✓ Valid:</p>
              <div className="flex flex-wrap gap-1">
                {pattern.examples.valid.slice(0, 3).map((ex) => (
                  <code key={ex} className="text-xs bg-green-50 border border-green-200 text-green-700 px-1.5 py-0.5 rounded font-mono">
                    {ex.length > 30 ? ex.slice(0, 30) + "…" : ex}
                  </code>
                ))}
              </div>
            </div>
          )}
          {pattern.examples.invalid.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-1">✗ Invalid:</p>
              <div className="flex flex-wrap gap-1">
                {pattern.examples.invalid.slice(0, 3).map((ex) => (
                  <code key={ex} className="text-xs bg-red-50 border border-red-200 text-red-700 px-1.5 py-0.5 rounded font-mono">
                    {ex}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Code generator panel ──────────────────────────────────────
function CodeGenerator({ pattern, flags }) {
  const [lang, setLang] = useState("js");

  if (!pattern) return null;

  const code = generateCode(pattern, flags, lang);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Code Snippet
        </span>
        <div className="flex items-center gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.value}
              onClick={() => setLang(l.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all border ${
                lang === l.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {l.icon}
            </button>
          ))}
          <CopyButton text={code} />
        </div>
      </div>
      <div className="bg-gray-900 p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-gray-100 whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}

// ── Builder panel ─────────────────────────────────────────────
function BuilderPanel({ onInsert }) {
  const [activeGroup, setActiveGroup] = useState(BUILDER_TOKENS[0].group);

  const group = BUILDER_TOKENS.find((g) => g.group === activeGroup);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Pattern Builder
        </span>
      </div>

      {/* Group tabs */}
      <div className="flex overflow-x-auto gap-0.5 px-2 py-1.5 bg-gray-50/50 border-b border-gray-100">
        {BUILDER_TOKENS.map((g) => (
          <button
            key={g.group}
            onClick={() => setActiveGroup(g.group)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
              activeGroup === g.group
                ? "bg-white text-blue-700 border border-gray-200 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white"
            }`}
          >
            {g.group}
          </button>
        ))}
      </div>

      {/* Token buttons */}
      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
        {group?.tokens.map((tok) => (
          <button
            key={tok.insert}
            onClick={() => onInsert(tok.insert)}
            title={tok.desc}
            className="flex flex-col items-start gap-0.5 px-2.5 py-2 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl cursor-pointer transition-all text-left"
          >
            <code className="text-xs font-mono font-bold text-blue-700">
              {tok.insert}
            </code>
            <span className="text-xs text-gray-500 leading-tight">{tok.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function RegexGenerator() {
  const [activeTab,    setActiveTab]    = useState("library");
  const [pattern,      setPattern]      = useState("");
  const [flags,        setFlags]        = useState("g");
  const [regexError,   setRegexError]   = useState(null);
  const [activePattern,setActivePattern]= useState(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [activeCategory, setActiveCategory] = useState("validation");
  const patternInputRef = useRef(null);

  // ── Validate regex live ───────────────────────────────────────
  useEffect(() => {
    if (!pattern) { setRegexError(null); return; }
    try {
      new RegExp(pattern, flags);
      setRegexError(null);
    } catch (e) {
      setRegexError(e.message);
    }
  }, [pattern, flags]);

  // ── Insert token into pattern ─────────────────────────────────
  function handleInsert(token) {
    setPattern((prev) => prev + token);
  }

  // ── Select pattern from library ───────────────────────────────
  function handleSelectPattern(pat) {
    setPattern(pat.pattern);
    setFlags(pat.flags);
    setActivePattern(pat.id);
    setActiveTab("builder");
  }

  // ── Search across all patterns ────────────────────────────────
  const allPatterns = Object.values(PATTERN_LIBRARY).flatMap((cat) => cat.patterns);
  const searchResults = searchQuery.trim()
    ? allPatterns.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const currentCategory = PATTERN_LIBRARY[activeCategory];

  const TABS = [
  { value: "library", label: "Pattern Library", icon: BookOpen },
  { value: "builder", label: "Build & Test",    icon: Wrench },
];

  return (
    <div className="space-y-5">

      {/* ── Top tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
  {TABS.map((tab) => {
    const Icon = tab.icon;

    return (
      <button
        key={tab.value}
        onClick={() => setActiveTab(tab.value)}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex-1 justify-center ${
          activeTab === tab.value
            ? "bg-white text-blue-700 shadow-sm border border-gray-200"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Icon size={16} />
        <span>{tab.label}</span>
      </button>
    );
  })}
</div>

      {/* ── Pattern Library tab ──────────────────────────────── */}
      {activeTab === "library" && (
        <div className="space-y-4">

          {/* Search */}
          <div className="relative">
            <svg width="15" height="15" className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patterns… email, URL, phone, date, UUID…"
              className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-400 transition-colors placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results */}
          {searchQuery && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {searchResults.map((pat) => (
                    <PatternCard
                      key={pat.id}
                      pattern={pat}
                      onSelect={handleSelectPattern}
                      isActive={activePattern === pat.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-3">
                  <span className="text-3xl opacity-30">🔍</span>
                  <p className="text-sm text-gray-400">No patterns match "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}

          {/* Category navigation */}
          {!searchQuery && (
            <>
             <div className="flex flex-wrap gap-2">
  {Object.entries(PATTERN_LIBRARY).map(([key, cat]) => {
    const Icon = cat.icon;

    return (
      <button
        key={key}
        onClick={() => setActiveCategory(key)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
          activeCategory === key
            ? `${cat.color} ring-1 shadow-sm`
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
        }`}
      >
        <Icon size={14} />
        <span>{cat.label}</span>
        <span
          className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
            activeCategory === key ? "bg-white/50" : "bg-gray-100"
          }`}
        >
          {cat.patterns.length}
        </span>
      </button>
    );
  })}
</div>

              {/* Pattern grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {currentCategory?.patterns.map((pat) => (
                  <PatternCard
                    key={pat.id}
                    pattern={pat}
                    onSelect={handleSelectPattern}
                    isActive={activePattern === pat.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Build & Test tab ──────────────────────────────────── */}
      {activeTab === "builder" && (
        <div className="space-y-5">

          {/* Pattern input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Regex Pattern
              </p>
              <div className="flex items-center gap-2">
                {pattern && (
                  <button
                    onClick={() => { setPattern(""); setFlags("g"); setActivePattern(null); }}
                    className="text-xs text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
                {pattern && <CopyButton text={`/${pattern}/${flags}`} label="Copy regex" />}
              </div>
            </div>

            <RegexInput
              pattern={pattern}
              flags={flags}
              onPatternChange={setPattern}
              onFlagsChange={setFlags}
              error={regexError}
            />

            {/* Flags reference */}
            <div className="flex flex-wrap gap-2">
              {FLAGS_INFO.map(({ flag, name, desc }) => (
                <div
                  key={flag}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border cursor-default ${
                    flags.includes(flag)
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  }`}
                  title={desc}
                >
                  <code className="font-bold font-mono">{flag}</code>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live tester */}
          {pattern && !regexError && (
            <LiveTester pattern={pattern} flags={flags} />
          )}

          {/* Pattern explainer */}
          {pattern && !regexError && (
            <PatternExplainer pattern={pattern} />
          )}

          {/* Builder */}
          <BuilderPanel onInsert={handleInsert} />

          {/* Code generator */}
          {pattern && !regexError && (
            <CodeGenerator pattern={pattern} flags={flags} />
          )}

          {/* Language-specific snippets from library */}
          {activePattern && (() => {
            const found = allPatterns.find((p) => p.id === activePattern);
            if (!found || !found.lang) return null;
            return (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Language Implementations — {found.name}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {Object.entries(found.lang).map(([lang, code]) => (
                    <div key={lang} className="flex items-start gap-4 px-4 py-3 hover:bg-gray-50">
                      <span className="text-xs font-bold text-gray-500 w-14 flex-shrink-0 pt-0.5 uppercase tracking-wider">
                        {lang}
                      </span>
                      <code className="text-xs font-mono text-gray-700 flex-1 break-all">
                        {code}
                      </code>
                      <CopyButton text={code} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Empty state */}
          {!pattern && (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50 gap-4">
          
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">
                  Start from the Pattern Library or type a pattern above
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Use the builder to insert tokens · Live testing · Code generation
                </p>
              </div>
              <button
                onClick={() => setActiveTab("library")}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-xl cursor-pointer transition-colors"
              >
                Browse Pattern Library
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}