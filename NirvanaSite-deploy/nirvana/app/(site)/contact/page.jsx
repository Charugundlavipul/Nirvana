import ContactUs from "../../../src/components/Contact/ContactUs";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "Contact Nirvana Luxe",
  description: "Contact Nirvana Luxe for booking questions, property details, and vacation rental support.",
  pathname: "/contact",
  keywords: ["contact Nirvana Luxe", "vacation rental support", "luxury rental contact"],
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
