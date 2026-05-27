import Home from "../../src/components/Home/Home";
import StructuredData from "../../src/components/StructuredData";
import { getProperties, getReviews } from "../../src/lib/serverContentApi";
import { buildMetadata } from "../../src/lib/seo";
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

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["NirvanaLuxe", "Nirvana Luxe Vacation Rentals"],
    url: absoluteUrl("/"),
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["NirvanaLuxe", "Nirvana Luxe Vacation Rentals"],
    url: absoluteUrl("/"),
    logo: absoluteUrl("/logo512.png"),
    sameAs: [
      "https://www.instagram.com/nirvanaluxevacations/",
      "https://www.facebook.com/NirvanaLuxe",
      "https://www.youtube.com/@nirvanaaluxe",
    ],
  };

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

  return (
    <>
      <StructuredData data={organizationJsonLd} />
      <StructuredData data={websiteJsonLd} />
      <StructuredData data={webpageJsonLd} />
      <StructuredData data={propertyListJsonLd} />
      <Home initialProperties={properties} initialReviews={reviews} />
    </>
  );
}
