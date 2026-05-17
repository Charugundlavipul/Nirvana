import BlogFeed from "../../../src/components/Blog/BlogFeed";
import { buildMetadata } from "../../../src/lib/seo";

export const metadata = buildMetadata({
  title: "The NirvanaLuxe Journal — Luxury Travel Blog",
  description: "Stay updated with luxury travel guides, Smoky Mountain destination tips, Lake Norman getaways, and vacation planning advice from NirvanaLuxe.",
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
  return <BlogFeed />;
}
