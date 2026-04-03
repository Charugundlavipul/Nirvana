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
    `/activities/${slug}`,
  ]);

  return [...staticRoutes, ...dynamicRoutes].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    lastModified: now,
    changeFrequency: pathname === "" ? "weekly" : "monthly",
    priority: pathname === "" ? 1 : pathname.startsWith("/book") ? 0.8 : 0.7,
  }));
}
