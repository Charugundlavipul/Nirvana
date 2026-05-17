import Booking from "../../../src/components/Booking/Booking";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Book Your Luxury Vacation Rental — Direct Booking",
  description: "Book directly with Nirvana Luxe and save. Choose from luxury cabins in the Smoky Mountains and lakefront homes on Lake Norman. Best rate guaranteed.",
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
