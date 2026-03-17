import { Suspense } from "react";
import Unsubscribe from "../../../src/components/Unsubscribe/Unsubscribe";
import { buildMetadata } from "../../../src/lib/seo";

export const metadata = buildMetadata({
  title: "Unsubscribe",
  description: "Manage your Nirvana Luxe alert subscription preferences.",
  pathname: "/unsubscribe",
  noindex: true,
});

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <Unsubscribe />
    </Suspense>
  );
}
