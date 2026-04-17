import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";
import { getCurrentAdminRole, isSuperAdminRole, fetchMyPendingDrafts } from "../../lib/adminApi";

const NAV_ITEMS = [
    { label: "Dashboard", path: "/admin", exact: true, icon: "D", draftBadgeKey: "all" },
    { label: "Properties", path: "/admin/properties", icon: "P" },
    { label: "Blogs", path: "/admin/blogs", icon: "B" },
    { label: "Knowledge Hub", path: "/admin/knowledge", icon: "K" },
    { label: "Subscribers", path: "/admin/subscribers", icon: "S" },
    { label: "Global Content", path: "/admin/global", icon: "G" },
    { label: "Admins", path: "/admin/admins", icon: "U", superOnly: true },
    { label: "Approvals", path: "/admin/approvals", icon: "A", superOnly: true },
];

const Sidebar = ({ isOpen, toggle }) => {
    const [adminRole, setAdminRole] = useState(null);
    const [draftCount, setDraftCount] = useState(0);

    useEffect(() => {
        getCurrentAdminRole().then(setAdminRole);
    }, []);

    useEffect(() => {
        if (adminRole === null) return;
        if (!isSuperAdminRole(adminRole)) {
            fetchMyPendingDrafts().then((drafts) => {
                setDraftCount(drafts.length);
            });
        }
    }, [adminRole]);

    const isSuperAdmin = isSuperAdminRole(adminRole);

    const visibleItems = NAV_ITEMS.filter(
        (item) => !item.superOnly || isSuperAdmin
    );

    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
            <div className={styles.logoContainer}>
                <div className={styles.logoText}>Nirvana Admin</div>
                <button className={styles.toggleBtn} onClick={toggle}>
                    {isOpen ? "<" : ">"}
                </button>
            </div>

            <nav className={styles.nav}>
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) =>
                            `${styles.navItem} ${isActive ? styles.active : ""}`
                        }
                    >
                        <span className={styles.icon}>{item.icon}</span>
                        {isOpen && <span className={styles.label}>{item.label}</span>}
                        {!isSuperAdmin && item.draftBadgeKey === "all" && draftCount > 0 && (
                            <span style={{
                                marginLeft: "auto",
                                fontSize: "10px",
                                fontWeight: 700,
                                minWidth: "20px",
                                height: "20px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "999px",
                                background: "#ef4444",
                                color: "#fff",
                                lineHeight: 1,
                                padding: "0 6px",
                            }}>
                                {draftCount}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className={styles.footer}>
                {isOpen && <span className={styles.version}>v2.0 Premium</span>}
            </div>
        </aside>
    );
};

export default Sidebar;
