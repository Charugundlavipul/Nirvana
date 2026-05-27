import BlogFeed from "../../../src/components/Blog/BlogFeed";
import { buildMetadata } from "../../../src/lib/seo";

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
  return <BlogFeed />;
}
