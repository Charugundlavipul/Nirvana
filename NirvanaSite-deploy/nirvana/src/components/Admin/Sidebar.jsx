import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

// Icons can be replaced with an icon library if available, using text/emoji for now to keep it lightweight
const NAV_ITEMS = [
    { label: "Dashboard", path: "/admin", exact: true, icon: "📊" },
    { label: "Properties", path: "/admin/properties", icon: "🏠" },
    { label: "Global Content", path: "/admin/global", icon: "🌍" },
    // { label: "Media Library", path: "/admin/media", icon: "🖼️" },
];

const Sidebar = ({ isOpen, toggle }) => {
    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
            <div className={styles.logoContainer}>
                <div className={styles.logoText}>Nirvana Admin</div>
                <button className={styles.toggleBtn} onClick={toggle}>
                    {isOpen ? "◀" : "▶"}
                </button>
            </div>

            <nav className={styles.nav}>
                {NAV_ITEMS.map((item) => (
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
