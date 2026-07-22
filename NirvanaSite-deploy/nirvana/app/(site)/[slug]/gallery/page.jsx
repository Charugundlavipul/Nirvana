import { notFound } from "next/navigation";
import PropertyGalleryPage from "../../../../src/components/PropertyGallery/PropertyGalleryPage";
import { getManagedPageMetadata, getPropertyBundleBySlug, getPropertyBySlug, getPropertySlugs } from "../../../../src/lib/serverContentApi";
import { buildMetadata } from "../../../../src/lib/seo";

export const revalidate = 21600;

export async function generateStaticParams() {
  const slugs = await getPropertySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) {
    return buildMetadata({
      title: "Gallery",
      pathname: `/${slug}/gallery`,
      noindex: true,
    });
  }

  return getManagedPageMetadata(`/${property.slug}/gallery`, {
    title: `${property.name} Photo Gallery`,
    description: `View the photo gallery for ${property.name}.`,
    pathname: `/${property.slug}/gallery`,
    images: [property.curated?.home || property.curated?.secondary || "/logo512.png"],
  });
}

export default async function PropertyGalleryRoute({ params }) {
  const { slug } = await params;
  const bundle = await getPropertyBundleBySlug(slug);
  if (!bundle?.property) notFound();

  return <PropertyGalleryPage slug={slug} initialBundle={bundle} />;
}
