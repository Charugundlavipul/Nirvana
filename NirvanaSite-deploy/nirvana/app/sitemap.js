import { getPropertySlugs, getBlogSlugs } from "../src/lib/serverContentApi";
import { getSiteUrl } from "../src/lib/siteConfig";

export const revalidate = 43200;

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
    "/hosts",
    "/properties",
    "/book",
    "/faq",
    "/review",
    "/blog",
    "/terms",
    "/cancellation-policy",
    "/privacy",
  ];

  const dynamicRoutes = slugs.flatMap((slug) => [
    `/${slug}`,
    `/${slug}/gallery`,
    `/book/${slug}`,
    `/activities/${slug}`,
    `/faq/${slug}`,
  ]);

  const blogRoutes = blogSlugs.map((slug) => `/blog/${slug}`);

  return [...staticRoutes, ...dynamicRoutes, ...blogRoutes].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    lastModified: now,
    changeFrequency: pathname === "" ? "weekly" : pathname.startsWith("/blog") ? "weekly" : "monthly",
    priority: pathname === "" ? 1 : pathname.startsWith("/book") ? 0.8 : /^\/[a-z]/.test(pathname) && !pathname.includes("/", 1) ? 0.9 : pathname.startsWith("/blog/") ? 0.6 : pathname.startsWith("/faq/") ? 0.7 : 0.7,
  }));
}
