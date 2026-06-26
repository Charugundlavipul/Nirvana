import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FaChartPie, FaBuilding, FaPenNib, FaBookOpen, FaUsers, FaGlobeAmericas, FaUserShield, FaCheckSquare, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getCurrentAdminRole, isSuperAdminRole, fetchMyPendingDrafts } from "../../lib/adminApi";

const NAV_ITEMS = [
    { label: "Dashboard", path: "/admin", exact: true, icon: <FaChartPie size={18} />, draftBadgeKey: "all" },
    { label: "Properties", path: "/admin/properties", icon: <FaBuilding size={18} /> },
    { label: "Blogs", path: "/admin/blogs", icon: <FaPenNib size={18} /> },
    { label: "Knowledge Hub", path: "/admin/knowledge", icon: <FaBookOpen size={18} /> },
    { label: "Subscribers", path: "/admin/subscribers", icon: <FaUsers size={18} /> },
    { label: "Global Content", path: "/admin/global", icon: <FaGlobeAmericas size={18} /> },
    { label: "Admins", path: "/admin/admins", icon: <FaUserShield size={18} />, superOnly: true },
    { label: "Approvals", path: "/admin/approvals", icon: <FaCheckSquare size={18} />, superOnly: true },
];

const Sidebar = ({ isOpen, toggle }) => {
    const [adminRole, setAdminRole] = useState(() => sessionStorage.getItem("nirvana_admin_role") || null);
    const [draftCount, setDraftCount] = useState(0);

    useEffect(() => {
        getCurrentAdminRole().then((role) => {
            if (role) {
                sessionStorage.setItem("nirvana_admin_role", role);
            }
            setAdminRole(role);
        });
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
        <aside
            className={`fixed bottom-0 left-0 top-0 z-50 flex flex-col bg-slate-900 text-white transition-all duration-300 shadow-2xl ${
                isOpen ? "w-64" : "w-20"
            } max-md:-translate-x-full max-md:w-64 ${isOpen ? "max-md:translate-x-0" : ""}`}
        >
            <div className="flex h-20 items-center justify-between border-b border-slate-700/50 px-6">
                <div className={`text-xl font-extrabold tracking-wide text-white transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 hidden"}`}>
                    Nirvana<span className="text-emerald-400">Admin</span>
                </div>
                <button
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                    onClick={toggle}
                >
                    {isOpen ? <FaChevronLeft size={12} /> : <FaChevronRight size={12} />}
                </button>
            </div>

            <nav className="flex flex-1 flex-col gap-2 overflow-y-auto py-6 px-3 custom-scrollbar">
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) =>
                            `group flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                                isActive
                                    ? "bg-emerald-600/10 text-emerald-400"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            }`
                        }
                        title={!isOpen ? item.label : undefined}
                    >
                        <span className={`flex items-center justify-center transition-colors ${!isOpen && "mx-auto"}`}>
                            {item.icon}
                        </span>
                        
                        {isOpen && (
                            <span className="ml-4 truncate">
                                {item.label}
                            </span>
                        )}

                        {!isSuperAdmin && item.draftBadgeKey === "all" && draftCount > 0 && isOpen && (
                            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm">
                                {draftCount}
                            </span>
                        )}
                        
                        {!isSuperAdmin && item.draftBadgeKey === "all" && draftCount > 0 && !isOpen && (
                            <span className="absolute right-3 top-2 flex h-2 w-2 rounded-full bg-rose-500"></span>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-slate-700/50 p-6 text-center text-xs font-medium text-slate-500">
                {isOpen ? "v2.0 Premium" : "v2"}
            </div>
        </aside>
    );
};

export default Sidebar;
