import { getPropertySlugs } from "../src/lib/serverContentApi";
import { getSiteUrl } from "../src/lib/siteConfig";

export const revalidate = 1800;

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const slugs = await getPropertySlugs();
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/properties",
    "/book",
    "/faq",
    "/review",
    "/terms",
    "/privacy",
  ];

  const dynamicRoutes = slugs.flatMap((slug) => [
    `/${slug}`,
    `/${slug}/gallery`,
    `/book/${slug}`,
    // Property FAQ/review routes are intentionally omitted to avoid competing with the main property page in Google.
    // Revert by re-adding `/faq/${slug}` and `/review/${slug}` if those pages should be indexed again.
    `/activities/${slug}`,
  ]);

  return [...staticRoutes, ...dynamicRoutes].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    lastModified: now,
    changeFrequency: pathname === "" ? "weekly" : "monthly",
    priority: pathname === "" ? 1 : pathname.startsWith("/book") ? 0.8 : 0.7,
  }));
}
