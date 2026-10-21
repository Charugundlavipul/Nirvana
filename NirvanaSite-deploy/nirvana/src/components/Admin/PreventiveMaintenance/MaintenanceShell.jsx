import React from "react";
import { NavLink } from "react-router-dom";
import { FaChartPie, FaClipboardCheck, FaListAlt } from "react-icons/fa";
import AdminLayout from "../AdminLayout";
import styles from "./Maintenance.module.css";

const links = [
  { to: "/admin/preventive-maintenance", label: "Dashboard", end: true, icon: FaChartPie },
  { to: "/admin/preventive-maintenance/catalog", label: "Catalog", icon: FaListAlt },
  { to: "/admin/preventive-maintenance/tasks", label: "Tasks", icon: FaClipboardCheck },
];

export default function MaintenanceShell({ title, subtitle, children }) {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <nav className={styles.moduleNav} aria-label="Preventive maintenance pages">
        {links.map(({ to, label, end, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.moduleLink} ${isActive ? styles.moduleLinkActive : ""}`}>
            <Icon aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
      {children}
    </AdminLayout>
  );
}
