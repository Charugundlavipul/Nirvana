'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  FaChevronLeft,
  FaChevronRight,
  FaStar,
  FaAirbnb,
  FaBed,
  FaBath,
  FaUsers,
  FaMapMarkerAlt,
  FaQuoteLeft,
  FaSearch,
  FaCalendarAlt,
  FaPlus,
  FaMinus,
  FaCheck,
  FaShieldAlt,
  FaPercent,
  FaHeadset,
  FaWater,
  FaTv,
  FaGamepad,
  FaMountain,
  FaUserGroup,
  FaCompass,
  FaCar,
  FaTree,
  FaUtensils,
  FaHotel,
  FaConciergeBell,
} from 'react-icons/fa';
import StructuredData from '../StructuredData';
import CustomDatePicker from '../common/CustomDatePicker';
import CarouselNavigation from '../common/CarouselNavigation';
import { getCompactBathroomSummary } from '../../lib/bathrooms';
import { absoluteUrl } from '../../lib/siteConfig';

// Badges for property cards
const BADGES = ['Most Popular', 'Featured', 'New'];

const getPropertyCardImages = (property) => {
  const primary = property.primary_image || property.image || '';
  const seen = new Set();

  return [primary, ...(property.highlightImages || [])]
    .filter(Boolean)
    .filter((img) => {
      if (seen.has(img)) return false;
      seen.add(img);
      return true;
    })
    .slice(0, 5);
};

