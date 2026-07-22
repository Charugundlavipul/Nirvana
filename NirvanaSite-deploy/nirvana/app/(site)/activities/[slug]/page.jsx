import { notFound } from "next/navigation";
import ActivitiesPage from "../../../../src/components/NearbyActivities/ActivitiesPage";
import { getActivitiesBySlug, getManagedPageMetadata, getPropertyBySlug, getPropertySlugs } from "../../../../src/lib/serverContentApi";
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
      title: "Nearby Activities",
      pathname: `/activities/${slug}`,
      noindex: true,
    });
  }

  return getManagedPageMetadata(`/activities/${property.slug}`, {
    title: `${property.name} Nearby Activities`,
    description: `Discover nearby activities, dining, and local experiences around ${property.name}.`,
    pathname: `/activities/${property.slug}`,
    images: [property.curated?.bg || property.curated?.home || "/logo512.png"],
  });
}

export default async function ActivityPage({ params }) {
  const { slug } = await params;
  const [property, activities] = await Promise.all([
    getPropertyBySlug(slug),
    getActivitiesBySlug(slug),
  ]);

  if (!property) notFound();

  return <ActivitiesPage slug={slug} property={property} activities={activities} />;
}
