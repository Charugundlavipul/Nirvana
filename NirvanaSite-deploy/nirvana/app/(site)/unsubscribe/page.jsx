import { Suspense } from "react";
import Unsubscribe from "../../../src/components/Unsubscribe/Unsubscribe";
import { getManagedPageMetadata } from "../../../src/lib/serverContentApi";

export async function generateMetadata() {
  return getManagedPageMetadata("/unsubscribe", {
    title: "Unsubscribe",
    description: "Manage your Nirvana Luxe alert subscription preferences.",
    pathname: "/unsubscribe",
    noindex: true,
  });
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <Unsubscribe />
    </Suspense>
  );
}
