'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabaseClient';
import { FaChevronRight, FaChevronLeft, FaCalendarAlt, FaFacebook, FaTwitter, FaLink } from 'react-icons/fa';
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
        <div className="font-sans text-gray-800 bg-white min-h-screen">
            {/* Inject Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />

            {/* Top Navigation Spacer (If navbar is fixed) */}
            <div className="h-[80px] bg-slate-900 border-b border-white/10" />

            {/* Breadcrumbs */}
            <nav className="bg-slate-50 border-b border-slate-200 py-4 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                    <ol className="flex items-center space-x-2 text-sm text-slate-500">
                        <li><Link href="/blog" className="hover:text-accent transition-colors flex items-center"><FaChevronLeft className="mr-2" /> Journal</Link></li>
                        <li><FaChevronRight size={10} className="mx-2" /></li>
                        <li className="text-slate-900 font-semibold truncate">{displayPost.title}</li>
                    </ol>
                </div>
            </nav>

            {/* Article Header */}
            <header className="px-6 md:px-12 py-12 md:py-20 max-w-4xl mx-auto text-center">
                <div className="inline-block bg-accent/10 text-accent px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-6">
                    {displayPost.category}
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-8 leading-tight">
                    {displayPost.title}
                </h1>
                <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <img
                            src={displayPost.author_image_url || BLOG_FALLBACK_LOGO}
                            className="w-8 h-8 rounded-full object-cover border border-slate-100"
                            alt="author"
                            onError={applyBlogImageFallback}
                        />
                        <span className="font-semibold text-slate-700">{displayPost.author_name || displayPost.author || "Nirvana Luxe Team"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-slate-400" />
                        <span>{displayPost.created_at ? new Date(displayPost.created_at).toLocaleDateString() : displayPost.date}</span>
                    </div>
                    <div className="hidden sm:block text-slate-300">•</div>
                    <div className="hidden sm:block">{displayPost.read_time || displayPost.readTime || "5 min read"}</div>
                </div>
            </header>

            {/* Hero Image */}
            <div className="px-6 md:px-12 max-w-5xl mx-auto mb-16">
                <div className="aspect-[21/9] rounded-3xl overflow-hidden shadow-2xl bg-slate-200">
                    <img 
                        src={displayPost.cover_image || displayPost.imageUrl || BLOG_FALLBACK_LOGO} 
                        alt={displayPost.title} 
                        onError={applyBlogImageFallback}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Article Content */}
            <div className="px-6 md:px-12 max-w-4xl mx-auto mb-24">
                <RichTextContent
                    value={displayPost.content}
                    className="max-w-none text-slate-600 leading-relaxed
                    [&_p]:mb-5
                    [&_strong]:font-bold [&_strong]:text-slate-900
                    [&_em]:italic
                    [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4
                    [&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-4xl md:[&_h1]:text-5xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-slate-900
                    [&_h2]:mt-8 [&_h2]:mb-4 [&_h2]:text-3xl md:[&_h2]:text-4xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:text-slate-900
                    [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-2xl md:[&_h3]:text-3xl [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:text-slate-900
                    [&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:text-xl md:[&_h4]:text-2xl [&_h4]:font-semibold [&_h4]:leading-snug [&_h4]:text-slate-900
                    [&_ul]:mb-5 [&_ul]:ml-6 [&_ul]:list-disc
                    [&_ol]:mb-5 [&_ol]:ml-6 [&_ol]:list-decimal
                    [&_li]:mb-2
                    [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-slate-700
                    [&_img]:rounded-2xl [&_img]:shadow-lg [&_img]:my-8"
                />

                {/* Social Sharing */}
                <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
                    <div className="text-slate-500 font-semibold">Share this guide</div>
                    <div className="flex gap-4">
                        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#1877F2] hover:text-white transition-colors">
                            <FaFacebook />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#1DA1F2] hover:text-white transition-colors">
                            <FaTwitter />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-800 hover:text-white transition-colors">
                            <FaLink />
                        </button>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <section className="bg-slate-50 py-24 border-t border-slate-200 text-center px-6">
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-4xl font-bold text-slate-900 mb-6">Ready to Experience It Yourself?</h2>
                    <p className="text-xl text-slate-500 mb-10">Browse our exclusive portfolio of luxury Tennessee cabins and secure your direct rate.</p>
                    <Link href="/properties" className="inline-block bg-accent hover:bg-accent/90 text-white px-10 py-4 font-bold text-lg uppercase tracking-wide transition-all shadow-xl hover:shadow-2xl">
                        Explore Properties
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default BlogPost;
