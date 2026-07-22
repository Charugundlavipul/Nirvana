'use client';

import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import ProtectedAdminRoute from "./ProtectedAdminRoute";
import Dashboard from "./Dashboard";
import PropertyList from "./Properties/PropertyList";
import PropertyEditor from "./Properties/PropertyEditor";
import GlobalContent from "./Global/GlobalContent";
import ApprovalQueue from "./Approvals/ApprovalQueue";
import AdminUsersManager from "./Users/AdminUsersManager";
import SubscribersManager from "./Subscribers/SubscribersManager";
import KnowledgeHubManager from "./Knowledge/KnowledgeHubManager";
import BlogManager from "./Blogs/BlogManager";
import AdminSignatures from "./Signatures/AdminSignatures";
import PageMetadataManager from "./Metadata/PageMetadataManager";

const AdminApp = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedAdminRoute />}>
          <Route index element={<Dashboard />} />
          <Route path="properties" element={<PropertyList />} />
          <Route path="properties/:slug" element={<PropertyEditor />} />
          <Route path="global" element={<GlobalContent />} />
          <Route path="metadata" element={<PageMetadataManager />} />
          <Route path="blogs" element={<BlogManager />} />
          <Route path="knowledge" element={<KnowledgeHubManager />} />
          <Route path="approvals" element={<ApprovalQueue />} />
          <Route path="subscribers" element={<SubscribersManager />} />
          <Route path="admins" element={<AdminUsersManager />} />
          <Route path="signatures" element={<AdminSignatures />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AdminApp;
