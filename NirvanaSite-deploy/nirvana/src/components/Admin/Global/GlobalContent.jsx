import React, { useState, useEffect } from "react";
import AdminLayout from "../AdminLayout";
import styles from "../Properties/PropertyEditor.module.css"; // Reusing tabs styles
import ReviewManager from "./ReviewManager";
import FaqManager from "./FaqManager";
import ActivityManager from "./ActivityManager";
import LegalPagesManager from "./LegalPagesManager";
import { getCurrentAdminRole, isSuperAdminRole } from "../../../lib/adminApi";

const GlobalContent = () => {
    const [activeTab, setActiveTab] = useState("reviews");
    const [adminRole, setAdminRole] = useState(null);

    useEffect(() => {
        getCurrentAdminRole().then(setAdminRole);
    }, []);

    const isSuperAdmin = isSuperAdminRole(adminRole);

    return (
        <AdminLayout title="Global Content" subtitle="Manage reviews, FAQs, and activities across the site">
            <div className={styles.tabsContainer}>
                <div className={styles.tabsHeader}>
                    <button
                        className={`${styles.tab} ${activeTab === "reviews" ? styles.active : ""}`}
                        onClick={() => setActiveTab("reviews")}
                    >
                        Reviews
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "faqs" ? styles.active : ""}`}
                        onClick={() => setActiveTab("faqs")}
                    >
                        FAQs
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === "activities" ? styles.active : ""}`}
                        onClick={() => setActiveTab("activities")}
                    >
                        Activities
                    </button>
                    {isSuperAdmin && (
                        <button
                            className={`${styles.tab} ${activeTab === "legal" ? styles.active : ""}`}
                            onClick={() => setActiveTab("legal")}
                        >
                            Legal Pages
                        </button>
                    )}
                </div>

                <div className={styles.tabContent}>
                    {activeTab === "reviews" && <ReviewManager />}
                    {activeTab === "faqs" && <FaqManager />}
                    {activeTab === "activities" && <ActivityManager />}
                    {activeTab === "legal" && isSuperAdmin && <LegalPagesManager />}
                </div>
            </div>
        </AdminLayout>
    );
};

export default GlobalContent;
