import LegalPage from "../../../src/components/Legal/LegalPage";
import { getLegalPageContent } from "../../../src/lib/serverContentApi";
import { buildMetadata, descriptionFromRichText } from "../../../src/lib/seo";

export const revalidate = 86400;

export async function generateMetadata() {
  const page = await getLegalPageContent("terms_and_conditions");
  return buildMetadata({
    title: page.title || "Terms and Conditions",
    description: descriptionFromRichText(page.content, 160) || "Read the terms and conditions for Nirvana Luxe.",
    pathname: "/terms",
  });
}

export default async function TermsPage() {
  const page = await getLegalPageContent("terms_and_conditions");
  return <LegalPage pageKey="terms_and_conditions" initialData={page} />;
}
