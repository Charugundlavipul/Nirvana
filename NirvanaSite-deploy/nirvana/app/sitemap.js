import { getPropertySlugs, getBlogSlugs } from "../src/lib/serverContentApi";
import { getSiteUrl } from "../src/lib/siteConfig";

export const revalidate = 1800;

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const [slugs, blogSlugs] = await Promise.all([
    getPropertySlugs(),
    getBlogSlugs(),
  ]);
  const now = new Date();

  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/properties",
    "/book",
    "/faq",
    "/review",
    "/blog",
    "/terms",
    "/privacy",
  ];

  const dynamicRoutes = slugs.flatMap((slug) => [
    `/${slug}`,
    `/${slug}/gallery`,
    `/book/${slug}`,
    `/activities/${slug}`,
  ]);

  const blogRoutes = blogSlugs.map((slug) => `/blog/${slug}`);

  return [...staticRoutes, ...dynamicRoutes, ...blogRoutes].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    lastModified: now,
    changeFrequency: pathname === "" ? "weekly" : pathname.startsWith("/blog") ? "weekly" : "monthly",
    priority: pathname === "" ? 1 : pathname.startsWith("/book") ? 0.8 : pathname.startsWith("/blog/") ? 0.6 : 0.7,
  }));
}
