import PropertyManagementPage from "../../../src/components/PropertyManagement/PropertyManagementPage";
import { PROPERTY_MANAGEMENT_FAQS } from "../../../src/components/PropertyManagement/propertyManagementContent";
import StructuredData from "../../../src/components/StructuredData";
import { buildBreadcrumbJsonLd } from "../../../src/lib/seo";
import {
  SITE_EMAIL,
  SITE_NAME,
  SITE_PHONE,
  absoluteUrl,
} from "../../../src/lib/siteConfig";
import { getManagedPageMetadata } from "../../../src/lib/serverContentApi";

export async function generateMetadata() {
  return getManagedPageMetadata("/property-management", {
    title: "Smoky Mountain & Lake Norman Property Management",
    description:
      "Full-service vacation rental management for Smoky Mountain cabins and Lake Norman homes, including pricing, guest care, turnovers, and property oversight.",
    pathname: "/property-management",
    images: ["/assets/property-management-smoky-mountains.webp"],
    openGraphTitle: "Local Vacation Rental Management | Nirvana Luxe",
    openGraphDescription:
      "Thoughtful, full-service management for distinctive vacation homes in the Smoky Mountains and Lake Norman.",
    keywords: [
      "vacation rental property management",
      "Smoky Mountain cabin management",
      "Gatlinburg property management",
      "Pigeon Forge vacation rental management",
      "Sevierville cabin rental management",
      "Lake Norman Airbnb management",
      "Lake Wylie vacation rental management",
      "short term rental property manager",
      "Nirvana Luxe property management",
      "Airbnb property management Tennessee",
      "vacation home management North Carolina",
      "full service vacation rental management",
      "short term rental management company",
    ],
  });
}

export default function PropertyManagement_Route() {
  const pageUrl = absoluteUrl("/property-management");

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Vacation Rental Property Management in the Smoky Mountains and Lake Norman",
    url: pageUrl,
    description:
      "Full-service vacation rental property management for cabins and waterfront homes across the Smoky Mountains of Tennessee and Lake Norman, North Carolina.",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: absoluteUrl("/assets/property-management-smoky-mountains.webp"),
    },
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    about: {
      "@type": "Service",
      name: "Full-Service Vacation Rental Property Management",
      serviceType: "Vacation rental property management",
      url: pageUrl,
      image: absoluteUrl("/assets/property-management-smoky-mountains.webp"),
      provider: {
        "@type": "Organization",
        name: SITE_NAME,
        telephone: SITE_PHONE,
        email: SITE_EMAIL,
        url: absoluteUrl("/"),
      },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Sevierville, TN" },
        { "@type": "AdministrativeArea", name: "Gatlinburg, TN" },
        { "@type": "AdministrativeArea", name: "Pigeon Forge, TN" },
        { "@type": "AdministrativeArea", name: "Wears Valley, TN" },
        { "@type": "AdministrativeArea", name: "Lake Norman, NC" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Vacation rental management services",
        itemListElement: [
          "Revenue strategy and pricing",
          "Listing marketing and distribution",
          "Guest communication",
          "Cleaning and turnover coordination",
          "Maintenance coordination",
          "Owner reporting",
        ].map((name) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name,
          },
        })),
      },
    },
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Property Management", url: pageUrl },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PROPERTY_MANAGEMENT_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={webPageJsonLd} />
      <StructuredData data={breadcrumbJsonLd} />
      <StructuredData data={faqJsonLd} />
      <PropertyManagementPage />
    </>
  );
}
