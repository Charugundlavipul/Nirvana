import PropertyOverview from "../../../src/components/PropertyOverview/propertyOverview";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Vacation Rental Properties",
  description: "Browse the Nirvana Luxe collection of luxury vacation rentals in the Smokies and Lake Norman.",
  pathname: "/properties",
  keywords: ["vacation rental properties", "luxury cabins", "lakefront rentals", "Smokies luxury stays"],
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
