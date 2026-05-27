import Booking from "../../../src/components/Booking/Booking";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../src/lib/seo";

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
  return <Booking initialProperties={properties} />;
}
