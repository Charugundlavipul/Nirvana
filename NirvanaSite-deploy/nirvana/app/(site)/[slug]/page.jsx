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

  // Per-property optimized SEO overrides
  const propertyMeta = {
    nirvana: {
      title: "Nirvana Cabin - 4BR Luxury Smokies | 14 Guests",
      description: "4BR luxury cabin near Pigeon Forge - private pool, hot tub & mountain views for 14 guests. Book direct & save vs. Airbnb. Check dates now.",
    },
    "shoreside-oasis": {
      title: "Shoreside Oasis - 5BR Lake Norman | 12 Guests",
      description: "5BR lakefront luxury home on Lake Norman, Mooresville NC - private dock, stunning views, 12 guests. Book direct for best rate. Reserve now.",
    },
    "halftime-hideaway": {
      title: "Halftime Hideaway - 5BR Cabin | 22 Guests TN",
      description: "22-guest luxury cabin in Sevierville TN - 5BR, 6 full baths, game room & mountain views. Ideal for large groups. Book direct & save.",
    },
    "grand-prix-getaway": {
      title: "Grand Prix Getaway - 6BR Cabin | 26 Guests",
      description: "26-guest luxury cabin in Sevierville TN - 6BR, 7 full baths, racing-themed décor & mountain views. Ultimate large-group escape. Book now.",
    },
  };

  const override = propertyMeta[slug];

  const location = property.location || "Luxury Vacation Rental";
  const locationKeywords = location.toLowerCase().includes("sevierville")
    ? ["Sevierville TN cabin", "Smoky Mountains luxury cabin", "cabin rental near Dollywood", "Tennessee vacation home"]
    : location.toLowerCase().includes("lake norman") || location.toLowerCase().includes("mooresville")
    ? ["Lake Norman vacation home", "lakefront rental NC", "Mooresville NC rental", "North Carolina lake house"]
    : ["luxury vacation rental", "premium vacation home"];

  return buildMetadata({
    title: override?.title || `${property.name} — ${location}`,
    description: override?.description || descriptionFromRichText(property.description, 160) || `Book ${property.name} in ${location}. Direct booking luxury vacation rental with Nirvana Luxe.`,
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
