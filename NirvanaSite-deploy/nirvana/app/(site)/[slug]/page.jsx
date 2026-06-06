import { notFound } from "next/navigation";
import PropertyPage from "../../../src/components/PropertyPage/PropertyPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyBundleBySlug, getPropertyBySlug, getPropertySlugs, getReviews, getActivitiesBySlug } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildPropertyJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd, descriptionFromRichText } from "../../../src/lib/seo";
import { SITE_NAME, absoluteUrl } from "../../../src/lib/siteConfig";

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

  // Per-property optimized SEO overrides — feature-led descriptions
  // that lead with exciting amenities (like Airbnb does) instead of
  // bedroom counts. Bold features grab attention in search results.
  const propertyMeta = {
    nirvana: {
      title: "Nirvana Cabin - Private Pool, Hot Tub & Mountain Views | 14 Guests",
      description: "Luxury 4BR cabin with private heated pool, hot tub, mountain views & game room near Pigeon Forge. Sleeps 14. Book direct & save vs. Airbnb.",
    },
    "shoreside-oasis": {
      title: "Shoreside Oasis - Private Dock & Stunning Lake Views | 12 Guests",
      description: "5BR lakefront luxury home on Lake Norman with private dock, infinity-edge views & resort amenities. Sleeps 12 in Mooresville NC. Book direct for best rate.",
    },
    "halftime-hideaway": {
      title: "Halftime Hideaway - Indoor Pool, Hot Tub & Game Rooms | 22 Guests",
      description: "Luxury 5BR cabin with private indoor heated pool, hot tub, home theater & multiple game rooms. Sleeps 22 in Sevierville TN. Book direct & save vs. Airbnb.",
    },
    "grand-prix-getaway": {
      title: "Grand Prix Getaway - Racing Theme, Pool & Arcade | 26 Guests",
      description: "Ultimate 6BR racing-themed cabin with private pool, arcade games, home theater & mountain views. Sleeps 26 in Sevierville TN. Book direct & save.",
    },
    "chalet-du-lac": {
      title: "Chalet Du Lac - Lakefront Luxury on Lake Norman | Charlotte NC",
      description: "Stunning lakefront chalet on Lake Norman with panoramic water views, private dock & luxury finishes. Perfect Charlotte getaway. Book direct for best rate.",
    },
    "cabin-at-the-summit": {
      title: "Cabin At The Summit - Panoramic Mountain Views | Smoky Mountains",
      description: "Breathtaking mountain views from every room in this luxury Smoky Mountains cabin. Hot tub, game room & serene setting. Book direct & save vs. Airbnb.",
    },
    "evergreen-escape": {
      title: "Evergreen Escape - Peaceful Mountain Retreat | Sevierville TN",
      description: "Secluded luxury cabin surrounded by nature with hot tub, mountain views & modern amenities in Sevierville TN. Perfect couples or family getaway. Book direct.",
    },
    "the-grand-sumeru": {
      title: "The Grand Sumeru - Premium Mountain Lodge | Smoky Mountains",
      description: "Spacious luxury mountain lodge with premium finishes, hot tub, game room & stunning Smoky Mountain views. Ideal for large groups. Book direct & save.",
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

  // Breadcrumbs: Home > Properties > [Property Name]
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Properties", url: absoluteUrl("/properties") },
    { name: bundle.property.name, url: absoluteUrl(`/${slug}`) },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: bundle.property.name,
    pathname: `/${slug}`,
    description: `Book ${bundle.property.name} — luxury vacation rental in ${bundle.property.location || "Smoky Mountains"}. Direct booking with Nirvana Luxe.`,
  });

  return (
    <>
      <StructuredData data={buildPropertyJsonLd(bundle.property, bundle, reviews)} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <PropertyPage slug={slug} initialBundle={bundle} initialReviews={reviews} initialActivities={activities} />
    </>
  );
}

