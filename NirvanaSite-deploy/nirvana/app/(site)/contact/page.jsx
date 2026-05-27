import ContactUs from "../../../src/components/Contact/ContactUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
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

  return (
    <>
      <StructuredData data={jsonLd} />
      <ContactUs />
    </>
  );
}
