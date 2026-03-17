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
          <Route path="approvals" element={<ApprovalQueue />} />
          <Route path="subscribers" element={<SubscribersManager />} />
          <Route path="admins" element={<AdminUsersManager />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AdminApp;
