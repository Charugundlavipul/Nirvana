import React, { useState } from "react";
import AdminLayout from "../AdminLayout";
import styles from "../Properties/PropertyEditor.module.css"; // Reusing tabs styles
import ReviewManager from "./ReviewManager";
import FaqManager from "./FaqManager";
import ActivityManager from "./ActivityManager";

const GlobalContent = () => {
    const [activeTab, setActiveTab] = useState("reviews");

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
                </div>

                <div className={styles.tabContent}>
                    {activeTab === "reviews" && <ReviewManager />}
                    {activeTab === "faqs" && <FaqManager />}
                    {activeTab === "activities" && <ActivityManager />}
                </div>
            </div>
        </AdminLayout>
    );
};

export default GlobalContent;
