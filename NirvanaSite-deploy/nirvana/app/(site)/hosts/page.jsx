import HostsPage from "../../../src/components/Hosts/HostsPage";
import StructuredData from "../../../src/components/StructuredData";
import { buildMetadata } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";

export const metadata = buildMetadata({
  title: "List With Nirvana Luxe - Property Management",
  description:
    "Earn more from your vacation rental. Nirvana Luxe offers full-service STR management in Sevierville TN & Lake Norman NC. Get a free analysis.",
  pathname: "/hosts",
  keywords: [
    "vacation rental property management",
    "Airbnb property management Tennessee",
    "short-term rental investment",
    "Sevierville vacation rental management",
    "Charlotte Airbnb management",
    "vacation rental acquisition",
    "property management services",
    "Smoky Mountains investment properties",
    "Lake Norman rental management",
    "NirvanaLuxe hosts",
    "STR property manager",
  ],
});

export default function HostsPage_Route() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Property Owners & Hosts — Acquisition & Management",
    url: absoluteUrl("/hosts"),
    description:
      "Partner with NirvanaLuxe for vacation rental property acquisition, market analysis, and full-service Airbnb property management.",
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
      <HostsPage />
    </>
  );
}
