import React from "react";
import AdminLayout from "../AdminLayout";
import SignaturePreview from "../../../signatures/SignaturePreview";

const AdminSignatures = () => {
    return (
        <AdminLayout title="Email Signatures" subtitle="Copy signature templates for team email accounts.">
            <SignaturePreview />
        </AdminLayout>
    );
};

export default AdminSignatures;
