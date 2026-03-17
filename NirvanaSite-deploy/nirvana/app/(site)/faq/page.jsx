import FAQ from "../../../src/components/FAQ/FAQ";
import StructuredData from "../../../src/components/StructuredData";
import { getFaqsBySlug, getPropertyCards } from "../../../src/lib/serverContentApi";
import { buildFaqJsonLd, buildMetadata } from "../../../src/lib/seo";

export const revalidate = 1800;

export const metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description: "Find answers to common questions about booking, check-in, amenities, and house rules for Nirvana Luxe stays.",
  pathname: "/faq",
  keywords: ["vacation rental FAQ", "check-in questions", "booking FAQ", "Nirvana Luxe FAQ"],
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
