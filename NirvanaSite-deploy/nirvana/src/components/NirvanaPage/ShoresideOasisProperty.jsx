import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUtensils,
  FaBath,
  FaWifi,
  FaHotTub,
  FaFire,
  FaTshirt,
  FaTv,
  FaBaby,
  FaSnowflake,
  FaShieldAlt,
  FaLaptop,
  FaTree,
  FaCar,
  FaKey,
  FaEye,
  FaMapMarkerAlt,
  FaConciergeBell,
  FaArrowLeft,
  FaArrowRight,
  FaTimes
} from 'react-icons/fa';
import styles from './NirvanaProperty.module.css';
import { fetchPropertyBundleBySlug } from '../../lib/contentApi';

// Use public URLs for images
const intro1 = '/data/ShoresideOasis/116 Mcnaron Ln-5_9_11zon.webp';
const heroImage = '/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp';

// Use an array of public URLs for the slider images
const images = [
  "/data/ShoresideOasis/116 Mcnaron Ln-11_10_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron Ln-14_11_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron Ln-2_8_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron Ln-5_9_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-10_21_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-11_22_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-12_23_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-13_24_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-14_25_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-15_26_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-16_27_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-17_28_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-18_29_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-19_30_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-1_12_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-20_31_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-21_32_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-22_33_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-23_34_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-24_35_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-28_36_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-2_13_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-30_37_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-32_38_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-35_39_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-37_40_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-3_14_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-4_15_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-5_16_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-6_17_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-7_18_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-8_19_11zon.webp",
  "/data/ShoresideOasis/116 Mcnaron-9_20_11zon.webp",
  "/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp",
  "/data/ShoresideOasis/1_1_11zon.webp",
  "/data/ShoresideOasis/2_2_11zon.webp",
  "/data/ShoresideOasis/3_3_11zon.webp",
  "/data/ShoresideOasis/5_4_11zon.webp",
  "/data/ShoresideOasis/6_5_11zon.webp",
  "/data/ShoresideOasis/7_6_11zon.webp",
  "/data/ShoresideOasis/8_7_11zon.webp",
];

const iconMap = {
  'Scenic Views': <FaEye style={{ color: 'black' }} />,
  'Bathroom': <FaBath style={{ color: 'black' }} />,
  'Bedroom and Laundry': <FaTshirt style={{ color: 'black' }} />,
  'Entertainment': <FaTv style={{ color: 'black' }} />,
  'Family Features': <FaBaby style={{ color: 'black' }} />,
  'Heating and Cooling': <FaSnowflake style={{ color: 'black' }} />,
  'Home Safety': <FaShieldAlt style={{ color: 'black' }} />,
  'Internet and Office': <FaWifi style={{ color: 'black' }} />,
  'Kitchen and Dining': <FaUtensils style={{ color: 'black' }} />,
  'Location Features': <FaMapMarkerAlt style={{ color: 'black' }} />,
  'Outdoor': <FaTree style={{ color: 'black' }} />,
  'Parking and Facilities': <FaCar style={{ color: 'black' }} />,
  'Services': <FaConciergeBell style={{ color: 'black' }} />,
  'Self Check-In': <FaKey style={{ color: 'black' }} />
};

