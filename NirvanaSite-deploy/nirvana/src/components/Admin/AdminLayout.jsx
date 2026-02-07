import React, { useState } from "react";
import styles from "./AdminLayout.module.css";
import Sidebar from "./Sidebar";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

const AdminLayout = ({ children, title, subtitle }) => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate("/admin/login");
    };

    return (
        <div className={styles.adminContainer}>
            <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            <main className={`${styles.mainContent} ${!isSidebarOpen ? styles.expanded : ""}`}>
                <header className={styles.topBar}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>{title}</h1>
                        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
                    </div>
                    <div className={styles.actions}>
                        <button onClick={handleSignOut} className={styles.signOutBtn}>
                            Sign Out
                        </button>
                    </div>
                </header>
                <div className={styles.contentScrollWrapper}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
