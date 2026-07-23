'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaTimes, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaStar, FaHiking, FaComments, FaChevronDown, FaPlay } from 'react-icons/fa';
import { getAmenityIcon } from '../../lib/amenityIcons.jsx';
import { createRichTextExcerpt } from '../../lib/richText';
import RichTextContent from '../common/RichTextContent';
import AvailabilityCalendar from '../common/AvailabilityCalendar';
import InlineReviews from './InlineReviews';
import InlineActivities from './InlineActivities';
import ContactForm from '../Contact/ContactForm';
import HospitableWidget from '../common/HospitableWidget';
import { getBathroomSummary, normalizeBathroomCounts } from '../../lib/bathrooms';
import CarouselNavigation from '../common/CarouselNavigation';

const LIGHTBOX_PRELOAD_RADIUS = 5;

const PropertyPage = ({ slug, initialBundle = null, initialReviews = [], initialActivities = [], allProperties = [] }) => {
    const [lightboxImage, setLightboxImage] = useState(null);
    const [lightboxType, setLightboxType] = useState('');
    const [lightboxImages, setLightboxImages] = useState([]);
    const heroRef = useRef(null);
    const mobileGalleryRef = useRef(null);
    const lightboxPreloadCacheRef = useRef(new Map());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);
    const [mobileGalleryIndex, setMobileGalleryIndex] = useState(0);

    const property = initialBundle?.property || null;
    const galleryImages = initialBundle?.galleryImages || [];
    const amenities = initialBundle?.amenities || [];
    const curatedImages = initialBundle?.curated || { home: '', bg: '', secondary: '' };

    useEffect(() => {
        const handleScroll = () => {
            if (heroRef.current) {
                const offset = window.pageYOffset;
                heroRef.current.style.backgroundPositionY = `calc(50% + ${offset * 0.4}px)`;
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        setCurrentIndex(0);
        setVisibleCount(10);
        setMobileGalleryIndex(0);
    }, [slug]);

    useEffect(() => {
        if (galleryImages.length > 0 && visibleCount < galleryImages.length) {
            const timer = setTimeout(() => {
                setVisibleCount((prev) => Math.min(prev + 10, galleryImages.length));
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [visibleCount, galleryImages.length]);

    const sliderImages = galleryImages;

    const preloadLightboxWindow = (images, activeImage) => {
        if (typeof window === 'undefined' || !Array.isArray(images) || images.length < 2 || !activeImage) return;
        const activeIndex = images.findIndex((image) => image === activeImage);
        if (activeIndex < 0) return;

        const windowUrls = new Set([activeImage]);
        for (let offset = 1; offset <= LIGHTBOX_PRELOAD_RADIUS; offset += 1) {
            windowUrls.add(images[(activeIndex - offset + images.length) % images.length]);
            windowUrls.add(images[(activeIndex + offset) % images.length]);
        }

        windowUrls.forEach((url) => {
            if (!url || lightboxPreloadCacheRef.current.has(url)) return;
            const preloadImage = new window.Image();
            preloadImage.decoding = 'async';
            preloadImage.src = url;
            lightboxPreloadCacheRef.current.set(url, preloadImage);
        });

        // Keep references only for the rolling 5-before/5-after window.
        lightboxPreloadCacheRef.current.forEach((_, url) => {
            if (!windowUrls.has(url)) lightboxPreloadCacheRef.current.delete(url);
        });
    };

    const updateMobileGalleryIndex = () => {
        const track = mobileGalleryRef.current;
        const firstCard = track?.firstElementChild;
        if (!track || !firstCard) return;
        const step = firstCard.getBoundingClientRect().width + 16;
        setMobileGalleryIndex(Math.min(Math.round(track.scrollLeft / step), Math.max(sliderImages.length - 1, 0)));
    };

    const moveMobileGallery = (direction) => {
        if (!sliderImages.length) return;
        const nextIndex = (mobileGalleryIndex + direction + sliderImages.length) % sliderImages.length;
        setVisibleCount((previous) => Math.max(previous, nextIndex + 1));
        setMobileGalleryIndex(nextIndex);
        window.requestAnimationFrame(() => {
            const track = mobileGalleryRef.current;
            const firstCard = track?.firstElementChild;
            if (!track || !firstCard) return;
            const step = firstCard.getBoundingClientRect().width + 16;
            track.scrollTo({ left: nextIndex * step, behavior: 'smooth' });
        });
    };

    // Carousel logic removed for modern gallery grid style

    // Manage body scroll lock
    useEffect(() => {
        if (lightboxImage || lightboxType) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup on unmount to ensure scroll is restored
        return () => {
            document.body.style.overflow = '';
        };
    }, [lightboxImage, lightboxType]);

    useEffect(() => {
        if (lightboxImage && lightboxImages.length > 1) {
            preloadLightboxWindow(lightboxImages, lightboxImage);
        }
    }, [lightboxImage, lightboxImages]);

    const openLightbox = (imageSrc, type = '', imagesArray = galleryImages) => {
        if (imageSrc && Array.isArray(imagesArray)) {
            preloadLightboxWindow(imagesArray, imageSrc);
        }
        setLightboxImage(imageSrc);
        setLightboxType(type);
        setLightboxImages(imagesArray);
    };

    const closeLightbox = () => {
        setLightboxImage(null);
        setLightboxType('');
        setLightboxImages([]);
        lightboxPreloadCacheRef.current.clear();
    };

    const nextLightboxImage = (e) => {
        e.stopPropagation();
        if (!lightboxImages || lightboxImages.length === 0) return;
        const currentIndexInImages = lightboxImages.findIndex((img) => img === lightboxImage);
        if (currentIndexInImages !== -1) {
            const nextIndex = (currentIndexInImages + 1) % lightboxImages.length;
            setLightboxImage(lightboxImages[nextIndex]);
        }
    };

    const prevLightboxImage = (e) => {
        e.stopPropagation();
        if (!lightboxImages || lightboxImages.length === 0) return;
        const currentIndexInImages = lightboxImages.findIndex((img) => img === lightboxImage);
        if (currentIndexInImages !== -1) {
            const prevIndex = (currentIndexInImages - 1 + lightboxImages.length) % lightboxImages.length;
            setLightboxImage(lightboxImages[prevIndex]);
        }
    };

    if (!property) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
                    <p className="text-slate-500 mb-6">The property you're looking for doesn't exist.</p>
                    <Link href="/properties" className="inline-block bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-all">
                        Browse All Properties
                    </Link>
                </div>
            </div>
        );
    }

    const heroImageSrc = curatedImages.bg || curatedImages.home;
    const introImageSrc = curatedImages.secondary || curatedImages.home;
    const introGalleryImages = [
        introImageSrc,
        curatedImages.home,
        curatedImages.bg,
        ...sliderImages,
    ].filter((image, index, images) => image && images.indexOf(image) === index);
    const activeIntroImage = introGalleryImages[currentIndex % Math.max(introGalleryImages.length, 1)] || introImageSrc;
    const moveIntroGallery = (direction) => {
        setCurrentIndex((previous) => (
            previous + direction + introGalleryImages.length
        ) % introGalleryImages.length);
    };
    const descriptionPreview = createRichTextExcerpt(property.description, 2000, true);
    const introDescription = descriptionPreview.text
        .replace(/\p{Extended_Pictographic}/gu, '')
        .replace(/\uFE0F/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const videoUrl = `${property.video_url || ''}`.trim();
    const bathroomSummary = getBathroomSummary(property);
    const { fullBathCount, halfBathCount } = normalizeBathroomCounts(property);

    return (
        <div className="font-sans text-gray-800 bg-slate-50">
            {/* Hero Section */}
            <section
                className="site-hero site-hero--lg relative w-full overflow-hidden bg-cover bg-center bg-no-repeat"
                ref={heroRef}
                style={{ backgroundImage: `url(${heroImageSrc})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>

                <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-start px-4 pb-10 text-center text-white sm:px-6 sm:pb-12 md:justify-center"
                    style={{ paddingTop: 'var(--site-header-height)' }}
                >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent sm:mb-4 sm:text-sm sm:tracking-[0.3em]">Luxury Retreat</p>
                    <h1 className="mb-3 max-w-4xl text-4xl font-bold leading-none drop-shadow-lg sm:text-5xl sm:leading-tight md:mb-4 md:text-7xl">{property.name}</h1>

                    <div className="mb-5 flex items-center gap-2 sm:mb-6">
                        <FaMapMarkerAlt className="text-accent" />
                        <span className="text-lg font-light tracking-wide sm:text-xl">{property.location}</span>
                    </div>

                    {/* Property Stats */}
                    <div className="mb-6 flex max-w-3xl flex-wrap justify-center gap-3 text-white/90 sm:mb-8 sm:gap-4 md:gap-6">
                        {property.bedroom_count > 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBed className="text-accent" />
                                <span>{property.bedroom_count} {property.bedroom_count === 1 ? 'Bedroom' : 'Bedrooms'}</span>
                            </div>
                        )}
                        {property.bed_count > 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBed className="text-accent" />
                                <span>{property.bed_count} {property.bed_count === 1 ? 'Bed' : 'Beds'}</span>
                            </div>
                        )}
                        {bathroomSummary && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBath className="text-accent" />
                                <span>{bathroomSummary}</span>
                            </div>
                        )}
                        {property.guests_max && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaUsers className="text-accent" />
                                <span>Up to {property.guests_max} Guests</span>
                            </div>
                        )}
                    </div>

                    <div className="flex w-full max-w-[18rem] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
                        <Link
                            href={`/book/${slug}`}
                            className="inline-block bg-accent px-6 py-4 text-base font-bold uppercase tracking-[0.18em] text-white shadow-2xl transition-all hover:bg-accent/90 hover:shadow-accent/30 sm:px-10 sm:text-lg sm:tracking-wider"
                        >
                            Book Your Stay
                        </Link>
                        <Link
                            href={`/${slug}/gallery`}
                            className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition-all backdrop-blur-sm hover:bg-white/20 sm:px-10 sm:text-lg"
                        >
                            <FaPlay size={12} /> View Gallery
                        </Link>
                        {videoUrl && (
                            <a
                                href={videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition-all backdrop-blur-sm hover:bg-white/20 sm:px-10 sm:text-lg"
                            >
                                <FaPlay size={12} /> Watch Video
                            </a>
                        )}
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-bounce md:block">
                    <FaChevronDown className="text-white/60 text-2xl" />
                </div>
            </section>

            {/* Property Introduction */}
            <section className="relative overflow-hidden bg-[#f7f8f6] py-16 md:py-24">
                <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-accent/[0.035] blur-3xl"></div>
                <div className="relative mx-auto grid max-w-[1380px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 xl:px-12">
                    <div className="order-2 min-w-0 space-y-7 lg:order-1 md:space-y-9">
                        <div>
                            <div className="mb-5 flex items-center gap-3">
                                <span className="h-px w-10 bg-accent"></span>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent sm:text-sm">About this property</p>
                            </div>
                            <h2 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.025em] text-slate-950 sm:text-5xl lg:text-[3.4rem]">Welcome to {property.name}</h2>
                            {property.location && (
                                <p className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-500 sm:text-base">
                                    <FaMapMarkerAlt className="text-accent" aria-hidden="true" />
                                    {property.location}
                                </p>
                            )}
                        </div>
                        <div>
                            <p className="overflow-hidden text-base font-light leading-8 text-slate-600 line-clamp-6 sm:text-lg sm:leading-9">
                                {introDescription}
                            </p>
                            {(descriptionPreview.text.length > 300 || descriptionPreview.isTruncated) && (
                                <button
                                    type="button"
                                    onClick={() => openLightbox(null, 'description')}
                                    className="group mt-5 inline-flex items-center gap-2 border-b border-accent/40 pb-1 text-sm font-semibold text-accent transition-colors hover:border-accent hover:text-accent/80"
                                >
                                    Read the full story <FaArrowRight size={11} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-accent/30 bg-accent/10 shadow-[0_12px_35px_rgba(96,189,104,0.1)] backdrop-blur-sm sm:grid-cols-5">
                            <div className="px-3 py-5 text-center sm:border-r sm:border-accent/20">
                                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                  {property.bedroom_count || '-'}
                                </p>
                                <p className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[10px]">Bedrooms</p>
                            </div>
                            <div className="border-l border-accent/20 px-3 py-5 text-center sm:border-l-0 sm:border-r">
                                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                  {property.bed_count || '-'}
                                </p>
                                <p className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[10px]">Beds</p>
                            </div>
                            <div className="border-t border-accent/20 px-3 py-5 text-center sm:border-r sm:border-t-0">
                                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{fullBathCount || '-'}</p>
                                <p className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[10px]">Full baths</p>
                            </div>
                            <div className="border-l border-t border-accent/20 px-3 py-5 text-center sm:border-l-0 sm:border-r sm:border-t-0">
                                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{halfBathCount || '-'}</p>
                                <p className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[10px]">Half baths</p>
                            </div>
                            <div className="col-span-2 border-t border-accent/20 px-3 py-5 text-center sm:col-span-1 sm:border-t-0">
                                <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{property.guests_max || '-'}</p>
                                <p className="mt-1 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-accent sm:text-[10px]">Guests</p>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 w-full min-w-0 lg:order-2">
                        <div className="rounded-[2rem] border border-white/80 bg-white/70 p-2.5 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:p-3">
                            <div className="group relative overflow-hidden rounded-[1.45rem] bg-slate-200">
                                <button
                                    type="button"
                                    onClick={() => openLightbox(activeIntroImage, '', introGalleryImages)}
                                    className="block w-full"
                                    aria-label={`Open photo ${currentIndex + 1} of ${introGalleryImages.length} in full screen`}
                                >
                                    <img
                                        src={activeIntroImage}
                                        alt={`${property.name} photo ${currentIndex + 1} — luxury vacation rental in ${property.location || 'Smoky Mountains'}`}
                                        decoding="async"
                                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                                    />
                                </button>
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10"></div>

                                <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/65 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md">
                                    {currentIndex + 1} / {introGalleryImages.length}
                                </span>

                                {introGalleryImages.length > 1 && (
                                    <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full border border-white/15 bg-slate-950/70 p-1.5 shadow-lg backdrop-blur-md">
                                        <button
                                            type="button"
                                            onClick={() => moveIntroGallery(-1)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                            aria-label="Previous property photo"
                                        >
                                            <FaArrowLeft size={13} aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => moveIntroGallery(1)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                            aria-label="Next property photo"
                                        >
                                            <FaArrowRight size={13} aria-hidden="true" />
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => openLightbox(activeIntroImage, '', introGalleryImages)}
                                    className="absolute bottom-4 right-4 rounded-full border border-white/50 bg-white/90 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg backdrop-blur-md transition-all hover:bg-white hover:shadow-xl sm:text-sm"
                                >
                                    View all {introGalleryImages.length} photos
                                </button>
                            </div>

                            {introGalleryImages.length > 1 && (
                                <div className="mt-2.5 grid grid-cols-4 gap-2 sm:gap-2.5" aria-label="Property photo thumbnails">
                                    {introGalleryImages.slice(0, 4).map((image, index) => {
                                        const activeIndex = currentIndex % introGalleryImages.length;
                                        const isActive = activeIndex === index || (index === 3 && activeIndex > 3);
                                        const remaining = introGalleryImages.length - 4;
                                        return (
                                            <button
                                                type="button"
                                                key={image}
                                                onClick={() => setCurrentIndex(index)}
                                                className={`relative aspect-[4/3] overflow-hidden rounded-xl border transition-all duration-300 ${isActive ? 'border-slate-950 opacity-100 ring-2 ring-slate-950/10' : 'border-slate-200/80 opacity-65 hover:opacity-100'}`}
                                                aria-label={`Show property photo ${index + 1}`}
                                                aria-current={isActive ? 'true' : undefined}
                                            >
                                                <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                {index === 3 && remaining > 0 && (
                                                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
                                                        +{remaining}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Photo Gallery - Modern Grid Layout (Commented Out)
            <section id="gallery" className="py-16 md:py-24 bg-white">
                <div className="text-center mb-10 md:mb-16 px-6">
                    <p className="text-accent uppercase tracking-[0.15em] md:tracking-[0.2em] text-xs md:text-sm font-semibold mb-2 md:mb-3">Visual Tour</p>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-3 md:mb-4">Property Gallery</h2>
                    <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto font-light">Take a closer look at your future escape</p>
                </div>

                <div className="max-w-7xl mx-auto px-6">
                    {-- Modern Grid (Desktop/Tablet) --}
                    <div className="hidden md:flex gap-4 h-[350px] lg:h-[420px] rounded-[2rem] overflow-hidden shadow-2xl">
                        {-- Main Image (Left, 50%) --}
                        <div 
                            className="w-1/2 relative group cursor-pointer overflow-hidden"
                            onClick={() => openLightbox(sliderImages[0])}
                        >
                            {sliderImages[0] && (
                                <img src={sliderImages[0]} alt={`${property.name} main photo — luxury ${property.location || 'vacation rental'}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            )}
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        {-- 4 Grid Images (Right, 50%) --}
                        {sliderImages.length >= 5 ? (
                            <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                                {sliderImages.slice(1, 4).map((imgSrc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="relative group cursor-pointer overflow-hidden"
                                        onClick={() => openLightbox(imgSrc)}
                                    >
                                        <img src={imgSrc} alt={`${property.name} — photo ${idx + 2} of luxury cabin in ${property.location || 'Smoky Mountains'}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                ))}
                                
                                {-- 5th Image with View All Overlay --}
                                <div 
                                    className="relative group cursor-pointer overflow-hidden"
                                    onClick={() => openLightbox(sliderImages[4])}
                                >
                                    <img src={sliderImages[4]} alt={`${property.name} — photo 5 of luxury cabin in ${property.location || 'Smoky Mountains'}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 transition-colors duration-300 group-hover:bg-black/50 flex flex-col items-center justify-center">
                                        <span className="text-white text-3xl font-bold mb-1">+{sliderImages.length - 5 > 0 ? sliderImages.length - 5 : ''}</span>
                                        <span className="text-white/90 text-sm font-semibold uppercase tracking-widest">View All Photos</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-1/2 flex flex-col gap-4">
                                {sliderImages.slice(1).map((imgSrc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="flex-1 relative group cursor-pointer overflow-hidden"
                                        onClick={() => openLightbox(imgSrc)}
                                    >
                                        <img src={imgSrc} alt={`${property.name} — photo ${idx + 2} of luxury rental in ${property.location || 'Smoky Mountains'}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {-- Mobile swipe gallery with attached controls --}
                    <div className="md:hidden">
                        <div
                            ref={mobileGalleryRef}
                            onScroll={updateMobileGalleryIndex}
                            className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {sliderImages.slice(0, visibleCount).map((imgSrc, i) => (
                                <div
                                    key={i}
                                    className="relative h-[60vw] w-[85vw] flex-shrink-0 snap-center cursor-pointer overflow-hidden rounded-2xl shadow-lg"
                                    onClick={() => openLightbox(imgSrc)}
                                >
                                    <img src={imgSrc} alt={`${property.name} gallery photo ${i + 1} — luxury vacation rental in ${property.location || 'Smoky Mountains'}`} loading="lazy" className="h-full w-full object-cover" />
                                </div>
                            ))}
                        </div>
                        <CarouselNavigation
                            current={mobileGalleryIndex + 1}
                            total={sliderImages.length}
                            onPrevious={() => moveMobileGallery(-1)}
                            onNext={() => moveMobileGallery(1)}
                            label="gallery photos"
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 text-center md:hidden">
                        <button
                            onClick={() => openLightbox(sliderImages[0])}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg text-sm uppercase tracking-widest"
                        >
                            View All Photos
                        </button>
                    </div>
                </div>
            </section>
            */}

            {/* Amenities Section */}
            <section className="py-24 bg-slate-50 relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">What We Offer</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Premium Amenities</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">Everything you need for an unforgettable stay</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {amenities.slice(0, 12).map((amenity) => (
                            <div
                                key={amenity.id}
                                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-slate-100 hover:bg-accent hover:border-accent transition-all duration-300 cursor-pointer"
                            >
                                <div className="text-4xl text-accent group-hover:text-white transition-colors duration-300">
                                    {getAmenityIcon(amenity.title, amenity.icon_key)}
                                </div>
                                <h4 className="text-sm font-semibold text-slate-700 group-hover:text-white text-center transition-colors duration-300">{amenity.title}</h4>
                            </div>
                        ))}
                    </div>

                    {amenities.length > 12 && (
                        <div className="text-center mt-12">
                            <button
                                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                                onClick={(e) => { e.preventDefault(); openLightbox(null, 'amenities'); }}
                            >
                                View All {amenities.length} Amenities
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Interactive Availability Calendar */}
            {property.hospitable_property_id && (
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Plan Your Stay</p>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 border-b-2 border-accent/20 pb-4 inline-block mx-auto">Availability Calendar</h2>
                        </div>
                        <AvailabilityCalendar propertyId={property.hospitable_property_id} maxGuests={property.guests_max || 12} />
                    </div>
                </section>
            )}

            {/* Know Before You Book — Trust Signals */}
            <section className="py-8 md:py-10 bg-white border-y border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
                        <Link
                            href="/cancellation-policy"
                            className="flex items-center gap-2.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
                            aria-label="Full refund 14 or more days before check-in; 50% refund 7 to 13 days before check-in. View cancellation policy."
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                            <span>Full refund 14+ days <span aria-hidden="true">·</span> 50% refund 7–13 days</span>
                        </Link>
                        <div className="flex items-center gap-2.5 text-sm text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent flex-shrink-0"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                            <span>No service fees</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" /></svg>
                            <span>Instant confirmation</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent flex-shrink-0"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" /></svg>
                            <span>Personal concierge</span>
                        </div>
                    </div>
                </div>
            </section>


            {/* Custom Review & Activity Sections */}
            <InlineReviews reviews={initialReviews} />
            <InlineActivities activities={initialActivities} slug={slug} />

            {/* Inquire / Contact Section */}
            <section className="py-20 bg-slate-50 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Still have questions?</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 border-accent/20 pb-4 inline-block mx-auto mb-4">Inquire About {property.name}</h2>
                    </div>
                    <ContactForm />
                </div>
            </section>

            {/* Hospitable Direct Widget (for Google Vacation Rentals listing) */}
            {property.booking_url && (
                <HospitableWidget bookingUrl={property.booking_url} />
            )}

            {/* Location & Area Guide — SEO content section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    {(() => {
                        const locationText = (property.location || '').toLowerCase();
                        const isSmokies = locationText.includes('sevierville') || locationText.includes('smoky') || locationText.includes('tennessee');
                        const isLake = locationText.includes('norman') || locationText.includes('wylie') || locationText.includes('mooresville') || locationText.includes('charlotte') || locationText.includes('north carolina');

                        const locationHeading = isSmokies 
                            ? "Gatlinburg, Sevierville & Pigeon Forge" 
                            : isLake 
                                ? "Lake Norman & Charlotte Area" 
                                : property.location || 'This Destination';

                        // Take 3 images for the area collage
                        const areaImages = isSmokies 
                            ? [
                                '/assets/gatlinburg.png',
                                '/assets/sevierville.png',
                                '/assets/pigeon_forge.png'
                              ]
                            : galleryImages.length >= 6 
                                ? [galleryImages[3], galleryImages[4], galleryImages[5]] 
                                : galleryImages.length >= 3 
                                    ? [galleryImages[0], galleryImages[1], galleryImages[2]]
                                    : [
                                        curatedImages.home || '/assets/exterior.avif',
                                        curatedImages.secondary || '/assets/exterior.avif',
                                        curatedImages.bg || '/assets/exterior.avif'
                                      ];

                        return (
                            <>
                                <div className="text-center mb-16">
                                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Explore the Area</p>
                                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">About {locationHeading}</h2>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                                    <div className="space-y-6 text-lg text-slate-600 font-light leading-relaxed">
                                        {isSmokies ? (
                                            <>
                                                <p>
                                                    <strong>{property.name}</strong> is a luxury vacation rental perfectly situated in the heart of the Smoky Mountains. Enjoy the peaceful seclusion of Sevierville and Walland, while remaining just minutes away from the vibrant attractions, dining, and entertainment of Gatlinburg and Pigeon Forge.
                                                </p>
                                                <p>
                                                    Whether you're seeking a romantic cabin getaway, a spacious mountain lodge for a family reunion, or a luxury retreat with a private indoor pool and hot tub, our Gatlinburg and Pigeon Forge area cabins deliver an unforgettable experience. Explore the Great Smoky Mountains National Park by day, and return to your private luxury sanctuary by night.
                                                </p>
                                                <p>
                                                    Book direct with Nirvana Luxe and enjoy the best rates on luxury Smoky Mountain cabin rentals — no service fees, personal concierge support, and curated local recommendations to make your Tennessee vacation truly extraordinary.
                                                </p>
                                            </>
                                        ) : isLake ? (
                                            <>
                                                <p>
                                                    <strong>{property.name}</strong> is a premium lakefront vacation rental located in the Charlotte metro area, home to gorgeous waters like Lake Norman and Lake Wylie. Offering hundreds of miles of shoreline, pristine waters for boating and paddleboarding, and a thriving waterfront dining scene.
                                                </p>
                                                <p>
                                                    Perfect for couples seeking a romantic lakefront getaway or families looking for a luxury lake house with private dock access, our vacation rentals combine natural beauty with upscale amenities. Enjoy sunset cruises, championship golf at nearby courses, or explore the charming surrounding lake towns.
                                                </p>
                                                <p>
                                                    Book direct with Nirvana Luxe for the best rate guaranteed on luxury Lake Norman and Lake Wylie rentals — complete with personal concierge service and curated local guides.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p>
                                                    <strong>{property.name}</strong> is a premium luxury vacation rental in {property.location}, hand-selected by Nirvana Luxe for its exceptional quality, prime location, and unforgettable guest experiences.
                                                </p>
                                                <p>
                                                    Book direct with Nirvana Luxe and enjoy the best rates — no service fees, personal concierge support, and curated local recommendations.
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Interactive 3-Image Collage */}
                                    <div className="relative h-[400px] sm:h-[500px] w-full hidden lg:block">
                                        {/* Main Large Image */}
                                        <div 
                                            className="absolute top-0 left-0 w-2/3 h-[75%] rounded-3xl overflow-hidden shadow-2xl z-10 hover:z-40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] group cursor-pointer"
                                            onClick={() => openLightbox(areaImages[0], '', areaImages)}
                                        >
                                            <img src={areaImages[0]} alt={`Area view 1 near ${locationHeading}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </div>
                                        
                                        {/* Top Right Floating Image */}
                                        <div 
                                            className="absolute top-6 right-0 w-[45%] h-[45%] rounded-3xl overflow-hidden shadow-xl z-20 hover:z-40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] group cursor-pointer border-[6px] border-white"
                                            onClick={() => openLightbox(areaImages[1], '', areaImages)}
                                        >
                                            <img src={areaImages[1]} alt={`Area view 2 near ${locationHeading}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </div>

                                        {/* Bottom Right Overlapping Image */}
                                        <div 
                                            className="absolute bottom-4 right-10 w-[55%] h-[45%] rounded-3xl overflow-hidden shadow-2xl z-30 hover:z-40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)] group cursor-pointer border-[6px] border-white"
                                            onClick={() => openLightbox(areaImages[2], '', areaImages)}
                                        >
                                            <img src={areaImages[2]} alt={`Area view 3 near ${locationHeading}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Fallback: Grid of 3 images */}
                                    <div className="grid grid-cols-2 gap-4 lg:hidden mt-8">
                                        <div 
                                            className="col-span-2 h-48 rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                                            onClick={() => openLightbox(areaImages[0], '', areaImages)}
                                        >
                                            <img src={areaImages[0]} alt={`Area view 1 near ${locationHeading}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div 
                                            className="col-span-1 h-32 rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                                            onClick={() => openLightbox(areaImages[1], '', areaImages)}
                                        >
                                            <img src={areaImages[1]} alt={`Area view 2 near ${locationHeading}`} className="w-full h-full object-cover" />
                                        </div>
                                        <div 
                                            className="col-span-1 h-32 rounded-2xl overflow-hidden shadow-md group cursor-pointer"
                                            onClick={() => openLightbox(areaImages[2], '', areaImages)}
                                        >
                                            <img src={areaImages[2]} alt={`Area view 3 near ${locationHeading}`} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </section>

            {/* Related Properties — internal linking for SEO */}
            {allProperties.length > 1 && (
                <section className="py-16 md:py-20 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-12">
                            <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Explore More</p>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">You Might Also Like</h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-light">Discover other handpicked luxury vacation rentals from the Nirvana Luxe collection</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allProperties
                                .filter((p) => p.slug !== slug)
                                .slice(0, 3)
                                .map((p) => (
                                    <Link
                                        key={p.slug}
                                        href={`/${p.slug}`}
                                        className="group block rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                    >
                                        {(p.primary_image || p.image) && (
                                            <div className="aspect-[4/3] overflow-hidden">
                                                <img
                                                    src={p.primary_image || p.image}
                                                    alt={`${p.name || p.title} — luxury vacation rental in ${p.location || 'Smoky Mountains'}`}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                            </div>
                                        )}
                                        <div className="p-5">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-accent transition-colors mb-1">{p.name || p.title}</h3>
                                            {p.location && <p className="text-sm text-slate-500 flex items-center gap-1"><FaMapMarkerAlt className="text-accent text-xs" /> {p.location}</p>}
                                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                                                {p.bedroom_count > 0 && <span className="flex items-center gap-1"><FaBed className="text-accent" /> {p.bedroom_count} BR</span>}
                                                {p.guests_max > 0 && <span className="flex items-center gap-1"><FaUsers className="text-accent" /> {p.guests_max} guests</span>}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                        </div>
                        <div className="text-center mt-10">
                            <Link
                                href="/properties"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg text-sm uppercase tracking-widest"
                            >
                                View All Properties
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="site-viewport-section relative overflow-hidden bg-slate-900">
                <div className="absolute inset-0 opacity-30">
                    <img src={heroImageSrc} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-semibold mb-4">Ready to Experience Luxury?</p>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Book {property.name} Today</h2>
                    <p className="text-xl text-slate-300 mb-10 font-light max-w-2xl mx-auto">
                        Create unforgettable memories with your loved ones in this stunning {property.location} retreat.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={`/book/${slug}`}
                            className="inline-block px-12 py-5 bg-accent hover:bg-accent/90 text-white text-lg font-bold uppercase tracking-wider transition-all shadow-2xl"
                        >
                            Book Now
                        </Link>
                        <Link
                            href="/properties"
                            className="inline-block px-12 py-5 bg-transparent border-2 border-white/30 hover:border-white hover:bg-white/10 text-white text-lg font-semibold transition-all"
                        >
                            View Other Properties
                        </Link>
                    </div>
                </div>
            </section>

            {/* Lightbox */}
                  {(lightboxImage || lightboxType) && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8" onClick={closeLightbox}>
                    {/* Local close buttons are used instead inside the components */}

                    <div className="relative max-w-6xl w-full max-h-[95vh] flex justify-center" onClick={(e) => e.stopPropagation()}>
                        {lightboxType === 'description' ? (
                            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col relative overflow-hidden shadow-2xl">
                                <div className="flex justify-end p-4 md:p-6 z-10 bg-white">
                                    <button className="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-200 p-3 rounded-full transition-all" onClick={closeLightbox}>
                                        <FaTimes size={20} />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 mb-6 mr-2 md:mr-4" style={{ scrollbarWidth: 'thin' }}>
                                    <div className="pl-6 md:pl-12 pr-4 md:pr-8 pb-4">
                                        <div className="text-center mb-8 mt-[-20px]">
                                            <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-2">About This Property</p>
                                            <h3 className="text-4xl font-bold text-slate-900">{property.name}</h3>
                                        </div>
                                        <RichTextContent
                                            value={property.description}
                                            className="text-slate-700 leading-relaxed text-base md:text-lg [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-accent/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-accent [&_a]:underline"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : lightboxType === 'amenities' ? (
                            <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[85vh] flex flex-col relative overflow-hidden shadow-2xl">
                                <div className="flex justify-end p-4 md:p-6 z-10 bg-white">
                                    <button className="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-200 p-3 rounded-full transition-all" onClick={closeLightbox}>
                                        <FaTimes size={20} />
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1 mb-6 mr-2 md:mr-4" style={{ scrollbarWidth: 'thin' }}>
                                    <div className="pl-6 md:pl-12 pr-4 md:pr-8 pb-4">
                                        <div className="text-center mb-10 mt-[-20px]">
                                            <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-2">Complete List</p>
                                            <h3 className="text-4xl font-bold text-slate-900">All Amenities</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {amenities.map((amenity) => (
                                                <div key={amenity.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-accent/5 transition-colors">
                                                    <div className="text-2xl text-accent mt-0.5">
                                                        {getAmenityIcon(amenity.title, amenity.icon_key)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900">{amenity.title}</h4>
                                                        {amenity.description && <p className="text-sm text-slate-500 mt-1">{amenity.description}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : lightboxImage ? (
                            <div className="relative flex items-center justify-center w-full h-[85vh]">
                                <div className="relative flex items-center justify-center max-w-full max-h-full">
                                    <button
                                        className="absolute -top-4 -right-4 md:-top-6 md:-right-6 text-white hover:text-accent bg-black/80 hover:bg-black p-3 md:p-4 rounded-full transition-all z-[110] shadow-xl border border-white/10"
                                        onClick={closeLightbox}
                                        aria-label="Close photo viewer"
                                    >
                                        <FaTimes size={20} />
                                    </button>
                                    
                                    {lightboxImages && lightboxImages.length > 1 && (
                                        <button
                                            className="absolute left-4 md:-left-8 text-white hover:text-accent bg-black/60 hover:bg-black/90 backdrop-blur-md transition-all p-3 md:p-4 rounded-full z-[110] shadow-xl"
                                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={prevLightboxImage}
                                            aria-label="Previous photo"
                                        >
                                            <FaArrowLeft size={20} />
                                        </button>
                                    )}

                                    <img
                                        src={lightboxImage}
                                        alt="Property Image"
                                        fetchPriority="high"
                                        decoding="async"
                                        className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                                    />

                                    {lightboxImages && lightboxImages.length > 1 && (
                                        <button
                                            className="absolute right-4 md:-right-8 text-white hover:text-accent bg-black/60 hover:bg-black/90 backdrop-blur-md transition-all p-3 md:p-4 rounded-full z-[110] shadow-xl"
                                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                                            onClick={nextLightboxImage}
                                            aria-label="Next photo"
                                        >
                                            <FaArrowRight size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}  </div>
    );
};

export default PropertyPage;
