import LocationLandingPage from "../../../src/components/LocationLandingPage/LocationLandingPage";
import StructuredData from "../../../src/components/StructuredData";
import { getManagedPageMetadata, getPropertyCards, getReviews } from "../../../src/lib/serverContentApi";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 3600;

export async function generateMetadata() {
  return getManagedPageMetadata("/north-carolina-vacation-rentals", {
    title: "Luxury North Carolina Waterfront Rentals - Lake Norman | Book Direct",
    description: "Browse luxury lakefront vacation rentals on Lake Norman & Lake Wylie NC near Charlotte. Private boat docks, hot tubs & lake views. Book direct & save.",
    pathname: "/north-carolina-vacation-rentals",
    keywords: [
      "North Carolina vacation rentals",
      "Lake Norman luxury rentals",
      "Mooresville lakefront homes",
      "Lake Wylie cabin rentals",
      "Charlotte waterfront vacation rentals",
      "rentals with private boat dock NC",
      "Nirvana Luxe North Carolina",
    ],
  });
}

export default async function NorthCarolinaPage() {
  const [properties, reviews] = await Promise.all([
    getPropertyCards(),
    getReviews(),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "North Carolina Vacation Rentals", url: absoluteUrl("/north-carolina-vacation-rentals") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Luxury North Carolina Vacation Rentals",
    pathname: "/north-carolina-vacation-rentals",
    description: "Browse luxury waterfront homes on Lake Norman and Lake Wylie NC with private boat docks, hot tubs, and lake views.",
  });

  return (
    <>
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <LocationLandingPage
        locationKey="nc"
        initialProperties={properties}
        initialReviews={reviews}
      />
    </>
  );
}
