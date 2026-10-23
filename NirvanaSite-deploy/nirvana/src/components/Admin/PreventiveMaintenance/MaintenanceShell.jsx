import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FaBuilding, FaChartPie, FaClipboardCheck, FaListAlt } from "react-icons/fa";
import AdminLayout from "../AdminLayout";
import styles from "./Maintenance.module.css";

const classicLinks = [
  { to: "/admin/preventive-maintenance", label: "Dashboard", end: true, icon: FaChartPie },
  { to: "/admin/preventive-maintenance/catalog", label: "Catalog", icon: FaListAlt },
  { to: "/admin/preventive-maintenance/tasks", label: "Tasks", icon: FaClipboardCheck },
];

const propertyLinks = [
  { to: "/admin/preventive-maintenance", label: "Dashboard", end: true, icon: FaChartPie },
  { to: "/admin/preventive-maintenance/catalog-2", label: "Catalog", icon: FaListAlt },
  { to: "/admin/preventive-maintenance/properties", label: "Properties", icon: FaBuilding },
];

const VIEW_KEY = "nirvana-maintenance-property-view";

export default function MaintenanceShell({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [propertyView, setPropertyView] = useState(() => {
    if (typeof window === "undefined") return false;
    if (location.pathname.endsWith("/catalog-2") || location.pathname.endsWith("/properties")) return true;
    if (location.pathname.endsWith("/catalog") || location.pathname.endsWith("/tasks")) return false;
    return window.localStorage.getItem(VIEW_KEY) === "true";
  });
  const links = propertyView ? propertyLinks : classicLinks;

  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, String(propertyView));
  }, [propertyView]);

  function changeView(nextValue) {
    setPropertyView(nextValue);

    if (nextValue && location.pathname.endsWith("/catalog")) navigate("/admin/preventive-maintenance/catalog-2");
    else if (nextValue && location.pathname.endsWith("/tasks")) navigate("/admin/preventive-maintenance/properties");
    else if (!nextValue && location.pathname.endsWith("/catalog-2")) navigate("/admin/preventive-maintenance/catalog");
    else if (!nextValue && location.pathname.endsWith("/properties")) navigate("/admin/preventive-maintenance/tasks");
  }

  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <div className={styles.moduleNavRow}>
        <nav className={styles.moduleNav} aria-label="Preventive maintenance pages">
          {links.map(({ to, label, end, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `${styles.moduleLink} ${isActive ? styles.moduleLinkActive : ""}`}>
              <Icon aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.viewToggleWrap}>
          <span className={!propertyView ? styles.viewToggleLabelActive : ""}>Classic</span>
          <button
            type="button"
            className={`${styles.viewToggle} ${propertyView ? styles.viewToggleOn : ""}`}
            role="switch"
            aria-checked={propertyView}
            aria-label="Use the property-focused maintenance view"
            onClick={() => changeView(!propertyView)}
          >
            <span />
          </button>
          <span className={propertyView ? styles.viewToggleLabelActive : ""}>Property view</span>
        </div>
      </div>
      {children}
    </AdminLayout>
  );
}
