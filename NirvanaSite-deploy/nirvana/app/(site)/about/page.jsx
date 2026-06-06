import AboutUs from "../../../src/components/AboutUs/AboutUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "About Nirvana Luxe - Luxury Rental Hosts",
  description: "Meet the team behind Nirvana Luxe - curating luxury vacation rentals in Smoky Mountains & Lake Norman since 2020. Personal service guaranteed.",
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

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "About Us", url: absoluteUrl("/about") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "About Nirvana Luxe",
    pathname: "/about",
    description: "Meet the team behind Nirvana Luxe - curating luxury vacation rentals in Smoky Mountains & Lake Norman.",
    type: "AboutPage",
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <AboutUs />
    </>
  );
}
