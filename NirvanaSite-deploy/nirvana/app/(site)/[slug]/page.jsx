import { notFound } from "next/navigation";
import PropertyPage from "../../../src/components/PropertyPage/PropertyPage";
import StructuredData from "../../../src/components/StructuredData";
import { getHospitablePropertyById, getManagedPageMetadata, getPropertyBundleBySlug, getPropertyBySlug, getPropertyCards, getPropertySlugs, getReviews, getActivitiesBySlug } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildPropertyJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd, descriptionFromRichText } from "../../../src/lib/seo";
import { SITE_NAME, absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 3600;

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
      title: "Nirvana Cabin - Private Pool & Mountain Views | Pigeon Forge & Sevierville",
      description: "Luxury 4BR Smoky Mountain cabin with private heated pool, hot tub, mountain views & game room near Pigeon Forge and Gatlinburg. Best romantic cabin getaway. Sleeps 14.",
    },
    "shoreside": {
      title: "Shoreside Oasis - Lakefront Luxury Villa with Private Dock | Lake Norman NC",
      description: "Best luxury villa for nature-loving couples on Lake Norman. 5BR lakefront home with private dock, infinity-edge views & resort amenities. Sleeps 12 in Mooresville NC. Book direct for best rate.",
    },
    "halftime": {
      title: "Halftime Hideaway - Indoor Pool, Hot Tub & Game Rooms | Gatlinburg & Pigeon Forge Area",
      description: "Smoky mountain cabin rental with indoor pool — luxury 5BR cabin with private heated indoor pool, hot tub, home theater & game rooms. Perfect for large groups near Gatlinburg and Sevierville. Sleeps 22.",
    },
    "grand-prix-getaway": {
      title: "Grand Prix Getaway - Racing Theme Cabin with Pool | Sevierville & Pigeon Forge TN",
      description: "Ultimate luxury cabin getaway — 6BR racing-themed cabin with private pool, arcade, home theater & mountain views. Premium Smoky mountain cabins for large groups up to 26 near Pigeon Forge.",
    },
    "chalet-du-lac-lakefront-retreat": {
      title: "Chalet Du Lac - Lakefront Luxury Chalet on Lake Norman | Charlotte NC",
      description: "Stunning lakefront luxury vacation rental on Lake Norman with panoramic water views, private dock & luxury finishes. Best luxury villa for nature-loving couples near Charlotte. Book direct.",
    },
    "cabin-at-the-summit": {
      title: "Cabin At The Summit - Panoramic Mountain Views | Gatlinburg & Smoky Mountains",
      description: "Luxury vacation rental in Tennessee with breathtaking mountain views from every room. Hot tub, game room & serene setting. The perfect mountain retreat minutes from Gatlinburg and Pigeon Forge.",
    },
    "evergreen-escape": {
      title: "Evergreen Escape - Peaceful Mountain Retreat | Walland & Sevierville TN",
      description: "Luxury cabin getaway for couples — secluded retreat surrounded by nature with hot tub, mountain views & modern amenities. Experience the luxury of Walland and Sevierville. Book direct.",
    },
    "the-grand-sumeru": {
      title: "The Grand Sumeru - Premium Mountain Lodge | Gatlinburg, Pigeon Forge & Sevierville",
      description: "Spacious luxury vacation rental in Tennessee — premium mountain lodge with hot tub, game room & stunning Smoky Mountain views. Ideal for large groups seeking the best of Gatlinburg and Pigeon Forge.",
    },
  };

  const override = propertyMeta[slug];

  const location = property.location || "Luxury Vacation Rental";
  const locationKeywords = location.toLowerCase().includes("sevierville")
    ? ["Gatlinburg cabin rental", "Pigeon Forge luxury cabin", "Sevierville TN vacation home", "Walland luxury retreat", "Smoky Mountains cabin"]
    : location.toLowerCase().includes("lake norman") || location.toLowerCase().includes("mooresville")
    ? ["Lake Norman vacation home", "lakefront rental NC", "Mooresville NC rental", "North Carolina lake house"]
    : ["luxury vacation rental", "premium vacation home"];

  return getManagedPageMetadata(`/${property.slug}`, {
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
  const [bundle, reviews, activities, allProperties] = await Promise.all([
    getPropertyBundleBySlug(slug),
    getReviews({ slug }),
    getActivitiesBySlug(slug),
    getPropertyCards(),
  ]);

  if (!bundle?.property) notFound();

  const hospitableProperty = await getHospitablePropertyById(
    bundle.property.hospitable_property_id
  );

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
      <StructuredData data={buildPropertyJsonLd(bundle.property, bundle, reviews, hospitableProperty)} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <PropertyPage slug={slug} initialBundle={bundle} initialReviews={reviews} initialActivities={activities} allProperties={allProperties} />
    </>
  );
}
