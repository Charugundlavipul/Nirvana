import LegalPage from "../../../src/components/Legal/LegalPage";
import { getLegalPageContent } from "../../../src/lib/serverContentApi";
import { buildMetadata, descriptionFromRichText } from "../../../src/lib/seo";

export const revalidate = 1800;

export async function generateMetadata() {
  const page = await getLegalPageContent("privacy_policy");
  return buildMetadata({
    title: page.title || "Privacy Policy",
    description: descriptionFromRichText(page.content, 160) || "Read the privacy policy for Nirvana Luxe.",
    pathname: "/privacy",
  });
}

export default async function PrivacyPage() {
  const page = await getLegalPageContent("privacy_policy");
  return <LegalPage pageKey="privacy_policy" initialData={page} />;
}
