import FAQ from "../../../src/components/FAQ/FAQ";
import StructuredData from "../../../src/components/StructuredData";
import { getFaqsBySlug, getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildFaqJsonLd, buildMetadata } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "FAQ — Check-In, Amenities, Booking & House Rules",
  description: "Find answers to common questions about booking, check-in times, cancellation policies, amenities, pet policies, and house rules for Nirvana Luxe vacation rentals.",
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
