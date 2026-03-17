import ReviewsPage from "../../../src/components/Review/ReviewPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildReviewCollectionJsonLd } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Guest Reviews",
  description: "Read verified guest reviews for Nirvana Luxe vacation rentals across every property in our collection.",
  pathname: "/review",
  keywords: ["guest reviews", "vacation rental reviews", "Nirvana Luxe testimonials"],
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
