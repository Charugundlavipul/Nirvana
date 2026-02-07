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
  FaTimes,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';
import styles from './NirvanaProperty.module.css';
import { fetchPropertyBundleBySlug } from '../../lib/contentApi';

// Remove all image imports
// import intro1 from './nirvanapics/intro1.avif';
// import intro2 from './nirvanapics/intro2.avif';
// import heroImage from './nirvanapics/exterior.avif';

// Use public URLs for images
const intro1 = '/nirvanapics/intro1.avif';
const intro2 = '/nirvanapics/intro2.avif';
const heroImage = '/nirvanapics/exterior.avif';

// Use an array of public URLs for the slider images
const images = [
  "/data/Nirvana/01-5073-Settlers-View-Ln-Sevierville-TN-1.webp",
  "/data/Nirvana/02-5073-Settlers-View-Ln-Sevierville-TN-2.webp",
  "/data/Nirvana/03-5073-Settlers-View-Ln-Sevierville-TN-3.webp",
  "/data/Nirvana/04-5073-Settlers-View-Ln-Sevierville-TN-4.webp",
  "/data/Nirvana/05-5073-Settlers-View-Ln-Sevierville-TN-5.webp",
  "/data/Nirvana/06-5073-Settlers-View-Ln-Sevierville-TN-6.webp",
  "/data/Nirvana/07-5073-Settlers-View-Ln-Sevierville-TN-7.webp",
  "/data/Nirvana/08-5073-Settlers-View-Ln-Sevierville-TN-8.webp",
  "/data/Nirvana/09-5073-Settlers-View-Ln-Sevierville-TN-9.webp",
  "/data/Nirvana/0V5A9386.webp",
  "/data/Nirvana/0V5A9390,.webp",
  "/data/Nirvana/0V5A9395.webp",
  "/data/Nirvana/0V5A9395copy2.webp",
  "/data/Nirvana/0V5A9409.webp",
  "/data/Nirvana/0V5A941201.webp",
  "/data/Nirvana/0V5A9418.webp",
  "/data/Nirvana/0V5A9430.webp",
  "/data/Nirvana/0V5A9443.webp",
  "/data/Nirvana/0V5A944701.webp",
  "/data/Nirvana/0V5A9453.webp",
  "/data/Nirvana/0V5A9455.webp",
  "/data/Nirvana/0V5A9462,.webp",
  "/data/Nirvana/0V5A9465.webp",
  "/data/Nirvana/0V5A9475.webp",
  "/data/Nirvana/0V5A9488.webp",
  "/data/Nirvana/0V5A9493.webp",
  "/data/Nirvana/0V5A9509.webp",
  "/data/Nirvana/0V5A9518.webp",
  "/data/Nirvana/0V5A9523copy2.webp",
  "/data/Nirvana/0V5A9530.webp",
  "/data/Nirvana/0V5A9535.webp",
  "/data/Nirvana/0V5A9536.webp",
  "/data/Nirvana/0V5A9556.webp",
  "/data/Nirvana/0V5A9611copy.webp",
  "/data/Nirvana/0V5A9617.webp",
  "/data/Nirvana/0V5A9621copy.webp",
  "/data/Nirvana/0V5A9623copy.webp",
  "/data/Nirvana/10-5073-Settlers-View-Ln-Sevierville-TN-10.webp",
  "/data/Nirvana/11-5073-Settlers-View-Ln-Sevierville-TN-11.webp",
  "/data/Nirvana/12-5073-Settlers-View-Ln-Sevierville-TN-12.webp",
  "/data/Nirvana/13-5073-Settlers-View-Ln-Sevierville-TN-13.webp",
  "/data/Nirvana/14-5073-Settlers-View-Ln-Sevierville-TN-14.webp",
  "/data/Nirvana/15-5073-Settlers-View-Ln-Sevierville-TN-15.webp",
  "/data/Nirvana/16-5073-Settlers-View-Ln-Sevierville-TN-16.webp",
  "/data/Nirvana/17-5073-Settlers-View-Ln-Sevierville-TN-17.webp",
  "/data/Nirvana/18-5073-Settlers-View-Ln-Sevierville-TN-18.webp",
  "/data/Nirvana/19-5073-Settlers-View-Ln-Sevierville-TN-0.webp",
  "/data/Nirvana/21-5073-Settlers-View-Ln-Sevierville-TN-21.webp",
  "/data/Nirvana/22-5073-Settlers-View-Ln-Sevierville-TN-22.webp",
  "/data/Nirvana/23-5073-Settlers-View-Ln-Sevierville-TN-23.webp",
  "/data/Nirvana/24-5073-Settlers-View-Ln-Sevierville-TN-24.webp",
  "/data/Nirvana/25-5073-Settlers-View-Ln-Sevierville-TN-25.webp",
  "/data/Nirvana/26-5073-Settlers-View-Ln-Sevierville-TN-26.webp",
  "/data/Nirvana/27-5073-Settlers-View-Ln-Sevierville-TN-27.webp",
  "/data/Nirvana/28-5073-Settlers-View-Ln-Sevierville-TN-28.webp",
  "/data/Nirvana/30-5073-Settlers-View-Ln-Sevierville-TN-30.webp",
  "/data/Nirvana/31-5073-Settlers-View-Ln-Sevierville-TN-31.webp",
  "/data/Nirvana/34-5073-Settlers-View-Ln-Sevierville-TN-35.webp",
  "/data/Nirvana/35-5073-Settlers-View-Ln-Sevierville-TN-36.webp",
  "/data/Nirvana/36-5073-Settlers-View-Ln-Sevierville-TN-37.webp",
  "/data/Nirvana/37-5073-Settlers-View-Ln-Sevierville-TN-38.webp",
  "/data/Nirvana/38-5073-Settlers-View-Ln-Sevierville-TN-39.webp",
  "/data/Nirvana/39-5073-Settlers-View-Ln-Sevierville-TN-40.webp",
  "/data/Nirvana/40-5073-Settlers-View-Ln-Sevierville-TN-41.webp",
  "/data/Nirvana/41-5073-Settlers-View-Ln-Sevierville-TN-42.webp",
  "/data/Nirvana/42-5073-Settlers-View-Ln-Sevierville-TN-43.webp",
  "/data/Nirvana/43-5073-Settlers-View-Ln-Sevierville-TN-44.webp",
  "/data/Nirvana/44-5073-Settlers-View-Ln-Sevierville-TN-45.webp",
  "/data/Nirvana/45-5073-Settlers-View-Ln-Sevierville-TN-46.webp",
  "/data/Nirvana/46-5073-Settlers-View-Ln-Sevierville-TN-47.webp",
  "/data/Nirvana/47-5073-Settlers-View-Ln-Sevierville-TN-48.webp",
  "/data/Nirvana/48-5073-Settlers-View-Ln-Sevierville-TN-49.webp",
  "/data/Nirvana/49-5073-Settlers-View-Ln-Sevierville-TN-50.webp",
  "/data/Nirvana/50-5073-Settlers-View-Ln-Sevierville-TN-51.webp",
  "/data/Nirvana/51-5073-Settlers-View-Ln-Sevierville-TN-52.webp",
  "/data/Nirvana/52-5073-Settlers-View-Ln-Sevierville-TN-53.webp",
  "/data/Nirvana/56-5073-Settlers-View-Ln-Sevierville-TN-57.webp",
  "/data/Nirvana/DJI_0555.webp",
  "/data/Nirvana/DJI_0555copy.webp",
  "/data/Nirvana/DJI_0557.webp",
  "/data/Nirvana/DJI_0557copy.webp",
  "/data/Nirvana/DJI_0564.webp",
  "/data/Nirvana/DJI_0565.webp",
  "/data/Nirvana/DJI_0573.webp",
  "/data/Nirvana/DJI_0576.webp",
  "/data/Nirvana/DJI_0578.webp",
  "/data/Nirvana/DJI_0584.webp",
  "/data/Nirvana/DJI_0598.webp",
  "/data/Nirvana/DJI_0600.webp",
  "/data/Nirvana/DJI_0604.webp",
  "/data/Nirvana/DJI_0605.webp",
  "/data/Nirvana/DJI_0606.webp",
  "/data/Nirvana/DJI_0608.webp",
  "/data/Nirvana/DJI_0609.webp",
  "/data/Nirvana/DJI_0612.webp",
  "/data/Nirvana/DJI_0614.webp",
  "/data/Nirvana/DJI_0616.webp",
  "/data/Nirvana/DJI_0617.webp",
  "/data/Nirvana/DJI_0618.webp",
  "/data/Nirvana/DJI_0619.webp",
  "/data/Nirvana/DJI_0620.webp",
  "/data/Nirvana/DJI_0621.webp",
  "/data/Nirvana/DJI_0622.webp",
  "/data/Nirvana/DJI_0631.webp",
  "/data/Nirvana/DJI_0634.webp",
  "/data/Nirvana/DJI_0635.webp",
];

