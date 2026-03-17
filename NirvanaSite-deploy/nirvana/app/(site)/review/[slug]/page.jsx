import { notFound } from "next/navigation";
import ReviewsPage from "../../../../src/components/Review/ReviewPage";
import StructuredData from "../../../../src/components/StructuredData";
import { getPropertyBySlug, getPropertyCards, getPropertySlugs, getReviews } from "../../../../src/lib/serverContentApi";
import { buildMetadata, buildReviewCollectionJsonLd } from "../../../../src/lib/seo";

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getPropertySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    return buildMetadata({
      title: "Reviews",
      pathname: `/review/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${property.name} Reviews`,
    description: `Read verified guest reviews for ${property.name}.`,
    pathname: `/review/${property.slug}`,
    images: [property.curated?.home || property.curated?.secondary || "/logo512.png"],
  });
}

export default async function PropertyReviewPage({ params }) {
  const { slug } = await params;
  const [property, properties, reviews] = await Promise.all([
    getPropertyBySlug(slug),
    getPropertyCards(),
    getReviews({ slug }),
  ]);

  if (!property) notFound();

  return (
    <>
      <StructuredData
        data={buildReviewCollectionJsonLd({
          name: `${property.name} Reviews`,
          pathname: `/review/${property.slug}`,
          reviews,
        })}
      />
      <ReviewsPage initialProperties={properties} initialReviews={reviews} initialSlug={slug} />
    </>
  );
}
