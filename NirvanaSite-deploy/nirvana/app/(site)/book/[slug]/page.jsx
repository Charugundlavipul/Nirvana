import { notFound } from "next/navigation";
import Booking from "../../../../src/components/Booking/Booking";
import { getPropertyBySlug, getPropertyCards, getPropertySlugs } from "../../../../src/lib/serverContentApi";
import { buildMetadata, descriptionFromRichText } from "../../../../src/lib/seo";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getPropertySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    return buildMetadata({
      title: "Property Not Found",
      pathname: `/book/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: `Book ${property.name}`,
    description: descriptionFromRichText(property.description, 160) || `Reserve ${property.name} in ${property.location}.`,
    pathname: `/book/${property.slug}`,
    images: [property.curated?.home || property.curated?.secondary || "/logo512.png"],
  });
}

export default async function BookPropertyPage({ params }) {
  const { slug } = await params;
  const [property, properties] = await Promise.all([
    getPropertyBySlug(slug),
    getPropertyCards(),
  ]);

  if (!property) notFound();

  return <Booking initialProperties={properties} initialSlug={slug} />;
}