const ShoresideOasisProperty = () => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxType, setLightboxType] = useState('');
  const heroRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState(images);
  const [bookingPath, setBookingPath] = useState('/book');
  const [amenities, setAmenities] = useState([]);
  const [curatedImages, setCuratedImages] = useState({
    home: heroImage,
    bg: heroImage,
    secondary: intro1,
  });

  const sliderImages = galleryImages.length ? galleryImages : images;
  const amenitiesList = amenities;
  const heroImageSrc = curatedImages.bg || heroImage;
  const introImageSrc = curatedImages.secondary || curatedImages.home || intro1;

  const openLightbox = (imageSrc, content = '', type = '') => {
    setLightboxImage(imageSrc);
    setLightboxType(type);
    document.body.classList.add(styles.bodyScrollLock);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxType('');
    document.body.classList.remove(styles.bodyScrollLock);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const offset = window.pageYOffset;
        heroRef.current.style.backgroundPositionY = `calc(50% + ${offset / 2}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const data = await fetchPropertyBundleBySlug('shoreside');
        if (!data) return;
        setGalleryImages(data.galleryImages || []);
        setAmenities(data.amenities || []);
        if (data.property?.id) {
          setBookingPath(`/book/${data.property.id}`);
        }
        setCuratedImages({
          home: data.curated?.home || heroImage,
          bg: data.curated?.bg || heroImage,
          secondary: data.curated?.secondary || intro1,
        });
      } catch (error) {
        console.error('Error loading Shoreside property data:', error);
      }
    };
    loadProperty();
  }, []);

  const getVisibleImages = () => {
    const visible = [];
    const len = sliderImages.length;
    if (!len) return [];
    for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
      const idx = ((i % len) + len) % len;
      visible.push(sliderImages[idx]);
    }
    return visible;
  };

  const isMobile = window.innerWidth <= 768;
  const visibleImages = isMobile ? sliderImages : getVisibleImages();

  const scrollLeft = () => {
    if (!sliderImages.length) return;
    setCurrentIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
  };

  const scrollRight = () => {
    if (!sliderImages.length) return;
    setCurrentIndex((prev) => (prev + 1) % sliderImages.length);
  };

  const nextLightboxImage = () => {
    const currentIndexInImages = sliderImages.findIndex((img) => img === lightboxImage);
    if (currentIndexInImages !== -1) {
      const nextIndex = (currentIndexInImages + 1) % sliderImages.length;
      setLightboxImage(sliderImages[nextIndex]);
    }
  };

  const prevLightboxImage = () => {
    const currentIndexInImages = sliderImages.findIndex((img) => img === lightboxImage);
    if (currentIndexInImages !== -1) {
      const prevIndex = (currentIndexInImages - 1 + sliderImages.length) % sliderImages.length;
      setLightboxImage(sliderImages[prevIndex]);
    }
  };

  return (
    <div className={styles.cabinsPage}>
      <div className={styles.mainContent}>
        {/* Hero Section with Parallax */}
        <section 
          className={styles.heroNirvana} 
          id="hero" 
          ref={heroRef}
          style={{ 
            backgroundImage: `url(${heroImageSrc})`,
          }}
        >
          <div className={styles.overlayProperty}></div>
          <div className={styles.heroNirvanaContent}>
            <h1>Shoreside Oasis</h1>
            <span className={styles.heroNirvanaSub}>Mooresville (Lake Norman), NC</span>
            <p>Wake up to the sound of waves and enjoy direct beach access</p>
            <Link className={styles.ctaButton} to={bookingPath}>Book Now</Link>
          </div>
        </section>

        {/* Property Introduction Section */}
        <section className={styles.propertyIntro}>
          <div className={styles.introItem} style={{ justifyContent: "center", textAlign: "center" }}>
            <div className={styles.introText}>
              <h2>Welcome to Shoreside Oasis</h2>
              <p>
                Discover a peaceful retreat where the ocean meets luxury. Our property offers a unique blend of modern amenities and stunning beach surroundings that help you unwind and reconnect.
              </p>
            </div>
            <div className={styles.introImage}>
              <img src={introImageSrc} alt="Property Exterior" onClick={() => openLightbox(introImageSrc)} loading="lazy" />
            </div>
          </div>
        </section>

        {/* Amenities Preview Section */}
        <section className={styles.amenitiesPreviewSection}>
          <h2 style={{ color: '#184e17' }}>Amenities</h2>
          <div className={styles.amenitiesPreviewGrid}>
            {amenitiesList.slice(0, 13).map((amenity) => (
              <div key={amenity.id} className={styles.amenityPreview}>
                <div className={styles.amenityIcon}>
                  {iconMap[amenity.title] ? iconMap[amenity.title] : <FaUtensils style={{ color: 'black' }} />}
                </div>
                <h4>{amenity.title}</h4>
              </div>
            ))}
          </div>
          {amenitiesList.length > 0 && (
            <a
              href="#"
              className={styles.moreBtn}
              onClick={(e) => {
                e.preventDefault();
                openLightbox(null, 'Amenities for Shoreside Oasis', 'amenities');
              }}
            >
              Learn More
            </a>
          )}
        </section>

        {/* Cabins Listing Section */}
        <section className={styles.cabinsSection} id="cabins">
          <div className={styles.cabinsGrid}>
            <div className={`${styles.cabinCard} ${styles.reviewsCard}`}>
              <div className={styles.cabinContent}>
                <div>
                  <h3>Curious about what guests say?</h3>
                  <p>Discover heartfelt experiences from those who stayed with us.</p>
                </div>
                <Link to="/review/property2" className={styles.ctaButton}>
                  Hear Their Stories
                </Link>
              </div>
            </div>
            <div className={`${styles.cabinCard} ${styles.reviewsCard}`}>
              <div className={styles.cabinContent}>
                <div>
                  <h3>Nearby Activities</h3>
                  <p>Explore fun activities in the vicinity of your stay</p>
                </div>
                <Link to="/activities-Shore" className={styles.ctaButton}>
                  Explore Activities
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO SLIDER SECTION (Centered Carousel with Blank Sides) */}
        <section className={styles["photoSlider"]}>
          <h2>Unveiling Shoreside Oasis</h2>
          <div className={styles["centeredSliderContainer"]}>
            <button className={`${styles["arrowBtn"]} ${styles["arrowLeft"]}`} onClick={scrollLeft}>
              <FaArrowLeft />
            </button>
            <div className={styles["centeredSlider"]}>
              {visibleImages.map((imgSrc, i) => {
                if (!imgSrc) {
                  return <div key={i} className={`${styles["sliderItem"]} ${styles.blank}`} />;
                }
                const isCenter = i === 2;
                return (
                  <div
                    key={i}
                    className={`${styles["sliderItem"]} ${isCenter ? styles["centerItem"] : styles["sideItem"]}`}
                  >
                    <img
                      src={imgSrc}
                      alt={`Photo ${i + 1}`}
                      onClick={() => openLightbox(imgSrc)}
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
            <button className={`${styles["arrowBtn"]} ${styles["arrowRight"]}`} onClick={scrollRight}>
              <FaArrowRight />
            </button>
          </div>
        </section>
        {/* Lightbox for Image or Content Viewing */}
        {(lightboxImage || lightboxType) && (
          <div className={styles.lightbox} onClick={closeLightbox}>
            <button className={styles.xCloseButton} onClick={closeLightbox}>
              <FaTimes />
            </button>
            <div className={`${styles.lightboxContent} ${lightboxType === 'amenities' ? styles.lightboxContentAmenities : ''} ${lightboxType === 'faq' ? styles.lightboxContentFaq : ''}`} onClick={(e) => e.stopPropagation()}>
              {lightboxType === 'amenities' ? (
                <div>
                  <h3>Amenities</h3>
                  <div className={styles.amenitiesGrid}>
                    {amenitiesList.map((amenity) => (
                      <div key={amenity.id} className={styles.amenity}>
                        <div className={styles.amenityIcon}>
                          {iconMap[amenity.title] ? iconMap[amenity.title] : <FaUtensils style={{ color: 'black' }} />}
                        </div>
                        <h4>{amenity.title}</h4>
                        <p>{amenity.description}</p>
                      </div>
                    ))}
                  </div>
                  <button className={styles.closeBtn} onClick={closeLightbox}>Close</button>
                </div>
              ) : (
                <div className={styles.lightboxContentImg}>
                  <button className={`${styles.lightboxImgBtn} ${styles.left}`} onClick={prevLightboxImage}>
                    <FaArrowLeft />
                  </button>
                  <div className={styles.lightboxImgContainer}>
                    <img 
                      src={lightboxImage} 
                      alt="Expanded View" 
                      className={styles.lightboxImg} 
                      style={{ width: '1200px', height: '500px', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                  <button className={`${styles.lightboxImgBtn} ${styles.right}`} onClick={nextLightboxImage}>
                    <FaArrowRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoresideOasisProperty;
