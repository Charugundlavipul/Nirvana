import ContactUs from "../../../src/components/Contact/ContactUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";
import { getManagedPageMetadata } from "../../../src/lib/serverContentApi";

export async function generateMetadata() {
  return getManagedPageMetadata("/contact", {
  title: "Contact Nirvana Luxe - Inquiries & Booking",
  description: "Questions about booking, availability or group trips? Contact the Nirvana Luxe team - we typically respond within 1 hour. Reach us now.",
  pathname: "/contact",
  keywords: [
    "contact Nirvana Luxe",
    "vacation rental support",
    "luxury rental contact",
    "vacation rental inquiry",
    "cabin rental customer service",
    "booking questions Smoky Mountains",
    "Lake Norman rental inquiry",
  ],
  });
}

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Nirvana Luxe",
    url: absoluteUrl("/contact"),
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      email: SITE_EMAIL,
      telephone: SITE_PHONE,
      sameAs: SOCIAL_LINKS,
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Contact", url: absoluteUrl("/contact") },
  ]);

  const webPageJsonLd = buildWebPageJsonLd({
    name: "Contact Nirvana Luxe",
    pathname: "/contact",
    description: "Contact the Nirvana Luxe team for booking inquiries, availability, and group trip planning.",
    type: "ContactPage",
  });

  return (
    <>
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={webPageJsonLd} />
      <ContactUs />
    </>
  );
}
