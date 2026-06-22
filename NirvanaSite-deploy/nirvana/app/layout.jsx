import "../src/index.css";
import Script from "next/script";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_KEYWORDS,
  getMetadataBase,
} from "../src/lib/siteConfig";

export const metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `${SITE_NAME} | ${SITE_TITLE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  verification: {
    google: "zkMdqKWIHLTe8_TrkPvJmoWx-edj8tfAzrji-c81y8U",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TITLE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

import DomainMigrationBanner from "../src/components/DomainMigrationBanner/DomainMigrationBanner";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DomainMigrationBanner />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XE6P41ERZ5"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XE6P41ERZ5');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
