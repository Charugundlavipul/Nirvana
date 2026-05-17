import ReviewsPage from "../../../src/components/Review/ReviewPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildReviewCollectionJsonLd } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Guest Reviews — Verified Vacation Rental Testimonials",
  description: "Read verified 5-star guest reviews for Nirvana Luxe luxury vacation rentals in the Smoky Mountains and Lake Norman. See what real guests are saying.",
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
