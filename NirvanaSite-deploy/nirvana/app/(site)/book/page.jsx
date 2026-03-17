import Booking from "../../../src/components/Booking/Booking";
import { getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Book Your Stay",
  description: "Start your direct booking with Nirvana Luxe and choose the right luxury vacation rental for your trip.",
  pathname: "/book",
  keywords: ["book vacation rental", "direct booking", "luxury rental booking"],
});

export default async function BookPage() {
  const properties = await getPropertyCards();
  return <Booking initialProperties={properties} />;
}
