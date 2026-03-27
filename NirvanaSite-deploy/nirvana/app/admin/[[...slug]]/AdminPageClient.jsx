"use client";

import dynamic from "next/dynamic";

const AdminApp = dynamic(() => import("../../../src/components/Admin/AdminApp"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      Loading admin portal...
    </div>
  ),
});

export default function AdminPageClient() {
  return <AdminApp />;
}
