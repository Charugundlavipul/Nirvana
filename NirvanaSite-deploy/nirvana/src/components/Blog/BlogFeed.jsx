'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaChevronRight, FaCalendarAlt } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';

// SEO Optimized Blog Feed
// Intercepts travelers during the "planning" phase.

const BLOG_FALLBACK_LOGO = '/favicon.png';

const applyBlogImageFallback = (event) => {
    if (event.currentTarget.src.endsWith(BLOG_FALLBACK_LOGO)) return;
    event.currentTarget.src = BLOG_FALLBACK_LOGO;
};

const BlogFeed = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('published', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching blogs:", error);
            } else {
                setPosts(data || []);
            }
            setLoading(false);
        };

        fetchPosts();
    }, []);

    // Dynamic SEO update for Client-Side Rendering
    useEffect(() => {
        document.title = 'Smoky Mountain Luxury Travel Blog & Guides | NirvanaLuxe';
        
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = "description";
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = `Plan your next premium vacation with NirvanaLuxe's expert travel guides, destination comparisons, and luxury cabin tips for the Smoky Mountains area.`;
    }, []);

    // JSON-LD Schema for Blog Feed / ItemList
    const feedSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "NirvanaLuxe Luxury Travel Blog",
        "description": "Expert travel guides and tips for Smoky Mountain luxury vacations.",
        "itemListElement": posts.map((post, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `https://www.nirvanaluxe.com/blog/${post.slug}`
        }))
    };

    return (
        <div className="font-sans text-gray-800 bg-slate-50 min-h-screen">
            {/* Inject Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(feedSchema) }}
            />

            {/* Hero Section */}
            <section className="bg-slate-900 py-24 px-6 md:px-12 text-center text-white">
                <div className="max-w-4xl mx-auto mt-16">
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-semibold mb-4">Inspiration & Guides</p>
                    <h1 className="text-5xl md:text-6xl font-bold mb-6">The NirvanaLuxe Journal</h1>
                    <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto">
                        Curated experiences, travel tips, and deep dives into the finest mountain retreats in Tennessee.
                    </p>
                </div>
            </section>

            {/* Breadcrumbs */}
            <nav className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 max-w-7xl mx-auto text-sm text-slate-500">
                <ol className="flex items-center space-x-2">
                    <li><Link href="/" className="hover:text-accent transition-colors">Home</Link></li>
                    <li><FaChevronRight size={10} className="mx-2" /></li>
                    <li className="text-slate-900 font-semibold">Journal</li>
                </ol>
            </nav>

            {/* Top Categories Filters (UI placeholder for future implementation) */}
            <div className="max-w-7xl mx-auto px-6 mt-12 overflow-x-auto no-scrollbar pb-2">
                <div className="flex space-x-4">
                    <button className="px-6 py-2 bg-slate-200 text-slate-800 rounded-full font-semibold text-sm hover:bg-accent hover:text-white transition-all">All Articles</button>
                    <button className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-full font-semibold text-sm hover:border-accent hover:text-accent transition-all whitespace-nowrap">Travel Guides</button>
                    <button className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-full font-semibold text-sm hover:border-accent hover:text-accent transition-all whitespace-nowrap">Destinations</button>
                    <button className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-full font-semibold text-sm hover:border-accent hover:text-accent transition-all whitespace-nowrap">Property Spotlights</button>
                </div>
            </div>

            {/* Blog Post Grid */}
            <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-500 font-medium">Curating mountain insights...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="max-w-2xl mx-auto text-center py-24 px-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-8">
                            <FaCalendarAlt size={32} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">The Journal is Warming Up</h2>
                        <p className="text-slate-600 text-lg font-light leading-relaxed mb-10">
                            We're currently drafting new travel guides, destination tips, and hidden gems for your next Smoky Mountain getaway. Check back shortly for our latest updates.
                        </p>
                        <Link 
                            href="/properties" 
                            className="inline-block bg-primary text-white px-10 py-4 font-bold rounded-full hover:bg-accent transition-all duration-300 shadow-md"
                        >
                            Explore Our Properties
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {posts.map(post => (
                            <Link 
                                key={post.id} 
                                href={`/blog/${post.slug}`}
                                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                                    <img 
                                        src={post.cover_image || post.imageUrl || BLOG_FALLBACK_LOGO} 
                                        alt={post.title} 
                                        loading="lazy"
                                        onError={applyBlogImageFallback}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                    <div className="absolute top-4 left-4 bg-accent text-white px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                                        {post.category}
                                    </div>
                                </div>
                                <div className="p-8 flex flex-col flex-1">
                                    <h2 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-accent transition-colors line-clamp-3">
                                        {post.title}
                                    </h2>
                                    <p className="text-slate-600 font-light mb-6 flex-1 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between text-sm text-slate-500 pt-6 border-t border-slate-100 mt-auto">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={post.author_image_url || BLOG_FALLBACK_LOGO}
                                                className="w-6 h-6 rounded-full object-cover"
                                                alt="author"
                                                onError={applyBlogImageFallback}
                                            />
                                            <span className="font-medium text-slate-700">{post.author_name || "Nirvana Luxe Team"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FaCalendarAlt className="text-slate-400" />
                                            <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default BlogFeed;
