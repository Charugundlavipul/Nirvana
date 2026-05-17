import PropertyOverview from "../../../src/components/PropertyOverview/propertyOverview";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Luxury Vacation Rental Properties — Smoky Mountains & Lake Norman",
  description: "Browse the Nirvana Luxe collection of luxury vacation rentals in Sevierville, Tennessee, and Lake Norman, North Carolina. Direct booking available.",
  pathname: "/properties",
  keywords: [
    "vacation rental properties",
    "luxury cabins Sevierville TN",
    "lakefront rentals Lake Norman",
    "Smokies luxury stays",
    "Smoky Mountains cabin rental",
    "large group cabin Tennessee",
    "family vacation rental",
    "pet-friendly luxury cabin",
    "direct booking vacation homes",
    "Nirvana Luxe properties",
  ],
});

export default async function PropertiesPage() {
  const properties = await getPropertyCards();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nirvana Luxe Properties",
    url: absoluteUrl("/properties"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: properties.map((property, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: property.title,
        url: absoluteUrl(property.propertyRoute),
      })),
    },
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <PropertyOverview initialProperties={properties} />
    </>
  );
}
