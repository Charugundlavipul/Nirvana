import Home from "../../src/components/Home/Home";
import StructuredData from "../../src/components/StructuredData";
import { getProperties, getReviews } from "../../src/lib/serverContentApi";
import {
  buildMetadata,
  buildBreadcrumbJsonLd,
  buildOrganizationJsonLd,
  buildSiteNavigationJsonLd,
} from "../../src/lib/seo";
import { SITE_ALTERNATE_NAMES, SITE_NAME, absoluteUrl } from "../../src/lib/siteConfig";

export const revalidate = 1800;

const baseMetadata = buildMetadata({
  title: "Nirvana Luxe Official Site - Luxury Vacation Rentals",
  description:
    "Official Nirvana Luxe direct-booking site for luxury cabins and lakefront vacation rentals in the Smoky Mountains, TN and Lake Norman, NC.",
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
    absolute: "Nirvana Luxe Official Site - Luxury Vacation Rentals",
  },
};

export default async function HomePage() {
  const [properties, reviews] = await Promise.all([getProperties(), getReviews()]);

  // Enhanced WebSite schema with SearchAction — helps trigger sitelinks search box
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@id": absoluteUrl("/#website"),
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAMES,
    url: absoluteUrl("/"),
    publisher: {
      "@id": absoluteUrl("/#organization"),
    },
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
    "@id": absoluteUrl("/#webpage"),
    "@type": "WebPage",
    name: "Nirvana Luxe Official Site - Luxury Vacation Rentals",
    url: absoluteUrl("/"),
    description:
      "Official Nirvana Luxe homepage for luxury vacation rentals, direct booking, guest reviews, and premium stays in the Smokies and Lake Norman.",
    isPartOf: {
      "@id": absoluteUrl("/#website"),
    },
    about: {
      "@id": absoluteUrl("/#organization"),
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: absoluteUrl("/assets/exterior.avif"),
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
    { name: "Properties", url: absoluteUrl("/properties") },
    { name: "About", url: absoluteUrl("/about") },
    { name: "Reviews", url: absoluteUrl("/review") },
    { name: "Book Now", url: absoluteUrl("/book") },
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
