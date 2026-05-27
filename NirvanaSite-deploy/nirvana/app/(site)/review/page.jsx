import ReviewsPage from "../../../src/components/Review/ReviewPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildReviewCollectionJsonLd } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "5-Star Guest Reviews - Nirvana Luxe Rentals",
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

export default async function ReviewPage() {
  const [properties, reviews] = await Promise.all([getPropertyCards(), getReviews()]);

  return (
    <>
      <StructuredData
        data={buildReviewCollectionJsonLd({
          name: "Nirvana Luxe Guest Reviews",
          pathname: "/review",
          reviews,
        })}
      />
      <ReviewsPage initialProperties={properties} initialReviews={reviews} />
    </>
  );
}