const LocationLandingPage = ({
  locationKey = 'tn', // 'tn' or 'nc'
  initialProperties = [],
  initialReviews = [],
}) => {
  const router = useRouter();

  // Search & Filter State
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [isSearchingAvailability, setIsSearchingAvailability] = useState(false);
  const [availablePropertyIds, setAvailablePropertyIds] = useState(null);
  
  // Multi-select amenity filters array
  const [selectedAmenities, setSelectedAmenities] = useState(['all']);

  // Carousel & Cards State
  const [imageIndices, setImageIndices] = useState({});
  const [cardImagesBySlug, setCardImagesBySlug] = useState({});

  // Review Carousel State
  const [reviewIndex, setReviewIndex] = useState(0);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Configuration based on locationKey
  const isTN = locationKey === 'tn';

  const pageData = useMemo(() => {
    if (isTN) {
      return {
        stateName: 'Tennessee',
        stateCode: 'TN',
        pathname: '/tennessee-vacation-rentals',
        heroImage: '/images/smoky_mountains.png',
        heroTitle: 'Luxury Tennessee Vacation Rentals in the Smoky Mountains',
        heroSubtitle:
          'Experience the ultimate mountain getaway with Nirvana Luxe. Discover luxury cabin rentals in Sevierville, Gatlinburg, and Pigeon Forge featuring private indoor pools, hot tubs, home theaters, expansive game rooms, and breathtaking Smoky Mountain views — perfect for family reunions, group trips, and romantic escapes.',
        whyTitle: 'Why Choose Our Tennessee Vacation Rentals?',
        whyIntro:
          'Our Smoky Mountain luxury cabin rentals combine unmatched mountain tranquility with high-end resort amenities. Whether you want a private heated indoor pool, a private cinema, or lodging for up to 26 guests, book direct for our lowest price guarantee.',
        whyPoints: [
          {
            icon: '🏔️',
            title: 'Prime Smoky Mountain Locations',
            desc: 'Nestled in peaceful Sevierville and Walland, our cabins offer serene mountain privacy while keeping you just minutes from Gatlinburg, Pigeon Forge, and Dollywood.',
          },
          {
            icon: '🏊',
            title: 'Private Heated Pools & Spas',
            desc: 'Enjoy year-round swimming in private indoor climate-controlled pools, relax in outdoor hot tubs overlooking mountain valleys, and unwind in luxury sauna facilities.',
          },
          {
            icon: '🎬',
            title: 'World-Class Group Entertainment',
            desc: 'Equipped with custom theater rooms, arcade games, pool tables, fire pits, and expansive multi-level decks for unforgettable group memories.',
          },
        ],
        amenityFilters: [
          { key: 'all', label: 'All Properties' },
          { key: 'pool', label: 'Indoor Pool' },
          { key: 'hottub', label: 'Hot Tub' },
          { key: 'theatre', label: 'Theatre Room' },
          { key: 'game', label: 'Game Room' },
          { key: 'mountain', label: 'Mountain Views' },
          { key: 'large_group', label: 'Large Group (14+)' },
        ],
        areaGuideTitle: 'Sevierville, Pigeon Forge & Gatlinburg Area Guide',
        areaGuideDesc: 'Immerse yourself in the best of the Great Smoky Mountains:',
        areaGuideItems: [
          {
            icon: <FaTree className="text-accent text-2xl" />,
            title: 'Great Smoky Mountains National Park',
            desc: 'Explore over 800 miles of scenic hiking trails, Cades Cove wildlife loops, and breathtaking summit vistas just a short drive away.',
          },
          {
            icon: <FaHotel className="text-accent text-2xl" />,
            title: 'Pigeon Forge & Dollywood',
            desc: 'Experience world-famous entertainment at Dollywood, dinner theaters, mountain coasters, and vibrant shopping along the Parkway.',
          },
          {
            icon: <FaCompass className="text-accent text-2xl" />,
            title: 'Downtown Gatlinburg & Anakeesta',
            desc: 'Ride the Skylift, stroll downtown art galleries, sample craft moonshine, and explore canopy walks high above the treetops.',
          },
          {
            icon: <FaUtensils className="text-accent text-2xl" />,
            title: 'Sevierville Dining & Distilleries',
            desc: 'Savor hearth-cooked Southern cuisine at The Appalachian or sample local moonshine and craft spirits in historic downtown Sevierville.',
          },
        ],
        faqs: [
          {
            question: 'Where are your luxury vacation rentals in Tennessee located?',
            answer:
              'Our luxury Tennessee vacation rentals are located in Sevierville and Walland, TN. They sit in serene, elevated mountain settings that offer privacy and panoramic views, while remaining just 15 to 25 minutes from Gatlinburg, Pigeon Forge, and Great Smoky Mountains National Park.',
          },
          {
            question: 'Which Tennessee vacation rentals have private indoor pools?',
            answer:
              'Select luxury properties in our Tennessee collection feature private heated indoor pools inside the home. Enjoy year-round swimming regardless of the weather outside without sharing with other guests.',
          },
          {
            question: 'Do you offer large-group vacation rentals in Tennessee?',
            answer:
              'Yes! Our Tennessee cabins are specifically designed for large groups. Cabins like Halftime Hideaway and Nirvana can accommodate 14 to 26+ guests with spacious open floor plans, multiple king suites, custom bunk rooms, and large dining spaces.',
          },
          {
            question: 'How close are the cabins to Pigeon Forge and Gatlinburg?',
            answer:
              'Our homes are ideally located approximately 15–20 minutes from the heart of Pigeon Forge and 25 minutes from downtown Gatlinburg, giving you convenient access to attractions like Dollywood, Anakeesta, and the National Park entrance.',
          },
          {
            question: 'Which rentals have mountain views?',
            answer:
              'Multiple properties across our Tennessee cabin collection offer uninhibited panoramic Smoky Mountain vistas from multi-tier outdoor decks, floor-to-ceiling living room windows, and private hot tubs.',
          },
          {
            question: 'Do the homes include hot tubs and game rooms?',
            answer:
              'Yes! All of our Tennessee luxury cabins feature private outdoor hot tubs and dedicated game rooms with pool tables, arcade machines, board games, and smart TVs.',
          },
          {
            question: 'What is the best time to visit the Smoky Mountains?',
            answer:
              'The Smoky Mountains offer year-round appeal. Summer brings lush greenery and river tubing, autumn delivers famous fall foliage (October–November), winter features cozy snowcapped mountain views and Dollywood lights, while spring offers wildflowers and mild temperatures.',
          },
          {
            question: 'Is booking directly cheaper than booking through an OTA?',
            answer:
              'Yes, booking directly through Nirvana Luxe saves you 10% to 15% in third-party platform service fees (such as Airbnb or Vrbo), and guarantees the best available rate.',
          },
          {
            question: 'How many guests can the largest Tennessee rental accommodate?',
            answer:
              'Our largest Tennessee vacation homes can comfortably accommodate up to 26 guests with custom bunk rooms, multiple bathrooms, and multi-vehicle parking.',
          },
          {
            question: 'Are the cabins suitable for family reunions?',
            answer:
              'Extremely suitable! Our cabins feature large open-concept kitchens, double refrigerators, expansive dining tables, home theater spaces, and separate entertainment levels that accommodate multi-generational family reunions with ease.',
          },
        ],
        comparisonCols: ['Property', 'Bedrooms', 'Guests', 'Indoor Pool', 'Hot Tub', 'Theatre Room', 'Game Lounge', 'Location'],
        guides: [
          {
            title: 'Nirvana Retreat Activities & Attractions',
            slug: '/activities/nirvana',
            desc: 'Guide to nearby hiking trails, dining, and family entertainment near Nirvana cabin in Sevierville.',
            image: '/nirvanapics/exterior.avif',
          },
          {
            title: 'Halftime Hideaway Group Guide',
            slug: '/activities/halftime',
            desc: 'Top large-group activities and scenic spots around Halftime Hideaway in the Smoky Mountains.',
            image: '/data/Halftime Hideaway/6.jpg',
          },
          {
            title: 'Smoky Mountains Travel Journal',
            slug: '/blog',
            desc: 'Expert tips on visiting Gatlinburg, Pigeon Forge, and Sevierville for families and groups.',
            image: '/images/smoky_mountains.png',
          },
        ],
      };
    }

    return {
      stateName: 'North Carolina',
      stateCode: 'NC',
      pathname: '/north-carolina-vacation-rentals',
      heroImage: '/images/lake_norman.png',
      heroTitle: 'Luxury North Carolina Vacation Rentals on Lake Norman & Lake Wylie',
      heroSubtitle:
        'Discover premier lakefront vacation rentals near Charlotte, NC. Featuring private boat docks, infinity-edge lake views, outdoor kitchens, hot tubs, and resort-style interiors on Lake Norman and Lake Wylie — perfect for summer escapes, family reunions, and executive retreats.',
      whyTitle: 'Why Choose Our North Carolina Vacation Rentals?',
      whyIntro:
        'Our North Carolina lakefront homes combine serene waterfront living with proximity to Charlotte’s best dining and culture. Enjoy private deep-water docks, paddleboarding, swimming, and luxury indoor-outdoor entertaining.',
      whyPoints: [
        {
          icon: '⛵',
          title: 'Direct Lake Access & Docks',
          desc: 'Step straight from your back patio onto your private boat dock on Lake Norman or Lake Wylie. Bring your boat, rent watercraft, or launch kayaks at sunrise.',
        },
        {
          icon: '🌅',
          title: 'Resort Waterfront Design',
          desc: 'Relax in hot tubs with panoramic lake views, gather around stone fire pits, and cook in outdoor kitchens built for sunset dining.',
        },
        {
          icon: '🏙️',
          title: 'Minutes from Charlotte & Mooresville',
          desc: 'Enjoy tranquil lakefront privacy while staying just 30 minutes from downtown Charlotte, NASCAR racing, and upscale shopping at Birkdale Village.',
        },
      ],
      amenityFilters: [
        { key: 'all', label: 'All Properties' },
        { key: 'waterfront', label: 'Waterfront / Lake View' },
        { key: 'dock', label: 'Private Boat Dock' },
        { key: 'hottub', label: 'Hot Tub' },
        { key: 'game', label: 'Game Room / Lounge' },
        { key: 'large_group', label: 'Large Group (12+)' },
      ],
      areaGuideTitle: 'Lake Norman, Lake Wylie & Charlotte Area Guide',
      areaGuideDesc: 'Discover top waterfront activities and regional highlights:',
      areaGuideItems: [
        {
          icon: <FaWater className="text-accent text-2xl" />,
          title: 'Lake Norman State Park',
          desc: 'Enjoy 30+ miles of mountain bike trails, sandy swimming beaches, boat ramps, and scenic paddling bays.',
        },
        {
          icon: <FaCar className="text-accent text-2xl" />,
          title: 'Birkdale Village & Mooresville',
          desc: 'Stroll outdoor boutique shopping avenues, craft breweries, water-view dining, and NASCAR team headquarters.',
        },
        {
          icon: <FaCompass className="text-accent text-2xl" />,
          title: 'Fishing & Boating Charters',
          desc: 'Lake Norman is a nationally renowned bass fishery offering guided pontoon charters, jet ski rentals, and sailing.',
        },
        {
          icon: <FaUtensils className="text-accent text-2xl" />,
          title: 'Lakeside Dining & Charlotte Nightlife',
          desc: 'Dock your boat directly at lakeside restaurants or take a quick drive into Uptown Charlotte for fine dining and sports.',
        },
      ],
      faqs: [
        {
          question: 'Where are your luxury vacation rentals in North Carolina located?',
          answer:
            'Our North Carolina luxury vacation rentals are situated directly on the shorelines of Lake Norman (Mooresville, NC) and Lake Wylie, just 25 to 35 minutes north and west of Uptown Charlotte.',
        },
        {
          question: 'Which North Carolina vacation rentals have private docks and lake views?',
          answer:
            'Our featured waterfront homes, including Shoreside Oasis and Chalet Du Lac, offer private deep-water docks, watercraft tie-ups, and unobstructed lake views from almost every room.',
        },
        {
          question: 'Do you offer large-group vacation rentals in Lake Norman and Lake Wylie?',
          answer:
            'Yes, our North Carolina properties feature multiple bedroom suites, expansive outdoor decks, and large living spaces designed to host groups of 10 to 16+ guests comfortably.',
        },
        {
          question: 'How close are the lakefront rentals to Charlotte, NC?',
          answer:
            'Our homes are convenient to Charlotte Douglas International Airport (CLT) and Uptown Charlotte, typically requiring a quick 25 to 35-minute drive.',
        },
        {
          question: 'Which rentals have outdoor entertainment spaces and hot tubs?',
          answer:
            'Our Lake Norman and Lake Wylie homes feature custom outdoor living areas complete with hot tubs, covered patios, gas fire pits, and outdoor dining tables looking out over the water.',
        },
        {
          question: 'Do the homes include water access, kayaks, or boat dock slips?',
          answer:
            'Yes! Direct water access is provided right from your private backyard dock, perfect for swimming, paddleboarding, fishing, and tying up rental boats.',
        },
        {
          question: 'What is the best time to visit Lake Norman and Lake Wylie?',
          answer:
            'Late spring through early autumn (May through October) offers ideal warm weather for boating and water sports, while fall brings peaceful lake views and pleasant weather.',
        },
        {
          question: 'Is booking directly cheaper than booking through an OTA?',
          answer:
            'Absolutely. Booking directly through Nirvana Luxe guarantees you save 10% to 15% on booking platform fees charged by Airbnb and Vrbo.',
        },
        {
          question: 'How many guests can the largest North Carolina rental accommodate?',
          answer:
            'Our largest North Carolina waterfront property can comfortably accommodate up to 16 guests with multiple king beds and custom bunking setups.',
        },
        {
          question: 'Are the lakefront homes suitable for family reunions and corporate retreats?',
          answer:
            'Yes! The open floor plans, multiple bathrooms, private waterfront spaces, and high-speed Wi-Fi make them ideal for both family gatherings and executive off-site retreats.',
        },
      ],
      comparisonCols: ['Property', 'Bedrooms', 'Guests', 'Waterfront Dock', 'Hot Tub', 'Theatre Room', 'Game Lounge', 'Location'],
      guides: [
        {
          title: 'Shoreside Oasis Lake Guide',
          slug: '/activities/shoreside',
          desc: 'Complete guide to boat rentals, fishing spots, and restaurants near Shoreside Oasis on Lake Norman.',
          image: '/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp',
        },
        {
          title: 'Lake Norman Getaway Journal',
          slug: '/blog',
          desc: 'Tips for planning the ultimate waterfront weekend near Charlotte, North Carolina.',
          image: '/images/lake_norman.png',
        },
      ],
    };
  }, [isTN]);

  // Filter properties by state location
  const stateProperties = useMemo(() => {
    return initialProperties.filter((p) => {
      const loc = (p.location || '').toLowerCase();
      const slug = (p.slug || '').toLowerCase();

      if (isTN) {
        return (
          loc.includes('tn') ||
          loc.includes('tennessee') ||
          loc.includes('sevierville') ||
          loc.includes('gatlinburg') ||
          loc.includes('pigeon forge') ||
          slug === 'nirvana' ||
          slug === 'halftime' ||
          slug === 'grand-prix-getaway' ||
          slug === 'grand-sumeru' ||
          slug === 'cabin-at-the-summit' ||
          slug === 'evergreen-escape'
        );
      } else {
        return (
          loc.includes('nc') ||
          loc.includes('north carolina') ||
          loc.includes('lake norman') ||
          loc.includes('mooresville') ||
          loc.includes('wylie') ||
          slug === 'shoreside' ||
          slug === 'chalet-du-lac-lakefront-retreat'
        );
      }
    });
  }, [initialProperties, isTN]);

  // Toggle multi-select amenity pills
  const handleAmenityToggle = (key) => {
    if (key === 'all') {
      setSelectedAmenities(['all']);
      return;
    }

    setSelectedAmenities((prev) => {
      const withoutAll = prev.filter((k) => k !== 'all');
      if (withoutAll.includes(key)) {
        const next = withoutAll.filter((k) => k !== key);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, key];
      }
    });
  };

  const isSelectedAll = selectedAmenities.includes('all') || selectedAmenities.length === 0;

  // Apply amenity & guest filters & live availability
  const filteredProperties = useMemo(() => {
    return stateProperties.filter((p) => {
      const propId = p.id || p.bookingPropertyId || p.slug;
      
      // If live availability search was performed, filter by available property IDs
      if (availablePropertyIds !== null && Array.isArray(availablePropertyIds)) {
        if (!availablePropertyIds.includes(propId) && !availablePropertyIds.includes(p.slug)) {
          return false;
        }
      }

      if (guestCount > 1 && (p.guests_max || 0) < guestCount) {
        return false;
      }

      if (isSelectedAll) return true;

      const desc = (p.description || '').toLowerCase();
      const descNoPoolTable = desc.replace(/pool table/gi, '');
      const slug = (p.slug || '').toLowerCase();
      const name = (p.name || p.title || '').toLowerCase();

      return selectedAmenities.every((amenityKey) => {
        if (amenityKey === 'pool') {
          return (
            slug === 'nirvana' ||
            slug === 'halftime' ||
            descNoPoolTable.includes('indoor pool') ||
            descNoPoolTable.includes('swimming pool') ||
            descNoPoolTable.includes('heated pool')
          );
        }
        if (amenityKey === 'hottub') {
          return p.hot_tub || desc.includes('hot tub') || desc.includes('spa');
        }
        if (amenityKey === 'theatre') {
          return (
            slug === 'nirvana' ||
            slug === 'halftime' ||
            desc.includes('theater') ||
            desc.includes('theatre') ||
            desc.includes('cinema') ||
            desc.includes('movie')
          );
        }
        if (amenityKey === 'game') {
          return (
            slug === 'nirvana' ||
            slug === 'halftime' ||
            slug === 'shoreside' ||
            desc.includes('game') ||
            desc.includes('arcade') ||
            desc.includes('pool table')
          );
        }
        if (amenityKey === 'mountain') {
          return desc.includes('mountain') || desc.includes('view') || name.includes('summit');
        }
        if (amenityKey === 'waterfront') {
          return (
            desc.includes('lake') ||
            desc.includes('waterfront') ||
            desc.includes('dock') ||
            slug === 'shoreside' ||
            slug === 'chalet-du-lac-lakefront-retreat'
          );
        }
        if (amenityKey === 'dock') {
          return desc.includes('dock') || desc.includes('boat');
        }
        if (amenityKey === 'large_group') {
          return (p.guests_max || 0) >= (isTN ? 14 : 12);
        }
        return true;
      });
    });
  }, [stateProperties, guestCount, selectedAmenities, isTN, isSelectedAll, availablePropertyIds]);

  // Handle Search Availability button submit
  const handleSearchAvailability = async (e) => {
    if (e) e.preventDefault();

    setIsSearchingAvailability(true);

    try {
      if (checkInDate && checkOutDate) {
        const res = await fetch('/api/properties/availability-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: checkInDate,
            endDate: checkOutDate,
            adults: guestCount,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const availableIds = data
              .filter((item) => item.available !== false)
              .map((item) => item.bookingPropertyId || item.id || item.slug);
            setAvailablePropertyIds(availableIds);
          }
        }
      }
    } catch (err) {
      console.error('Failed to search availability:', err);
    } finally {
      setIsSearchingAvailability(false);
      
      // Smooth scroll to property collection section
      const targetEl = document.getElementById('properties-collection');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Helper to build URL with query params to pass dates & guests to property page
  const getPropUrl = (slug) => {
    const params = new URLSearchParams();
    if (checkInDate) params.append('checkIn', checkInDate);
    if (checkOutDate) params.append('checkOut', checkOutDate);
    if (guestCount > 1) params.append('guests', guestCount.toString());
    const q = params.toString();
    return `/${slug}${q ? `?${q}` : ''}`;
  };

  // Filter reviews by state properties
  const filteredReviews = useMemo(() => {
    const validSlugs = new Set(stateProperties.map((p) => p.slug));
    return initialReviews.filter((r) => validSlugs.has(r.propertySlug) || !r.propertySlug);
  }, [initialReviews, stateProperties]);

  // Initialize property image indices
  useEffect(() => {
    const indices = {};
    const initialCardImages = {};
    stateProperties.forEach((property) => {
      const propId = property.id || property.slug;
      indices[propId] = 0;
      initialCardImages[property.slug] = getPropertyCardImages(property);
    });

    setImageIndices(indices);
    setCardImagesBySlug(initialCardImages);
  }, [stateProperties]);

  const moveCardImage = (property, direction) => {
    const propId = property.id || property.slug;
    const images = cardImagesBySlug[property.slug] || [property.primary_image || property.image];
    if (images.length <= 1) return;

    setImageIndices((prev) => {
      const current = prev[propId] || 0;
      const nextIndex =
        direction === 'next'
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length;
      return { ...prev, [propId]: nextIndex };
    });
  };

  const handleCardNext = (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    moveCardImage(property, 'next');
  };

  const handleCardPrev = (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    moveCardImage(property, 'prev');
  };

  const nextReview = () => {
    if (!filteredReviews.length) return;
    setReviewIndex((prev) => (prev + 1) % filteredReviews.length);
  };

  const prevReview = () => {
    if (!filteredReviews.length) return;
    setReviewIndex((prev) => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  };

  // Structured Data
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageData.heroTitle,
    description: pageData.heroSubtitle,
    url: absoluteUrl(pageData.pathname),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: stateProperties.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: p.name || p.title,
        url: absoluteUrl(`/${p.slug}`),
      })),
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pageData.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <div className="w-full bg-slate-50 text-gray-800 font-sans">
      <StructuredData data={collectionJsonLd} />
      <StructuredData data={faqJsonLd} />

      {/* 1. Hero Section & Intro (Overflow visible so date picker dropdown never clips) */}
      <section className="relative bg-slate-900 text-white min-h-[580px] flex items-center justify-center pt-28 pb-16 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src={pageData.heroImage}
            alt={pageData.heroTitle}
            fill
            priority
            sizes="100vw"
            quality={85}
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-900/60 to-slate-900"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <p className="text-accent uppercase tracking-[0.3em] text-xs sm:text-sm font-bold mb-4">
            LUXURY DIRECT-BOOKING DESTINATION
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6 drop-shadow-md">
            {pageData.heroTitle}
          </h1>
          <p className="text-base sm:text-lg md:text-xl font-light text-slate-200 leading-relaxed max-w-4xl mx-auto mb-8">
            {pageData.heroSubtitle}
          </p>

          {/* 2. Date and Guest Search Bar */}
          <div className="relative z-30 bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-800 max-w-5xl mx-auto border border-white/20">
            <form onSubmit={handleSearchAvailability} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <div className="relative z-50">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 text-left">
                  Check-In
                </label>
                <CustomDatePicker
                  value={checkInDate}
                  onChange={setCheckInDate}
                  placeholder="Select check-in"
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="relative z-50">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 text-left">
                  Check-Out
                </label>
                <CustomDatePicker
                  value={checkOutDate}
                  onChange={setCheckOutDate}
                  placeholder="Select check-out"
                  minDate={checkInDate || new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 text-left">
                  Guests
                </label>
                <div className="flex items-center justify-between bg-slate-100 rounded-xl px-3 py-2 border border-slate-200">
                  <span className="text-sm font-bold text-slate-800">
                    {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGuestCount((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-full bg-white text-slate-700 font-bold border border-slate-300 flex items-center justify-center hover:bg-accent hover:text-white transition-colors cursor-pointer"
                    >
                      <FaMinus size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuestCount((prev) => prev + 1)}
                      className="w-7 h-7 rounded-full bg-white text-slate-700 font-bold border border-slate-300 flex items-center justify-center hover:bg-accent hover:text-white transition-colors cursor-pointer"
                    >
                      <FaPlus size={9} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSearchingAvailability}
                  className="w-full bg-accent hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-accent"
                >
                  {isSearchingAvailability ? (
                    <span>Searching...</span>
                  ) : (
                    <>
                      <FaSearch size={13} /> Search Availability
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 3. Amenity Filters & Property Cards */}
      <section id="properties-collection" className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
            EXPLORE THE COLLECTION
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            {pageData.stateName} Luxury Properties
          </h2>
          <p className="text-slate-500 text-base mt-2">
            Filter by preferred amenities or group size to find your ideal stay (multi-select enabled).
          </p>

          {/* Active Search Date Banner */}
          {(checkInDate || checkOutDate) && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 max-w-3xl mx-auto text-sm shadow-sm">
              <div className="flex items-center gap-2 font-medium">
                <FaCalendarAlt className="text-emerald-600 flex-shrink-0" />
                <span>
                  Searching stay for <strong>{checkInDate || 'Check-in'}</strong> to <strong>{checkOutDate || 'Check-out'}</strong> ({guestCount} {guestCount === 1 ? 'Guest' : 'Guests'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckInDate('');
                  setCheckOutDate('');
                  setAvailablePropertyIds(null);
                }}
                className="text-xs font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Clear Dates
              </button>
            </div>
          )}

          {/* Multi-Select Amenity Filter Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8">
            {pageData.amenityFilters.map((filter) => {
              const isSelected =
                filter.key === 'all'
                  ? isSelectedAll
                  : selectedAmenities.includes(filter.key);

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => handleAmenityToggle(filter.key)}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer ${
                    isSelected
                      ? 'bg-accent text-white shadow-accent/20 shadow-lg scale-105 ring-2 ring-accent/30'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-accent hover:text-accent'
                  }`}
                >
                  {filter.label} {isSelected && filter.key !== 'all' && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Property Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((prop, index) => {
              const propName = prop.name || prop.title || 'Nirvana Luxe Property';
              const propId = prop.id || prop.slug;
              const images = cardImagesBySlug[prop.slug] || [prop.primary_image || prop.image];
              const currentIndex = imageIndices[propId] || 0;
              const safeIndex = images.length ? currentIndex % images.length : 0;
              const targetUrl = getPropUrl(prop.slug);

              return (
                <div
                  key={propId}
                  className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-3 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl text-left flex flex-col"
                  onClick={() => router.push(targetUrl)}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
                    {images.map((img, i) => (
                      <Image
                        key={img}
                        src={img}
                        alt={`${propName} — ${prop.location}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        quality={70}
                        className={`pointer-events-none object-cover transition-opacity duration-500 ${
                          i === safeIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ))}

                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                      {BADGES[index % BADGES.length]}
                    </div>

                    {images.length > 1 && (
                      <div className="absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-between px-3">
                        <button
                          type="button"
                          onClick={(e) => handleCardPrev(e, prop)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-md hover:bg-white"
                        >
                          <FaChevronLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCardNext(e, prop)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-800 shadow-md backdrop-blur-md hover:bg-white"
                        >
                          <FaChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="px-3 pb-3 pt-4 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-accent transition-colors mb-1">
                      {propName}
                    </h3>
                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-1">
                      <FaMapMarkerAlt className="text-accent" /> {prop.location}
                    </p>

                    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                      <span className="flex items-center gap-1">
                        <FaBed className="text-accent" /> {prop.bedroom_count || 0} Beds
                      </span>
                      <span className="flex items-center gap-1">
                        <FaBath className="text-accent" /> {getCompactBathroomSummary(prop)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-accent" /> Up to {prop.guests_max || 0} Guests
                      </span>
                    </div>

                    <div className="mt-auto pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(targetUrl);
                        }}
                        className="w-full rounded-xl bg-accent py-3 text-white text-xs font-bold tracking-widest uppercase transition-all hover:bg-green-700 shadow-md cursor-pointer"
                      >
                        EXPLORE PROPERTY
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-xl mx-auto shadow-sm">
            <p className="text-lg font-bold text-slate-800 mb-2">No matching properties</p>
            <p className="text-slate-500 text-sm mb-6">
              Try selecting another amenity combination or adjusting your dates / guest count.
            </p>
            <button
              onClick={() => {
                setSelectedAmenities(['all']);
                setGuestCount(1);
                setCheckInDate('');
                setCheckOutDate('');
                setAvailablePropertyIds(null);
              }}
              className="px-6 py-2.5 bg-accent text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md hover:bg-accent/90 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* 4. Why Choose Our Vacation Rentals */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-accent uppercase tracking-[0.3em] text-xs font-bold mb-3">
              THE NIRVANA LUXE EXPERIENCE
            </p>
            <h2 className="text-3xl sm:text-5xl font-bold mb-6">{pageData.whyTitle}</h2>
            <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed">
              {pageData.whyIntro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pageData.whyPoints.map((point, idx) => (
              <div
                key={idx}
                className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col"
              >
                <div className="text-4xl mb-6">{point.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{point.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Comparison Table */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
            AT A GLANCE
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            {pageData.stateName} Property Comparison
          </h2>
          <p className="text-slate-500 text-base mt-2">
            Compare key features to choose the perfect home for your group.
          </p>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-xl bg-white">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                {pageData.comparisonCols.map((col, idx) => (
                  <th key={idx} className="p-4 sm:p-5 border-b border-slate-800">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {stateProperties.map((prop) => {
                const propName = prop.name || prop.title || 'Nirvana Luxe Property';
                const propId = prop.id || prop.slug;
                const desc = (prop.description || '').toLowerCase();
                const descNoPoolTable = desc.replace(/pool table/gi, '');
                const slug = (prop.slug || '').toLowerCase();

                // Accurate indoor pool check (avoid matching 'pool table')
                const hasIndoorPool =
                  slug === 'nirvana' ||
                  slug === 'halftime' ||
                  descNoPoolTable.includes('indoor pool') ||
                  descNoPoolTable.includes('private pool') ||
                  descNoPoolTable.includes('swimming pool') ||
                  descNoPoolTable.includes('heated pool');

                const hasHotTub = prop.hot_tub || desc.includes('hot tub') || desc.includes('spa');
                const hasTheatre =
                  slug === 'nirvana' ||
                  slug === 'halftime' ||
                  desc.includes('theater') ||
                  desc.includes('theatre') ||
                  desc.includes('cinema') ||
                  desc.includes('movie');

                const hasGameLounge =
                  slug === 'nirvana' ||
                  slug === 'halftime' ||
                  slug === 'shoreside' ||
                  desc.includes('game') ||
                  desc.includes('arcade') ||
                  desc.includes('pool table') ||
                  desc.includes('lounge');

                const hasDock = desc.includes('dock') || desc.includes('waterfront') || slug === 'shoreside';

                return (
                  <tr key={propId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 sm:p-5 font-bold text-slate-900">{propName}</td>
                    <td className="p-4 sm:p-5">{prop.bedroom_count || '-'} Beds</td>
                    <td className="p-4 sm:p-5">Up to {prop.guests_max || '-'}</td>
                    <td className="p-4 sm:p-5">
                      {isTN ? (
                        hasIndoorPool ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <FaCheck size={12} /> Yes (Indoor)
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )
                      ) : hasDock ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <FaCheck size={12} /> Private Dock
                        </span>
                      ) : (
                        <span className="text-slate-400">Water Access</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5">
                      {hasHotTub ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <FaCheck size={12} /> Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5">
                      {hasTheatre ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <FaCheck size={12} /> Theater Room
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5">
                      {hasGameLounge ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <FaCheck size={12} /> Game Lounge
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-slate-500 font-medium">{prop.location}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Area Guide Section */}
      <section className="py-20 bg-slate-100 px-6 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
              DESTINATION HIGHLIGHTS
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {pageData.areaGuideTitle}
            </h2>
            <p className="text-slate-600 text-base mt-2 font-light">{pageData.areaGuideDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pageData.areaGuideItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 hover:shadow-lg transition-all"
              >
                <div className="mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Who These Homes Suit */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
            TAILORED HOSPITALITY
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Who These Homes Suit</h2>
          <p className="text-slate-500 text-base mt-2">
            Designed to host lifelong memories for every kind of group getaway.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            {
              title: 'Family Reunions',
              desc: 'Dual kitchens, double refrigerators, expansive dining spaces, and separate lounge zones for multi-generational families.',
              icon: '👨‍👩‍👧‍👦',
            },
            {
              title: 'Multi-Gen Trips',
              desc: 'Main-level master suites for grandparents and vibrant lower-level bunk areas and game spaces for kids.',
              icon: '🏡',
            },
            {
              title: 'Friend Groups',
              desc: 'Equally sized king suites, private hot tubs, custom bar setups, pool tables, and cinema rooms for effortless hosting.',
              icon: '🥂',
            },
            {
              title: 'Celebrations',
              desc: 'Milestone birthdays, anniversaries, and holidays in dramatic scenic settings with chef-worthy indoor & outdoor kitchens.',
              icon: '🎉',
            },
            {
              title: 'Corporate Retreats',
              desc: 'High-speed Wi-Fi, multi-zone meeting areas, private en-suite bedrooms, and relaxing evening amenities for team building.',
              icon: '💼',
            },
          ].map((suit, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center hover:border-accent transition-colors flex flex-col items-center"
            >
              <div className="text-3xl mb-4">{suit.icon}</div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{suit.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{suit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Original Guest Reviews */}
      {filteredReviews.length > 0 && (
        <section className="py-20 bg-slate-900 text-white px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-accent uppercase tracking-[0.3em] text-xs font-bold mb-2">
                VERIFIED GUEST FEEDBACK
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold">
                Guest Reviews for {pageData.stateName} Stays
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {filteredReviews.slice(reviewIndex, reviewIndex + 3).map((rev, idx) => (
                <div
                  key={rev.id || idx}
                  className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/15 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} size={14} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        {rev.source || 'Direct'}
                      </span>
                    </div>
                    <p className="text-slate-200 text-sm italic leading-relaxed mb-6">
                      "{rev.text}"
                    </p>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{rev.name || rev.author}</span>
                    <span className="text-xs text-accent font-medium">
                      {rev.propertyName || 'Nirvana Luxe'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredReviews.length > 3 && (
              <div className="flex justify-center gap-4 mt-10">
                <button
                  onClick={prevReview}
                  className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-accent transition-colors"
                >
                  <FaChevronLeft size={16} />
                </button>
                <button
                  onClick={nextReview}
                  className="p-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-accent transition-colors"
                >
                  <FaChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 9. Direct-Booking Advantages */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
            WHY BOOK DIRECT WITH NIRVANA LUXE?
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Direct-Booking Advantages
          </h2>
          <p className="text-slate-500 text-base mt-2">
            Skip middleman service fees and enjoy dedicated personalized support.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <FaPercent />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Save 10% – 15%</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Avoid traveler service commissions added by third-party listing sites like Airbnb and Vrbo.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <FaShieldAlt />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Best Rate Guarantee</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are guaranteed the best available night rates directly from our official management team.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <FaHeadset />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Direct Host Contact</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Communicate directly with your hosts before and during your stay for quick answers and tailored requests.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl mx-auto mb-4">
              <FaConciergeBell />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Personalized Concierge</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Receive curated local recommendations, early check-in options, and customized trip assistance.
            </p>
          </div>
        </div>
      </section>

      {/* 10. Eight to Ten FAQs */}
      <section className="py-20 bg-slate-100 px-6 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {pageData.stateName} Vacation Rental FAQs
            </h2>
          </div>

          <div className="space-y-4">
            {pageData.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-accent transition-colors"
                  >
                    <span>{faq.question}</span>
                    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                      {isOpen ? <FaMinus size={10} /> : <FaPlus size={10} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 font-light leading-relaxed border-t border-slate-100 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Availability and Booking CTA */}
      <section className="relative py-20 px-6 bg-slate-900 text-white text-center overflow-hidden">
        <Image
          src={pageData.heroImage}
          alt={pageData.heroTitle}
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-accent uppercase tracking-[0.3em] text-xs font-bold mb-3">
            START PLANNING YOUR ESCAPE
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-6">
            Ready to Book Your {pageData.stateName} Stay?
          </h2>
          <p className="text-slate-300 text-base sm:text-lg font-light leading-relaxed mb-8">
            Check real-time calendar availability, lock in direct rates, and start creating memories at our luxury {pageData.stateName} vacation rentals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-10 rounded-full text-sm uppercase tracking-widest shadow-xl transition-all hover:scale-105"
            >
              Check Availability & Book Direct
            </Link>
            <Link
              href="/contact"
              className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-900 text-white font-bold py-4 px-10 rounded-full text-sm uppercase tracking-widest transition-all"
            >
              Contact Concierge
            </Link>
          </div>
        </div>
      </section>

      {/* 12. Supporting Travel Guides */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-accent uppercase tracking-[0.25em] text-xs font-bold mb-2">
            EXPLORE THE AREA
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Supporting {pageData.stateName} Travel Guides
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pageData.guides.map((guide, idx) => (
            <Link
              key={idx}
              href={guide.slug}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-md hover:shadow-xl transition-all"
            >
              <div className="relative aspect-[16/9] w-full bg-slate-200">
                <Image
                  src={guide.image}
                  alt={guide.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-accent transition-colors mb-2">
                  {guide.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{guide.desc}</p>
                <span className="text-xs font-bold text-accent group-hover:underline">
                  Read Travel Guide &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LocationLandingPage;
