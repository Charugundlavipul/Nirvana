import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";
import { getCurrentAdminRole, isSuperAdminRole } from "../../lib/adminApi";

const NAV_ITEMS = [
    { label: "Dashboard", path: "/admin", exact: true, icon: "D" },
    { label: "Properties", path: "/admin/properties", icon: "P" },
    { label: "Subscribers", path: "/admin/subscribers", icon: "S" },
    { label: "Global Content", path: "/admin/global", icon: "G" },
    { label: "Admins", path: "/admin/admins", icon: "U", superOnly: true },
    { label: "Approvals", path: "/admin/approvals", icon: "A", superOnly: true },
];

const Sidebar = ({ isOpen, toggle }) => {
    const [adminRole, setAdminRole] = useState(null);

    useEffect(() => {
        getCurrentAdminRole().then(setAdminRole);
    }, []);

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

