import AboutUs from "../../../src/components/AboutUs/AboutUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "About Nirvana Luxe",
  description: "Learn about Nirvana Luxe, our luxury vacation rental collection, and the hospitality behind each stay.",
  pathname: "/about",
  keywords: ["about Nirvana Luxe", "luxury vacation rentals", "Smoky Mountains rentals", "Lake Norman rentals"],
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
