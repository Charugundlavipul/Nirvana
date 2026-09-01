import ReviewsPage from "../../../src/components/Review/ReviewPage";
import StructuredData from "../../../src/components/StructuredData";
import { getManagedPageMetadata, getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildReviewCollectionJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 21600;

export async function generateMetadata() {
  return getManagedPageMetadata("/review", {
  title: "Guest Reviews - Nirvana Luxe Rentals",
  description: "100+ verified 5-star reviews for Nirvana Luxe cabins & lake homes. Real guests. Real experiences. See why families & groups come back.",
  pathname: "/review",
  keywords: [
    "guest reviews",
    "vacation rental reviews",
    "Nirvana Luxe testimonials",
    "5-star cabin reviews",
    "Smoky Mountain cabin reviews",
    "Lake Norman rental reviews",
    "luxury rental guest feedback",
    "verified guest reviews",
  ],
  });
}

export default async function ReviewPage() {
  const [properties, reviews] = await Promise.all([getPropertyCards(), getReviews()]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews", url: absoluteUrl("/review") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Guest Reviews - Nirvana Luxe",
    pathname: "/review",
    description: "Verified 5-star guest reviews for Nirvana Luxe luxury vacation rentals. Real guests, real experiences.",
  });

  return (
    <>
      <StructuredData
        data={buildReviewCollectionJsonLd({
          name: "Nirvana Luxe Guest Reviews",
          pathname: "/review",
          reviews,
        })}
      />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <ReviewsPage initialProperties={properties} initialReviews={reviews} />
    </>
  );
}
