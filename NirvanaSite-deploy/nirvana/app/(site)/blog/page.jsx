import BlogFeed from "../../../src/components/Blog/BlogFeed";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "Nirvana Luxe Journal - Luxury Travel & Tips",
  description: "Explore luxury travel guides, Smoky Mountain tips & Lake Norman getaway ideas from Nirvana Luxe. Plan your perfect escape with expert advice.",
  pathname: "/blog",
  keywords: [
    "luxury travel blog",
    "Smoky Mountains travel guide",
    "Lake Norman vacation tips",
    "Sevierville Tennessee travel",
    "NirvanaLuxe journal",
    "cabin rental guide",
    "vacation planning",
    "luxury getaway ideas",
  ],
});

export default function BlogFeedPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Blog", url: absoluteUrl("/blog") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Nirvana Luxe Journal",
    pathname: "/blog",
    description: "Luxury travel guides, Smoky Mountain tips & Lake Norman getaway ideas from Nirvana Luxe.",
  });

  return (
    <>
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <BlogFeed />
    </>
  );
}
