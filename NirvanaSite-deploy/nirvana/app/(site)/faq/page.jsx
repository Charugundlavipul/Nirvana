import FAQ from "../../../src/components/FAQ/FAQ";
import StructuredData from "../../../src/components/StructuredData";
import { getFaqsBySlug, getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildFaqJsonLd, buildMetadata } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "FAQ - Booking, Check-In & Amenities | Nirvana",
  description: "Got questions? Find answers about booking, cancellation, check-in, amenities, pets & more for your Nirvana Luxe luxury rental stay.",
  pathname: "/faq",
  keywords: [
    "vacation rental FAQ",
    "check-in questions",
    "booking FAQ",
    "Nirvana Luxe FAQ",
    "cabin check-in time",
    "pet policy vacation rental",
    "cancellation policy luxury cabin",
    "amenities luxury rental",
    "house rules cabin rental",
  ],
});

export default async function FaqPage() {
  const properties = await getPropertyCards();
  const selectedSlug = properties[0]?.slug || null;
  const faqs = selectedSlug ? await getFaqsBySlug(selectedSlug) : [];

  return (
    <>
      <StructuredData data={buildFaqJsonLd(faqs)} />
      <FAQ initialProperties={properties} initialSlug={selectedSlug} initialFaqs={faqs} />
    </>
  );
}
