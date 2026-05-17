import { notFound } from "next/navigation";
import PropertyPage from "../../../src/components/PropertyPage/PropertyPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyBundleBySlug, getPropertyBySlug, getPropertySlugs, getReviews, getActivitiesBySlug } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildPropertyJsonLd, descriptionFromRichText } from "../../../src/lib/seo";

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
      title: "Property Not Found",
      pathname: `/${slug}`,
      noindex: true,
    });
  }

  const location = property.location || "Luxury Vacation Rental";
  const locationKeywords = location.toLowerCase().includes("sevierville")
    ? ["Sevierville TN cabin", "Smoky Mountains luxury cabin", "cabin rental near Dollywood", "Tennessee vacation home"]
    : location.toLowerCase().includes("lake norman") || location.toLowerCase().includes("mooresville")
    ? ["Lake Norman vacation home", "lakefront rental NC", "Mooresville NC rental", "North Carolina lake house"]
    : ["luxury vacation rental", "premium vacation home"];

  return buildMetadata({
    title: `${property.name} — ${location}`,
    description: descriptionFromRichText(property.description, 160) || `Book ${property.name} in ${location}. Direct booking luxury vacation rental with Nirvana Luxe.`,
    pathname: `/${property.slug}`,
    images: [property.curated?.bg || property.curated?.home || "/logo512.png"],
    type: "article",
    keywords: [
      property.name,
      `${property.name} vacation rental`,
      `${property.name} cabin`,
      "Nirvana Luxe",
      "direct booking",
      "luxury vacation rental",
      ...locationKeywords,
    ],
  });
}

export default async function PropertyDetailPage({ params }) {
  const { slug } = await params;
  const [bundle, reviews, activities] = await Promise.all([
    getPropertyBundleBySlug(slug),
    getReviews({ slug }),
    getActivitiesBySlug(slug),
  ]);

  if (!bundle?.property) notFound();

  return (
    <>
      <StructuredData data={buildPropertyJsonLd(bundle.property, bundle, reviews)} />
      <PropertyPage slug={slug} initialBundle={bundle} initialReviews={reviews} initialActivities={activities} />
    </>
  );
}
