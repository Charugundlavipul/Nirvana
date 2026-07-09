'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaCalendarAlt, FaClock, FaArrowRight, FaBookOpen } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { SITE_NAME, absoluteUrl } from '../../lib/siteConfig';

const BLOG_FALLBACK_LOGO = '/favicon.png';

const applyBlogImageFallback = (event) => {
    if (event.currentTarget.src.endsWith(BLOG_FALLBACK_LOGO)) return;
    event.currentTarget.src = BLOG_FALLBACK_LOGO;
};

const CATEGORIES = ['All Articles', 'Travel Guides', 'Destinations', 'Property Spotlights'];

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// --- Featured Hero Card -----------------------------------------------------------
const FeaturedPost = ({ post }) => (
    <Link
        href={`/blog/${post.slug}`}
        className="group relative flex flex-col rounded-3xl overflow-hidden shadow-2xl min-h-[480px] bg-slate-900 block"
    >
        {/* Image */}
        <div className="absolute inset-0 overflow-hidden">
            <img
                src={post.cover_image || post.imageUrl || BLOG_FALLBACK_LOGO}
                alt={post.title}
                onError={applyBlogImageFallback}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent hidden lg:block" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end p-8 md:p-12 max-w-2xl mt-auto">
            <div className="flex items-center gap-3 mb-5">
                <span className="bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
                    {post.category || 'Featured'}
                </span>
                <span className="text-white/50 text-xs font-semibold tracking-widest uppercase">Featured</span>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 group-hover:text-accent transition-colors duration-300">
                {post.title}
            </h2>

            <p className="text-slate-300 text-lg font-light leading-relaxed mb-8 line-clamp-2">
                {post.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                    <img
                        src={post.author_image_url || BLOG_FALLBACK_LOGO}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                        alt="author"
                        onError={applyBlogImageFallback}
                    />
                    <span className="text-white font-medium">{post.author_name || 'Nirvana Luxe Team'}</span>
                </div>
                <span className="text-slate-600">&middot;</span>
                <div className="flex items-center gap-1.5">
                    <FaCalendarAlt size={11} />
                    <span>{formatDate(post.created_at)}</span>
                </div>
                {post.read_time && (
                    <>
                        <span className="text-slate-600">&middot;</span>
                        <div className="flex items-center gap-1.5">
                            <FaClock size={11} />
                            <span>{post.read_time}</span>
                        </div>
                    </>
                )}
            </div>

            <div className="mt-8 inline-flex items-center gap-2 text-accent font-semibold text-sm group-hover:gap-4 transition-all duration-300">
                Read Full Article <FaArrowRight size={12} />
            </div>
        </div>
    </Link>
);

// --- Standard Card -----------------------------------------------------------
const PostCard = ({ post }) => (
    <Link
        href={`/blog/${post.slug}`}
        className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
    >
        {/* Thumbnail */}
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-200">
            <img
                src={post.cover_image || post.imageUrl || BLOG_FALLBACK_LOGO}
                alt={post.title}
                loading="lazy"
                onError={applyBlogImageFallback}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute top-4 left-4">
                <span className="bg-accent/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-lg">
                    {post.category}
                </span>
            </div>
            {post.read_time && (
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs flex items-center gap-1.5">
                        <FaClock size={10} /> {post.read_time}
                    </span>
                </div>
            )}
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-accent transition-colors duration-300 line-clamp-2 leading-snug">
                {post.title}
            </h2>
            <p className="text-slate-500 text-sm font-light leading-relaxed flex-1 line-clamp-3 mb-5">
                {post.excerpt}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <div className="flex items-center gap-2">
                    <img
                        src={post.author_image_url || BLOG_FALLBACK_LOGO}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        alt="author"
                        onError={applyBlogImageFallback}
                    />
                    <span className="text-xs font-semibold text-slate-700">{post.author_name || 'Nirvana Luxe Team'}</span>
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <FaCalendarAlt size={10} className="text-slate-300" />
                    {formatDate(post.created_at)}
                </span>
            </div>
        </div>
    </Link>
);

// --- Main Feed ---------------------------------------------------------------
const BlogFeed = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All Articles');

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('published', true)
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching blogs:', error);
            else setPosts(data || []);
            setLoading(false);
        };
        fetchPosts();
    }, []);

    useEffect(() => {
        document.title = `Smoky Mountain Luxury Travel Blog & Guides | ${SITE_NAME}`;
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = 'description';
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = `Plan your next premium vacation with ${SITE_NAME}'s expert travel guides, destination comparisons, and luxury cabin tips for the Smoky Mountains area.`;
    }, []);

    const feedSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${SITE_NAME} Luxury Travel Blog`,
        description: 'Expert travel guides and tips for Smoky Mountain luxury vacations.',
        itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: absoluteUrl(`/blog/${post.slug}`),
        })),
    };

    const filtered = activeCategory === 'All Articles'
        ? posts
        : posts.filter(p => p.category === activeCategory);

    const featuredPost = filtered[0] || null;
    const gridPosts = filtered.slice(1);

    return (
        <div className="font-sans text-gray-800 bg-slate-50 min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(feedSchema) }}
            />

            {/* ── Hero ──────────────────────────────────────────────────── */}
            <section className="relative overflow-hidden min-h-[520px] flex flex-col justify-center">
                {/* Background image */}
                <div className="absolute inset-0">
                    <img
                        src="/blog-hero-bg.png"
                        alt="Smoky Mountain luxury backdrop"
                        className="w-full h-full object-cover object-center"
                    />
                    {/* Dark overlay layers for legibility */}
                    <div className="absolute inset-0 bg-slate-950/70" />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/80" />
                </div>

                {/* Ambient accent glow — sits above bg, below content */}
                <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-6 md:px-12 pt-36 pb-24 text-center">
                    <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-5 py-2 rounded-full text-xs font-bold tracking-[0.25em] uppercase mb-8">
                        <FaBookOpen size={11} />
                        Inspiration &amp; Guides
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6">
                        The{' '}
                        <span className="text-accent">Nirvana Luxe</span>
                        <br />Journal
                    </h1>

                    <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
                        Curated experiences, travel tips, and deep dives into the finest mountain retreats in Tennessee.
                    </p>

                    <div className="flex items-center justify-center gap-10 mt-12 text-slate-400 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{posts.length}</div>
                            <div className="text-xs uppercase tracking-wider mt-0.5">Articles</div>
                        </div>
                        <div className="w-px h-8 bg-slate-700" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">{CATEGORIES.length - 1}</div>
                            <div className="text-xs uppercase tracking-wider mt-0.5">Categories</div>
                        </div>
                        <div className="w-px h-8 bg-slate-600" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">5&#9733;</div>
                            <div className="text-xs uppercase tracking-wider mt-0.5">Luxury Focus</div>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent" />
            </section>

            {/* --- Category Filters ----------------------------------------- */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-10 pb-2">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                                activeCategory === cat
                                    ? 'bg-accent text-white shadow-lg shadow-accent/25 scale-105'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-accent hover:text-accent hover:shadow-md'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                    <span className="ml-auto text-sm text-slate-400 whitespace-nowrap flex-shrink-0 hidden md:block">
                        {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
                    </span>
                </div>
                <div className="mt-6 h-px bg-gradient-to-r from-accent/30 via-slate-200 to-transparent" />
            </div>

            {/* --- Content Area --------------------------------------------- */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 py-12">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-5">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
                            <div className="absolute inset-0 rounded-full border-4 border-t-accent animate-spin" />
                        </div>
                        <p className="text-slate-400 font-medium tracking-wide">Curating mountain insights...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="max-w-lg mx-auto text-center py-28 px-8">
                        <div className="w-24 h-24 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-8 text-4xl">
                            <FaBookOpen />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">No Articles Yet</h2>
                        <p className="text-slate-500 leading-relaxed mb-10">
                            {activeCategory === 'All Articles'
                                ? "We're drafting new guides. Check back soon."
                                : `No articles found under "${activeCategory}" yet.`}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {activeCategory !== 'All Articles' && (
                                <button
                                    onClick={() => setActiveCategory('All Articles')}
                                    className="inline-flex items-center gap-2 bg-accent text-white px-8 py-3.5 rounded-full font-semibold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                                >
                                    View All Articles
                                </button>
                            )}
                            <Link
                                href="/properties"
                                className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-primary-hover transition-all shadow-md"
                            >
                                Explore Properties
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        {featuredPost && (
                            <div className="mb-12">
                                <FeaturedPost post={featuredPost} />
                            </div>
                        )}
                        {gridPosts.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {gridPosts.map(post => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* --- CTA Strip ------------------------------------------------ */}
            <section className="relative overflow-hidden bg-slate-900 mt-16">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(96,189,104,0.15),_transparent_60%)]" />
                <div className="relative max-w-5xl mx-auto text-center px-6 py-24">
                    <p className="text-accent text-xs font-bold tracking-[0.3em] uppercase mb-4">Ready to Experience It?</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        Book Your Dream<br />Mountain Escape
                    </h2>
                    <p className="text-slate-400 text-lg font-light max-w-xl mx-auto mb-10">
                        Browse our curated portfolio of luxury Tennessee cabins and secure your best direct rate.
                    </p>
                    <Link
                        href="/properties"
                        className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-white px-10 py-4 rounded-full font-bold text-base uppercase tracking-wide transition-all duration-300 shadow-2xl shadow-accent/30 hover:shadow-accent/50 hover:scale-105"
                    >
                        Explore Properties <FaArrowRight />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default BlogFeed;
