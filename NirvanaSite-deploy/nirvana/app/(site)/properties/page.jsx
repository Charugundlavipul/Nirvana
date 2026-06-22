import PropertyOverview from "../../../src/components/PropertyOverview/propertyOverview";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Luxury Rentals - Smokies & Lake Norman | Book",
  description: "Browse 8 luxury cabins & lakefront homes in Sevierville TN & Lake Norman NC. Sleep up to 26 guests. Direct booking, best rate guaranteed.",
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

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Properties", url: absoluteUrl("/properties") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Luxury Vacation Rental Properties",
    pathname: "/properties",
    description: "Browse luxury cabins & lakefront homes in Sevierville TN & Lake Norman NC. Direct booking, best rate guaranteed.",
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <PropertyOverview initialProperties={properties} />
    </>
  );
}

