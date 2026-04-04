import { notFound } from "next/navigation";
import FAQ from "../../../../src/components/FAQ/FAQ";
import StructuredData from "../../../../src/components/StructuredData";
import { getFaqsBySlug, getPropertyBySlug, getPropertyCards, getPropertySlugs } from "../../../../src/lib/serverContentApi";
import { buildFaqJsonLd, buildMetadata } from "../../../../src/lib/seo";

export const revalidate = 1800;

export async function generateStaticParams() {
  const slugs = await getPropertySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    return buildMetadata({
      title: "FAQ",
      pathname: `/faq/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `${property.name} FAQ`,
    description: `Answers to common questions about ${property.name}, including amenities, booking, and house rules.`,
    pathname: `/faq/${property.slug}`,
    // Keep FAQ subpages out of search results so Google prefers the main property page.
    // Revert by removing `canonicalPathname` and `noindex` if these pages should rank independently again.
    canonicalPathname: `/${property.slug}`,
    images: [property.curated?.home || property.curated?.secondary || "/logo512.png"],
    noindex: true,
    follow: true,
  });
}

export default async function PropertyFaqPage({ params }) {
  const { slug } = await params;
  const [property, properties, faqs] = await Promise.all([
    getPropertyBySlug(slug),
    getPropertyCards(),
    getFaqsBySlug(slug),
  ]);

  if (!property) notFound();

  return (
    <>
      <StructuredData data={buildFaqJsonLd(faqs)} />
      <FAQ initialProperties={properties} initialSlug={slug} initialFaqs={faqs} />
    </>
  );
}
