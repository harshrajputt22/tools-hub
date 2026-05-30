import { BASE_URL, STATIC_PAGES, ALL_TOOLS } from "@/lib/tools-registry";

/**
 * Dynamic XML sitemap — Next.js 14 App Router metadata route.
 * Served at /sitemap.xml by the framework automatically.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export default function sitemap() {
  const now = new Date();

  // ── Static pages ─────────────────────────────────────────────
  const staticEntries = STATIC_PAGES.map(({ path, priority }) => ({
    url:             `${BASE_URL}${path}`,
    lastModified:    now,
    changeFrequency: priority >= 0.8 ? "daily" : priority >= 0.5 ? "weekly" : "monthly",
    priority,
  }));

  // ── Tool pages ────────────────────────────────────────────────
  const toolEntries = ALL_TOOLS.map(({ slug }) => ({
    url:             `${BASE_URL}/tools/${slug}`,
    lastModified:    now,
    changeFrequency: "weekly",
    priority:        0.8,
  }));

  return [...staticEntries, ...toolEntries];
}