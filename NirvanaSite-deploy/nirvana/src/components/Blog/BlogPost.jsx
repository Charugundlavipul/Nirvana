'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { FaChevronRight, FaChevronLeft, FaCalendarAlt, FaFacebook, FaTwitter, FaLink, FaClock, FaArrowRight } from 'react-icons/fa';
import RichTextContent from '../common/RichTextContent';
import { SITE_NAME, absoluteUrl } from '../../lib/siteConfig';

// SEO Optimized Blog Post
// Targeted at specific long-tail informational queries and deep linking.

const BLOG_FALLBACK_LOGO = '/favicon.png';

const applyBlogImageFallback = (event) => {
    if (event.currentTarget.src.endsWith(BLOG_FALLBACK_LOGO)) return;
    event.currentTarget.src = BLOG_FALLBACK_LOGO;
};

const BlogPost = ({ slug: propSlug }) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            const currentSlug = propSlug;
            setLoading(true);
            const { data, error } = await supabase
                .from('blogs')
                .select('*')
                .eq('slug', currentSlug)
                .maybeSingle();

            if (data) setPost(data);
            setLoading(false);
        };
        fetchPost();
    }, [propSlug]);

    const displayPost = post || {
        title: propSlug ? propSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'The Ultimate Luxury Guide',
        content: '<p>Loading latest mountain insights...</p>',
        excerpt: 'Your guide to luxury stays.',
        author: `${SITE_NAME} Team`,
        date: new Date().toLocaleDateString(),
        category: 'Travel Guides',
        imageUrl: BLOG_FALLBACK_LOGO,
        readTime: '5 min read'
    };

    // Dynamic SEO update for Client-Side Rendering
    useEffect(() => {
        document.title = `${displayPost.title} | ${SITE_NAME} Journal`;
        
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = "description";
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = displayPost.excerpt;
    }, [displayPost.title, displayPost.excerpt]);

    // JSON-LD Schema for Article
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": displayPost.title,
        "image": [
            absoluteUrl(displayPost.cover_image || displayPost.imageUrl || BLOG_FALLBACK_LOGO)
        ],
        "datePublished": displayPost.created_at || "2026-10-15T08:00:00+08:00",
        "author": [{
            "@type": "Organization",
            "name": displayPost.author_name || displayPost.author || `${SITE_NAME} Team`,
            "url": absoluteUrl("/")
        }],
        "description": displayPost.excerpt
    };

    return (
        <div className="font-sans text-gray-800 bg-slate-50 min-h-screen">
            {/* Inject Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />

            {/* --- Cinematic Hero --------------------------------------------- */}
            <section className="relative w-full min-h-[70vh] flex flex-col justify-end bg-slate-950 overflow-hidden">
                {/* Background Image & Overlays */}
                <div className="absolute inset-0">
                    <img 
                        src={displayPost.cover_image || displayPost.imageUrl || BLOG_FALLBACK_LOGO} 
                        alt={displayPost.title} 
                        onError={applyBlogImageFallback}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                </div>

                {/* Breadcrumbs Top Layer */}
                <div className="absolute top-0 left-0 w-full z-20 border-b border-white/10 bg-slate-950/20 backdrop-blur-md">
                    <nav className="max-w-7xl mx-auto px-6 md:px-12 py-4">
                        <ol className="flex items-center space-x-2 text-sm text-slate-300">
                            <li>
                                <Link href="/blog" className="hover:text-accent transition-colors flex items-center gap-2">
                                    <FaChevronLeft size={10} /> Journal
                                </Link>
                            </li>
                            <li><FaChevronRight size={10} className="mx-2 text-slate-500" /></li>
                            <li className="text-white font-medium truncate max-w-[200px] md:max-w-sm">{displayPost.title}</li>
                        </ol>
                    </nav>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 pb-16 pt-32 w-full text-center">
                    <div className="inline-block bg-accent/20 border border-accent/30 text-accent px-5 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(96,189,104,0.3)]">
                        {displayPost.category}
                    </div>
                    
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-[1.1] max-w-4xl mx-auto drop-shadow-lg">
                        {displayPost.title}
                    </h1>

                    <div className="flex items-center justify-center flex-wrap gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-3">
                            <img
                                src={displayPost.author_image_url || BLOG_FALLBACK_LOGO}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-md"
                                alt="author"
                                onError={applyBlogImageFallback}
                            />
                            <span className="font-semibold text-white tracking-wide">{displayPost.author_name || displayPost.author || "Nirvana Luxe Team"}</span>
                        </div>
                        <span className="text-slate-500 hidden sm:inline">&middot;</span>
                        <div className="flex items-center gap-2">
                            <FaCalendarAlt className="text-slate-400" />
                            <span>{displayPost.created_at ? new Date(displayPost.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : displayPost.date}</span>
                        </div>
                        <span className="text-slate-500 hidden sm:inline">&middot;</span>
                        <div className="flex items-center gap-2 hidden sm:flex">
                            <FaClock className="text-slate-400" />
                            <span>{displayPost.read_time || displayPost.readTime || "5 min read"}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Main Content ----------------------------------------------- */}
            <section className="relative -mt-10 max-w-4xl mx-auto px-6 md:px-12 mb-24 z-20">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-16">
                    {/* Abstract/Excerpt (Optional nice touch for long articles) */}
                    {displayPost.excerpt && (
                        <p className="text-xl md:text-2xl font-light text-slate-500 leading-relaxed mb-12 text-center italic">
                            "{displayPost.excerpt}"
                        </p>
                    )}

                    {/* Rich Text Body */}
                    <RichTextContent
                        value={displayPost.content}
                        className="max-w-none text-slate-700 leading-loose text-lg
                        [&_p]:mb-6
                        [&_strong]:font-bold [&_strong]:text-slate-900
                        [&_em]:italic
                        [&_a]:text-accent [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-accent-dark transition-colors
                        [&_h1]:mt-14 [&_h1]:mb-6 [&_h1]:text-4xl md:[&_h1]:text-5xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-slate-900 [&_h1]:tracking-tight
                        [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:text-3xl md:[&_h2]:text-4xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-slate-900 [&_h2]:tracking-tight
                        [&_h3]:mt-10 [&_h3]:mb-4 [&_h3]:text-2xl md:[&_h3]:text-3xl [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:text-slate-900
                        [&_h4]:mt-8 [&_h4]:mb-4 [&_h4]:text-xl md:[&_h4]:text-2xl [&_h4]:font-semibold [&_h4]:leading-snug [&_h4]:text-slate-900
                        [&_ul]:mb-8 [&_ul]:ml-8 [&_ul]:list-disc [&_ul]:space-y-2
                        [&_ol]:mb-8 [&_ol]:ml-8 [&_ol]:list-decimal [&_ol]:space-y-2
                        [&_blockquote]:my-10 [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:bg-slate-50 [&_blockquote]:p-6 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:rounded-r-xl
                        [&_img]:rounded-2xl [&_img]:shadow-lg [&_img]:my-10 [&_img]:w-full"
                    />

                    {/* Social Sharing */}
                    <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">Share this Guide</div>
                        <div className="flex gap-4">
                            <button className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                                <FaFacebook size={18} />
                            </button>
                            <button className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                                <FaTwitter size={18} />
                            </button>
                            <button className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-800 hover:text-white hover:border-slate-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                                <FaLink size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA Strip ------------------------------------------------ */}
            <section className="relative overflow-hidden bg-slate-900">
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

export default BlogPost;
