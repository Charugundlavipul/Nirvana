import LocationLandingPage from "../../../src/components/LocationLandingPage/LocationLandingPage";
import StructuredData from "../../../src/components/StructuredData";
import { getManagedPageMetadata, getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 3600;

export async function generateMetadata() {
  return getManagedPageMetadata("/tennessee-vacation-rentals", {
    title: "Luxury Tennessee Vacation Rentals - Smoky Mountains | Book Direct",
    description: "Browse luxury cabin rentals in Sevierville, Gatlinburg & Pigeon Forge TN. Private indoor pools, hot tubs & mountain views. Sleep up to 26. Book direct & save.",
    pathname: "/tennessee-vacation-rentals",
    keywords: [
      "Tennessee vacation rentals",
      "luxury cabins Sevierville TN",
      "Gatlinburg luxury cabin rentals",
      "Pigeon Forge cabins with indoor pool",
      "Smoky Mountains large group cabins",
      "direct booking Tennessee cabins",
      "Nirvana Luxe Tennessee",
    ],
  });
}

export default async function TennesseePage() {
  const [properties, reviews] = await Promise.all([
    getPropertyCards(),
    getReviews(),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tennessee Vacation Rentals", url: absoluteUrl("/tennessee-vacation-rentals") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Luxury Tennessee Vacation Rentals",
    pathname: "/tennessee-vacation-rentals",
    description: "Browse luxury cabins in Sevierville, Gatlinburg, and Pigeon Forge, TN with private indoor pools, hot tubs, and Smoky Mountain views.",
  });

  return (
    <>
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <LocationLandingPage
        locationKey="tn"
        initialProperties={properties}
        initialReviews={reviews}
      />
    </>
  );
}
