import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// ============================================================
// FONTS
// ============================================================

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ============================================================
// SITE-WIDE METADATA
// ============================================================

export const metadata = {
  metadataBase: new URL("https://devtoolssite.com"),

  title: {
    default:  "DevTools — Free Online Developer Tools",
    template: "%s | DevTools",
  },

  description:
    "70+ free online developer tools. JSON formatter, Base64 encoder, regex tester, hash generator, code formatter, and more. No signup required.",

  keywords: [
    "developer tools",
    "online tools",
    "json formatter",
    "base64 encoder",
    "regex tester",
    "hash generator",
    "code formatter",
    "json validator",
    "url encoder",
    "jwt decoder",
    "free developer tools",
    "web developer utilities",
  ],

  authors:   [{ name: "DevTools" }],
  creator:   "DevTools",
  publisher: "DevTools",

  openGraph: {
    type:        "website",
    locale:      "en_US",
    url:         "https://devtoolssite.com",
    siteName:    "DevTools",
    title:       "DevTools — Free Online Developer Tools",
    description: "70+ free online developer tools. JSON formatter, Base64 encoder, regex tester, hash generator and more.",
    images: [{
      url:    "/images/og-image.png",
      width:  1200,
      height: 630,
      alt:    "DevTools — Free Online Developer Tools",
    }],
  },

  twitter: {
    card:        "summary_large_image",
    title:       "DevTools — Free Online Developer Tools",
    description: "70+ free online developer tools. JSON formatter, Base64 encoder, regex tester and more.",
    images:      ["/images/og-image.png"],
  },

  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },

  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple:    [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/icons/favicon.ico",
  },

  manifest: "/manifest.json",

  alternates: {
    canonical: "https://devtoolssite.com",
  },
};

// ============================================================
// JSON-LD STRUCTURED DATA
// ============================================================

const jsonLd = {
  "@context":   "https://schema.org",
  "@type":      "WebSite",
  name:         "DevTools",
  url:          "https://devtoolssite.com",
  description:  "70+ free online developer tools including JSON formatter, Base64 encoder, regex tester, hash generator and more.",
  potentialAction: {
    "@type":  "SearchAction",
    target: {
      "@type":      "EntryPoint",
      urlTemplate:  "https://devtoolssite.com/?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

// ============================================================
// ROOT LAYOUT
// ============================================================

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased flex flex-col">
        {/* Skip to main content */}
        
         <a href="#main-content" 
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <Navbar />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}