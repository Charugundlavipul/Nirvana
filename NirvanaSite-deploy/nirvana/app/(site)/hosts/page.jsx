import HostsPage from "../../../src/components/Hosts/HostsPage";
import StructuredData from "../../../src/components/StructuredData";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../../src/lib/seo";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE, SOCIAL_LINKS, absoluteUrl } from "../../../src/lib/siteConfig";
import { getManagedPageMetadata } from "../../../src/lib/serverContentApi";

export async function generateMetadata() {
  return getManagedPageMetadata("/hosts", {
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
    "Nirvana Luxe investors",
    "STR property manager",
  ],
  });
}

export default function HostsPage_Route() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Property Owners & Hosts — Acquisition & Management",
    url: absoluteUrl("/hosts"),
    description:
      "Partner with Nirvana Luxe for vacation rental property acquisition, market analysis, and full-service Airbnb property management.",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
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
    { name: "Investors", url: absoluteUrl("/hosts") },
  ]);

  return (
    <>
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <HostsPage />
    </>
  );
}
