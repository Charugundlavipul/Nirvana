import Home from "../../src/components/Home/Home";
import StructuredData from "../../src/components/StructuredData";
import { getProperties, getReviews } from "../../src/lib/serverContentApi";
import { buildMetadata } from "../../src/lib/seo";
import { SITE_NAME, SITE_TITLE, absoluteUrl } from "../../src/lib/siteConfig";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: SITE_TITLE,
  description: "Explore luxury vacation rentals in Sevierville, Tennessee and Lake Norman, North Carolina with Nirvana Luxe.",
  pathname: "/",
  keywords: ["Nirvana Luxe", "Nirvanaluxe", "luxury vacation rentals", "Sevierville cabins", "Lake Norman rentals", "Smoky Mountains vacation homes", "shoreside oasis", "nirvana", "halftime hideaway", "grandprix getaway"],
});

export default async function HomePage() {
  const [properties, reviews] = await Promise.all([getProperties(), getReviews()]);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absoluteUrl("/"),
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
      <StructuredData data={websiteJsonLd} />
      <StructuredData data={propertyListJsonLd} />
      <Home initialProperties={properties} initialReviews={reviews} />
    </>
  );
}
