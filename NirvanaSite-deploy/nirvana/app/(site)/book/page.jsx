import Booking from "../../../src/components/Booking/Booking";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { absoluteUrl } from "../../../src/lib/siteConfig";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Book Direct - Luxury Cabins & Lake Homes | Save",
  description: "Skip Airbnb fees - book your Smoky Mountain cabin or Lake Norman home directly with Nirvana Luxe. Best rate guaranteed. Real-time availability.",
  pathname: "/book",
  keywords: [
    "book vacation rental",
    "direct booking luxury cabin",
    "luxury rental booking",
    "book cabin Smoky Mountains",
    "reserve cabin Sevierville TN",
    "Lake Norman house rental booking",
    "best rate vacation rental",
    "Nirvana Luxe booking",
  ],
});

export default async function BookPage() {
  const properties = await getPropertyCards();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Book Now", url: absoluteUrl("/book") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Book Direct - Save vs. Airbnb",
    pathname: "/book",
    description: "Book your Smoky Mountain cabin or Lake Norman home directly with Nirvana Luxe. Best rate guaranteed, no platform fees.",
  });

  return (
    <>
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <Booking initialProperties={properties} />
    </>
  );
}
