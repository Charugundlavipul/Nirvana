import AboutUs from "../../../src/components/AboutUs/AboutUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "About Nirvana Luxe — Our Story & Hospitality",
  description: "Learn about Nirvana Luxe, our curated luxury vacation rental collection in the Smoky Mountains and Lake Norman, and the hospitality behind every stay.",
  pathname: "/about",
  keywords: [
    "about Nirvana Luxe",
    "luxury vacation rentals",
    "Smoky Mountains rentals",
    "Lake Norman rentals",
    "vacation rental management company",
    "luxury property management Smokies",
    "Nirvana Luxe story",
    "premium vacation hospitality",
  ],
});

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    email: SITE_EMAIL,
    telephone: SITE_PHONE,
    sameAs: SOCIAL_LINKS,
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <AboutUs />
    </>
  );
}