// Map amenity titles to react-icons (using FaUtensils for Kitchen as an example)
const iconMap = {
  'Kitchen': <FaUtensils style={{ color: 'black' }} />,
  'Laundry': <FaTshirt style={{ color: 'black' }} />,
  'Bath Amenities': <FaBath style={{ color: 'black' }} />,
  'High-Speed Wifi': <FaWifi style={{ color: 'black' }} />,
  'Hot Tub': <FaHotTub style={{ color: 'black' }} />,
  'Fire Pit': <FaFire style={{ color: 'black' }} />,
  'Entertainment': <FaTv style={{ color: 'black' }} />,
  'Family Friendly': <FaBaby style={{ color: 'black' }} />,
  'Heating and Cooling': <FaSnowflake style={{ color: 'black' }} />,
  'Home Safety': <FaShieldAlt style={{ color: 'black' }} />,
  'Workspace': <FaLaptop style={{ color: 'black' }} />,
  'Outdoor': <FaTree style={{ color: 'black' }} />,
  'Parking & Facilities': <FaCar style={{ color: 'black' }} />,
  'Self Check-In': <FaKey style={{ color: 'black' }} />
};

const NirvanaProperty = () => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxType, setLightboxType] = useState(''); // 'amenities', 'faq', or image-only
  const heroRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderRef = useRef(null);
  const [galleryImages, setGalleryImages] = useState(images);
  const [amenities, setAmenities] = useState([]);
  const [bookingPath, setBookingPath] = useState('/book');
  const [curatedImages, setCuratedImages] = useState({
    home: intro1,
    bg: heroImage,
    secondary: intro2,
  });

  const sliderImages = galleryImages.length ? galleryImages : images;
  const amenitiesList = amenities;
  const heroImageSrc = curatedImages.bg || heroImage;
  const introImageSrc = curatedImages.secondary || curatedImages.home || intro1;

  // Open lightbox with image and content type
  const openLightbox = (imageSrc, content = '', type = '') => {
    setLightboxImage(imageSrc);
    setLightboxType(type);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxType('');
  };

  // Parallax effect: update background position based on scroll offset
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
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadProperty = async () => {
      try {
        const data = await fetchPropertyBundleBySlug('nirvana');
        if (!data) return;
        setGalleryImages(data.galleryImages || []);
        setAmenities(data.amenities || []);
        if (data.property?.id) {
          setBookingPath(`/book/${data.property.id}`);
        }
        setCuratedImages({
          home: data.curated?.home || intro1,
          bg: data.curated?.bg || heroImage,
          secondary: data.curated?.secondary || intro2,
        });
      } catch (error) {
        console.error('Error loading Nirvana property data:', error);
      }
    };
    loadProperty();
  }, []);

  // PHOTO SLIDER SECTION (Centered Carousel with Blank Sides)
  // Helper function: returns up to 5 images around the currentIndex.
  // Now loops infinitely using modulo arithmetic.
  const getVisibleImages = () => {
    const visible = [];
    const len = sliderImages.length;
    if (!len) return [];
    for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
      // Use modulo for looping
      const idx = ((i % len) + len) % len;
      visible.push(sliderImages[idx]);
    }
    return visible;
  };

  const isMobile = window.innerWidth <= 768;
  const visibleImages = isMobile ? sliderImages : getVisibleImages();

  // Move the "center" index left or right, looping infinitely.
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
      {/* Integrated Navbar */}
      {/* <Navbar /> */}

      <div className={styles.mainContent}>
        {/* Hero Section with Parallax */}
        <section 
          className={styles.heroNirvana} 
          id="hero" 
          ref={heroRef}
          style={{ 
            backgroundImage: `url(${heroImageSrc})`,
            backgroundAttachment: 'fixed'
          }}
        >
          <div className={styles.overlayProperty}></div>
          <div className={styles.heroNirvanaContent}>
            <h1>
              Nirvana
              <span className={styles.heroNirvanaSub}>Sevierville, TN</span>
            </h1>
            <p>Escape to nature and find your perfect getaway</p>
            <Link className={styles.ctaButton} to={bookingPath}>Book Now</Link>
          </div>
        </section>

        {/* Property Introduction Section */}
        <section className={styles.propertyIntro}>
          <div className={styles.introItem} style={{ justifyContent: "center", textAlign: "center" }}>
            <div className={styles.introText}>
              <h2>Welcome to Nirvana</h2>
              <p>
                Discover a peaceful retreat where nature meets luxury. Our property offers a unique blend of modern amenities and serene surroundings that help you unwind and reconnect.
              </p>
            </div>
            <div className={styles.introImage}>
              <img src={introImageSrc} alt="Property Exterior" onClick={() => openLightbox(introImageSrc)} />
            </div>
          </div>
        </section>

        {/* Amenities Preview Section */}
        <section className={styles.amenitiesPreviewSection}>
          <h2 style={{ color: '#184e17' }}>Amenities</h2>
          <div className={styles.amenitiesPreviewGrid}>
            {amenitiesList.slice(0, 12).map((amenity) => (
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
                openLightbox(null, 'Amenities for Cozy Mountain Retreat', 'amenities');
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
                <Link to="/review/property1" className={styles.ctaButton}>
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
                <Link to="/activities-Nirvana" className={styles.ctaButton}>
                  Explore Activities
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO SLIDER SECTION (Centered Carousel with Blank Sides) */}
        <section className={styles["photoSlider"]}>
          <h2>Unveiling Nirvana</h2>
          <div className={styles["centeredSliderContainer"]}>
            <button className={`${styles["arrowBtn"]} ${styles["arrowLeft"]}`} onClick={scrollLeft}>
              <FaArrowLeft />
            </button>
            <div className={styles["centeredSlider"]}>
              {visibleImages.map((imgSrc, i) => {
                if (!imgSrc) {
                  return <div key={i} className={`${styles["sliderItem"]} ${styles.blank}`} />;
                }
                const isCenter = i === 2; // Middle slot is center.
                return (
                  <div
                    key={i}
                    className={`${styles["sliderItem"]} ${isCenter ? styles["centerItem"] : styles["sideItem"]}`}
                  >
                    <img
                      src={imgSrc}
                      alt={`Photo ${i + 1}`}
                      onClick={() => openLightbox(imgSrc)}
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
              ) : lightboxImage ? (
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
                    />
                  </div>
                  <button className={`${styles.lightboxImgBtn} ${styles.right}`} onClick={nextLightboxImage}>
                    <FaArrowRight />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NirvanaProperty;
