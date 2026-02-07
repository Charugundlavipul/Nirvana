import React, { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import styles from "./Dashboard.module.css";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";
import {
    FaHome,
    FaCheckCircle,
    FaStar,
    FaHiking,
    FaQuestionCircle,
    FaConciergeBell,
    FaPlus,
    FaEdit,
    FaEye,
    FaChartLine,
    FaCalendarAlt,
    FaArrowRight
} from "react-icons/fa";

const StatCard = ({ title, value, icon: Icon, color, bgColor, subtitle }) => (
    <div className={styles.statCard} style={{ '--accent-color': color, '--bg-color': bgColor }}>
        <div className={styles.statIcon} style={{ background: bgColor, color: color }}>
            <Icon size={24} />
        </div>
        <div className={styles.statContent}>
            <h3>{value}</h3>
            <p>{title}</p>
            {subtitle && <span className={styles.statSubtitle}>{subtitle}</span>}
        </div>
    </div>
);

const QuickAction = ({ title, description, icon: Icon, to, color }) => (
    <Link to={to} className={styles.quickAction} style={{ '--action-color': color }}>
        <div className={styles.actionIcon}>
            <Icon size={20} />
        </div>
        <div className={styles.actionContent}>
            <h4>{title}</h4>
            <p>{description}</p>
        </div>
        <FaArrowRight className={styles.actionArrow} />
    </Link>
);

const RecentItem = ({ title, type, date }) => (
    <div className={styles.recentItem}>
        <div className={styles.recentIcon}>
            {type === 'property' && <FaHome />}
            {type === 'review' && <FaStar />}
            {type === 'activity' && <FaHiking />}
        </div>
        <div className={styles.recentContent}>
            <h5>{title}</h5>
            <span>{date}</span>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        properties: 0,
        activeListings: 0,
        reviews: 0,
        activities: 0,
        faqs: 0,
        amenities: 0
    });
    const [recentProperties, setRecentProperties] = useState([]);
    const [recentReviews, setRecentReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [props, reviews, acts, faqs, amenities, recentProps, recentRevs] = await Promise.all([
                    supabase.from("properties").select("id", { count: "exact", head: true }),
                    supabase.from("reviews").select("id", { count: "exact", head: true }),
                    supabase.from("activities").select("id", { count: "exact", head: true }),
                    supabase.from("faqs").select("id", { count: "exact", head: true }),
                    supabase.from("amenities").select("id", { count: "exact", head: true }),
                    supabase.from("properties").select("id, name, created_at").order("created_at", { ascending: false }).limit(5),
                    supabase.from("reviews").select("id, author_name, created_at").order("created_at", { ascending: false }).limit(5)
                ]);

                setStats({
                    properties: props.count || 0,
                    activeListings: props.count || 0,
                    reviews: reviews.count || 0,
                    activities: acts.count || 0,
                    faqs: faqs.count || 0,
                    amenities: amenities.count || 0
                });

                setRecentProperties(recentProps.data || []);
                setRecentReviews(recentRevs.data || []);
            } catch (error) {
                console.error("Error loading dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <AdminLayout title="Dashboard" subtitle="Welcome back! Here's an overview of your portfolio.">
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <StatCard
                    title="Total Properties"
                    value={stats.properties}
                    icon={FaHome}
                    color="#4361ee"
                    bgColor="#eef2ff"
                    subtitle="In your portfolio"
                />
                <StatCard
                    title="Active Listings"
                    value={stats.activeListings}
                    icon={FaCheckCircle}
                    color="#10b981"
                    bgColor="#ecfdf5"
                    subtitle="All properties are live"
                />
                <StatCard
                    title="Guest Reviews"
                    value={stats.reviews}
                    icon={FaStar}
                    color="#f59e0b"
                    bgColor="#fefce8"
                    subtitle="Across all properties"
                />
                <StatCard
                    title="Activities"
                    value={stats.activities}
                    icon={FaHiking}
                    color="#8b5cf6"
                    bgColor="#f5f3ff"
                    subtitle="Nearby attractions"
                />
                <StatCard
                    title="FAQs"
                    value={stats.faqs}
                    icon={FaQuestionCircle}
                    color="#06b6d4"
                    bgColor="#ecfeff"
                    subtitle="Help articles"
                />
                <StatCard
                    title="Amenities"
                    value={stats.amenities}
                    icon={FaConciergeBell}
                    color="#ec4899"
                    bgColor="#fdf2f8"
                    subtitle="Property features"
                />
            </div>

            {/* Quick Actions */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>Quick Actions</h2>
                    <p>Jump to common tasks</p>
                </div>
                <div className={styles.actionsGrid}>
                    <QuickAction
                        title="Add Property"
                        description="Create a new listing"
                        icon={FaPlus}
                        to="/admin/properties"
                        color="#4361ee"
                    />
                    <QuickAction
                        title="Manage Reviews"
                        description="View and edit reviews"
                        icon={FaStar}
                        to="/admin/global"
                        color="#f59e0b"
                    />
                    <QuickAction
                        title="Edit Activities"
                        description="Update nearby attractions"
                        icon={FaHiking}
                        to="/admin/global"
                        color="#8b5cf6"
                    />
                    <QuickAction
                        title="View Website"
                        description="Preview live site"
                        icon={FaEye}
                        to="/"
                        color="#10b981"
                    />
                    <QuickAction
                        title="Approval Queue"
                        description="Review pending edits"
                        icon={FaChartLine}
                        to="/admin/approvals"
                        color="#ef4444"
                    />
                    <QuickAction
                        title="Admin Users"
                        description="Manage admin accounts"
                        icon={FaEdit}
                        to="/admin/admins"
                        color="#0ea5e9"
                    />
                </div>
            </section>

            {/* Recent Activity */}
            <div className={styles.recentGrid}>
                {/* Recent Properties */}
                <section className={styles.recentSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Properties</h2>
                        <Link to="/admin/properties" className={styles.viewAllLink}>View All</Link>
                    </div>
                    <div className={styles.recentList}>
                        {recentProperties.length > 0 ? (
                            recentProperties.map(prop => (
                                <RecentItem
                                    key={prop.id}
                                    title={prop.name}
                                    type="property"
                                    date={formatDate(prop.created_at)}
                                />
                            ))
                        ) : (
                            <p className={styles.emptyState}>No properties yet</p>
                        )}
                    </div>
                </section>

                {/* Recent Reviews */}
                <section className={styles.recentSection}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Reviews</h2>
                        <Link to="/admin/global" className={styles.viewAllLink}>View All</Link>
                    </div>
                    <div className={styles.recentList}>
                        {recentReviews.length > 0 ? (
                            recentReviews.map(rev => (
                                <RecentItem
                                    key={rev.id}
                                    title={`Review by ${rev.author_name}`}
                                    type="review"
                                    date={formatDate(rev.created_at)}
                                />
                            ))
                        ) : (
                            <p className={styles.emptyState}>No reviews yet</p>
                        )}
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
};

export default Dashboard;
