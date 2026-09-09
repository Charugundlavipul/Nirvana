import AdminPageClient from "./AdminPageClient";

export const dynamic = "force-static";
export const revalidate = false;

export default function AdminPage() {
  return <AdminPageClient />;
}
