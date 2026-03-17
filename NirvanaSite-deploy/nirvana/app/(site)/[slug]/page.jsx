import { notFound } from "next/navigation";
import PropertyPage from "../../../src/components/PropertyPage/PropertyPage";
import StructuredData from "../../../src/components/StructuredData";
import { getPropertyBundleBySlug, getPropertyBySlug, getPropertySlugs, getReviews } from "../../../src/lib/serverContentApi";
import { buildMetadata, buildPropertyJsonLd, descriptionFromRichText } from "../../../src/lib/seo";

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
      title: "Property Not Found",
      pathname: `/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: property.name,
    description: descriptionFromRichText(property.description, 160) || `${property.name} in ${property.location}.`,
    pathname: `/${property.slug}`,
    images: [property.curated?.bg || property.curated?.home || "/logo512.png"],
    type: "article",
  });
}

export default async function PropertyDetailPage({ params }) {
  const { slug } = await params;
  const [bundle, reviews] = await Promise.all([
    getPropertyBundleBySlug(slug),
    getReviews({ slug }),
  ]);

  if (!bundle?.property) notFound();

  return (
    <>
      <StructuredData data={buildPropertyJsonLd(bundle.property, bundle, reviews)} />
      <PropertyPage slug={slug} initialBundle={bundle} />
    </>
  );
}
