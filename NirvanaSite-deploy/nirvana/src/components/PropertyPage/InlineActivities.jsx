import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaMapMarkerAlt, FaHiking, FaUtensils, FaCamera, FaShoppingBag, FaIcons, FaArrowRight, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const getActivityIcon = (category) => {
    switch (category?.toLowerCase()) {
        case "hiking":
        case "outdoors":
        case "nature":
            return <FaHiking />;
        case "dining":
        case "food":
        case "bars":
            return <FaUtensils />;
        case "sightseeing":
        case "attractions":
        case "museum":
            return <FaCamera />;
        case "shopping":
            return <FaShoppingBag />;
        default:
            return <FaIcons />;
    }
};

const InlineActivities = ({ activities = [], slug }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!activities || activities.length === 0) return null;

    const getVisibleActivities = () => {
        if (!activities.length) return [];
        let count = 3;
        if (isClient && window.innerWidth < 1024) count = 2; // Tablet
        if (isClient && window.innerWidth < 768) count = 1;  // Mobile
        
        const result = [];
        for (let i = 0; i < Math.min(count, activities.length); i++) {
            result.push(activities[(currentIndex + i) % activities.length]);
        }
        return result;
    };

    const nextActivity = () => setCurrentIndex(prev => (prev + 1) % activities.length);
    const prevActivity = () => setCurrentIndex(prev => (prev - 1 + activities.length) % activities.length);

    return (
        <section className="pt-24 pb-32 bg-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-50"></div>

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16 max-w-3xl mx-auto">
                    <p className="text-accent uppercase tracking-[0.3em] text-xs font-bold mb-4">Curated Experiences</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight border-b-2 border-accent/20 pb-4 inline-block">Explore Your Surroundings</h2>
                    <p className="text-lg text-slate-500 font-light mt-6">Discover the finest local attractions, hidden gems, and gourmet dining handpicked for an unforgettable stay.</p>
                </div>

                {/* Desktop/XL Floating Arrows (Hidden on Mobile) */}
                {activities.length > 3 && (
                    <div className="absolute top-[60%] -translate-y-1/2 left-0 right-0 hidden xl:flex justify-between px-4 pointer-events-none z-30">
                        <button 
                            onClick={prevActivity}
                            className="w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center text-slate-600 hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100 pointer-events-auto -translate-x-1/2"
                        >
                            <FaChevronLeft size={18} />
                        </button>
                        <button 
                            onClick={nextActivity}
                            className="w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center text-slate-600 hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100 pointer-events-auto translate-x-1/2"
                        >
                            <FaChevronRight size={18} />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {getVisibleActivities().map((activity, idx) => (
                        <div 
                            key={activity.id || idx}
                            className="group relative flex flex-col h-[520px] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 hover:shadow-accent/10 transition-all duration-500 transform hover:-translate-y-2 border border-slate-100"
                        >
                            {/* Image Container with Zoom effect */}
                            <div className="relative h-[280px] w-full overflow-hidden">
                                {activity.image_url ? (
                                    <img 
                                        src={activity.image_url} 
                                        alt={activity.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                        <FaIcons size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                
                                {/* Premium Badge */}
                                <div className="absolute top-6 left-6 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold text-slate-800 shadow-lg uppercase tracking-widest border border-white/50">
                                    <span className="text-accent">{getActivityIcon(activity.category)}</span>
                                    {activity.category}
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-8 md:p-10 flex flex-col flex-1 bg-white">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-accent transition-colors duration-300">
                                    {activity.name || activity.title || "Experience"}
                                </h3>
                                <p className="text-slate-500 line-clamp-3 font-light leading-relaxed mb-8 flex-1">
                                    {activity.description}
                                </p>
                                
                                <div className="flex items-center justify-between mt-auto">
                                    {activity.distance && (
                                        <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                                            <FaMapMarkerAlt className="text-accent" />
                                            {activity.distance}
                                        </div>
                                    )}
                                    
                                    {activity.website_url && (
                                        <a 
                                            href={activity.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group/btn inline-flex items-center gap-3 px-6 py-3 bg-slate-50 text-slate-900 font-bold text-xs uppercase tracking-[0.15em] rounded-2xl hover:bg-accent hover:text-white transition-all duration-300"
                                        >
                                            Explore <FaArrowRight size={10} className="transform group-hover/btn:translate-x-1 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile/Tablet Arrow Controls (Placed BELOW the grid) */}
                {activities.length > 3 && (
                    <div className="flex xl:hidden justify-center gap-6 mt-12 mb-8">
                        <button 
                            type="button"
                            onClick={prevActivity}
                            className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-600 hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100"
                        >
                            <FaChevronLeft size={18} />
                        </button>
                        <button 
                            type="button"
                            onClick={nextActivity}
                            className="w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-600 hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100"
                        >
                            <FaChevronRight size={18} />
                        </button>
                    </div>
                )}

                <div className="text-center mt-20">
                    <Link 
                        href={`/activities/${slug}`} 
                        className="inline-flex items-center gap-4 group text-slate-900 font-bold uppercase tracking-[0.2em] text-sm hover:text-accent transition-all pl-4"
                    >
                        View All Experiences
                        <span className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-accent group-hover:bg-accent group-hover:text-white transition-all">
                            <FaArrowRight />
                        </span>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default InlineActivities;

