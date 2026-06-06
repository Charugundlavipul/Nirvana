import Home from "../../src/components/Home/Home";
import StructuredData from "../../src/components/StructuredData";
import { getProperties, getReviews } from "../../src/lib/serverContentApi";
import {
  buildMetadata,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildSiteNavigationJsonLd,
} from "../../src/lib/seo";
import { SITE_NAME, SITE_TITLE, absoluteUrl } from "../../src/lib/siteConfig";

export const revalidate = 1800;

const baseMetadata = buildMetadata({
  title: "Nirvana Luxe - Luxury Vacation Rentals",
  description:
    "Book luxury cabins & lakefront homes directly in Smoky Mountains, TN & Lake Norman, NC. Best rates, no platform fees. Check availability now.",
  pathname: "/",
  keywords: [
    "Nirvana Luxe",
    "NirvanaLuxe",
    "nirvana luxe",
    "nirvanaluxe",
    "Nirvana Luxe vacation rentals",
    "NirvanaLuxe vacation rentals",
    "luxury vacation rentals",
    "direct booking vacation rentals",
    "Sevierville cabins",
    "Lake Norman rentals",
    "Smoky Mountains vacation homes",
    "shoreside oasis",
    "nirvana",
    "halftime hideaway",
    "grandprix getaway",
  ],
});

export const metadata = {
  ...baseMetadata,
  title: {
    absolute: "Nirvana Luxe - Luxury Vacation Rentals",
  },
};

export default async function HomePage() {
  const [properties, reviews] = await Promise.all([getProperties(), getReviews()]);

  // Enhanced WebSite schema with SearchAction — helps trigger sitelinks search box
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["NirvanaLuxe", "Nirvana Luxe Vacation Rentals"],
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/properties")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Enhanced Organization with contact info, areas served, and aggregate rating
  const organizationJsonLd = buildOrganizationJsonLd(reviews);

  const webpageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Nirvana Luxe - Luxury Vacation Rentals",
    url: absoluteUrl("/"),
    description:
      "Official Nirvana Luxe homepage for luxury vacation rentals, direct booking, guest reviews, and premium stays in the Smokies and Lake Norman.",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    about: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  const propertyListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${SITE_NAME} Properties`,
    itemListElement: properties.map((property, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: property.name,
      url: absoluteUrl(`/${property.slug}`),
    })),
  };

  // SiteNavigationElement — strongly encourages Google to show sitelink buttons
  const siteNavJsonLd = buildSiteNavigationJsonLd();

  // Breadcrumbs for homepage
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
  ]);

  return (
    <>
      <StructuredData data={organizationJsonLd} />
      <StructuredData data={websiteJsonLd} />
      <StructuredData data={webpageJsonLd} />
      <StructuredData data={propertyListJsonLd} />
      <StructuredData data={siteNavJsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <Home initialProperties={properties} initialReviews={reviews} />
    </>
  );
}

