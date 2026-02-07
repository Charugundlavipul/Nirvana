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
import styles from './HalftimeProperty.module.css';
import { fetchPropertyBundleBySlug } from '../../lib/contentApi';



// Use public URLs for images
const intro1 = "/data/Halftime%20Hideaway/32.jpg";
const heroImage = "/data/Halftime%20Hideaway/6.jpg";

// Use an array of public URLs for the slider images
const images = [
  "/data/Halftime Hideaway/1.jpg",
  "/data/Halftime Hideaway/2.jpg",
  "/data/Halftime Hideaway/3.jpg",
  "/data/Halftime Hideaway/4.jpg",
  "/data/Halftime Hideaway/5.jpg",
  "/data/Halftime Hideaway/6.jpg",
  "/data/Halftime Hideaway/7.jpg",
  "/data/Halftime Hideaway/8.jpg",
  "/data/Halftime Hideaway/9.jpg",
  "/data/Halftime Hideaway/10.jpg",
  "/data/Halftime Hideaway/11.jpg",
  "/data/Halftime Hideaway/12.jpg",
  "/data/Halftime Hideaway/13.jpg",
  "/data/Halftime Hideaway/14.jpg",
  "/data/Halftime Hideaway/15.jpg",
  "/data/Halftime Hideaway/16.jpg",
  "/data/Halftime Hideaway/17.jpg",
  "/data/Halftime Hideaway/18.jpg",
  "/data/Halftime Hideaway/19.jpg",
  "/data/Halftime Hideaway/20.jpg",
  "/data/Halftime Hideaway/21.jpg",
  "/data/Halftime Hideaway/22.jpg",
  "/data/Halftime Hideaway/23.jpg",
  "/data/Halftime Hideaway/24.jpg",
  "/data/Halftime Hideaway/25.jpg",
  "/data/Halftime Hideaway/26.jpg",
  "/data/Halftime Hideaway/27.jpg",
  "/data/Halftime Hideaway/28.jpg",
  "/data/Halftime Hideaway/29.jpg",
  "/data/Halftime Hideaway/30.jpg",
  "/data/Halftime Hideaway/31.jpg",
  "/data/Halftime Hideaway/32.jpg",
  "/data/Halftime Hideaway/33.jpg",
  "/data/Halftime Hideaway/34.jpg",
  "/data/Halftime Hideaway/35.jpg",
  "/data/Halftime Hideaway/36.jpg",
  "/data/Halftime Hideaway/37.jpg",
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

const HalftimeProperty = () => {
  const [lightboxImage, setLightboxImage] = useState(null);
  const [lightboxType, setLightboxType] = useState(''); // 'amenities', 'faq', or image-only
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
  const fallbackAmenityTitles = [
    'Sleeps large groups comfortably',
    'Private indoor heated pool',
    'Hot tub for relaxation',
    'Home theatre',
    'Game rooms with PS5, Nintendo Switch and arcade games',
    'Poker table, billiards and golf simulator',
    'Chef-style modern kitchen',
    'Multiple patios with fire pit and BBQ grill',
    'High-speed Wi-Fi and Smart TVs',
  ];

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
        const data = await fetchPropertyBundleBySlug('halftime');
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
        console.error('Error loading Halftime property data:', error);
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
              Halftime Hideaway
              <span className={styles.heroNirvanaSub}>Luxury Rooftop Retreat</span>
            </h1>
            <p>Indoor Pool, Waterpark & Game Zones - Where Memories Are Made</p>
            <Link className={styles.ctaButton} to={bookingPath}>Book Now</Link>
          </div>
        </section>

        {/* About This Space Section */}
        <section className={styles.aboutSection}>
          <div className={styles.aboutContent}>
            <div className={styles.aboutText}>
              <h2>About This Space</h2>
              <h3>Halftime Hideaway | Luxury Rooftop Retreat with Indoor Pool, Waterpark & Game Zones</h3>
              <p>
                Welcome to <strong>Halftime Hideaway</strong>, a one-of-a-kind luxury rooftop retreat designed for families, friends, and large groups seeking comfort, privacy, and nonstop entertainment.
              </p>
              <p>
                This spacious multi-level home features a <strong>private indoor heated pool</strong>, <strong>hot tub</strong>, <strong>home theatre</strong>, and <strong>multiple game rooms</strong>, along with <strong>FREE access to an exclusive on-site waterpark</strong>. From ultra-modern interiors and a chef-style kitchen to patios on every level with a fire pit and BBQ grill, this getaway blends luxury living with unforgettable experiences.
              </p>
              <p>
                The <strong>rooftop level is an adults' den</strong>, complete with a wet bar, seating, and games — the perfect place to unwind after a day of fun. This is more than a stay — it's where lasting memories are made.
              </p>
            </div>
            <div className={styles.aboutImage}>
              <img src={introImageSrc} alt="Halftime Hideaway Interior" onClick={() => openLightbox(introImageSrc)} />
            </div>
          </div>
        </section>



        {/* Top-Rated Amenities Section */}
        <section className={styles.amenitiesListSection}>
          <h2>Top-Rated Amenities</h2>
          <ul className={styles.amenitiesList}>
            {(amenitiesList.length
              ? amenitiesList.slice(0, 9).map((item) => item.title)
              : fallbackAmenityTitles
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Waterpark Access Section */}
        <section className={styles.waterparkSection}>
          <h2>Exclusive Waterpark Access (Included with Stay)</h2>
          <p className={styles.waterparkIntro}>
            Guests enjoy <strong>FREE access</strong> to a beautifully designed on-site waterpark featuring:
          </p>
          <div className={styles.waterparkGrid}>
            <ul className={styles.waterparkList}>
              <li>Infinity swimming pool</li>
              <li>Splash pad</li>
              <li>Lazy river</li>
              <li>Soaking spa / hydrotherapy area</li>
              <li>Outdoor firepit</li>
              <li>Scenic lounge areas</li>
            </ul>
            <ul className={styles.waterparkList}>
              <li>Cabanas & loungers</li>
              <li>Amphitheatre</li>
              <li>Pickleball court</li>
              <li>9-hole mini golf course</li>
              <li>Pocket billiards / soccer billiards</li>
              <li>Sun decks and seating areas</li>
              <li>Illuminated nighttime setting with ambient lighting & fire features</li>
            </ul>
          </div>
          <p className={styles.waterparkNote}>
            <em>A true resort-style experience for all ages.</em>
          </p>
        </section>

        {/* Sleeping Arrangements Section */}
        <section className={styles.sleepingSection}>
          <h2>Where You'll Sleep</h2>
          <p className={styles.sleepingIntro}>Thoughtfully designed for comfort, privacy, and group flexibility</p>
          <div className={styles.sleepingGrid}>
            <div className={styles.sleepingCard}>
              <h3>Level 1</h3>
              <ul>
                <li>Bedroom 1 – 1 King Bed + ensuite</li>
                <li>Bedroom 2 – 1 King Bed + ensuite</li>
              </ul>
            </div>
            <div className={styles.sleepingCard}>
              <h3>Level 2</h3>
              <ul>
                <li>Bedroom 3 – 1 King Bed + ensuite</li>
                <li>Bedroom 4 – 1 Queen-over-King Bunk + ensuite</li>
                <li>Bonus Bunk Area – 1 Full-over-Full + 1 Twin-over-Twin bunk set</li>
              </ul>
            </div>
            <div className={styles.sleepingCard}>
              <h3>Basement</h3>
              <ul>
                <li>Bedroom 5 – 1 Full-over-Full Bunk Bed + ensuite</li>
              </ul>
            </div>
            <div className={styles.sleepingCard}>
              <h3>Roof Top</h3>
              <ul>
                <li>Sleeper Sofa</li>
              </ul>
            </div>
          </div>
          <p className={styles.sleepingNote}>Perfect for families, couples, kids, cousins, and group stays.</p>
        </section>

        {/* Bathrooms Section */}
        <section className={styles.bathroomsSection}>
          <h2>Bathrooms</h2>
          <p>Designed for convenience and privacy across all levels:</p>
          <div className={styles.bathroomsGrid}>
            <div className={styles.bathroomCard}>
              <h4>Level 1</h4>
              <p>2 full bathrooms + 1 half bathroom</p>
            </div>
            <div className={styles.bathroomCard}>
              <h4>Level 2</h4>
              <p>3 full bathrooms</p>
            </div>
            <div className={styles.bathroomCard}>
              <h4>Basement</h4>
              <p>1 full bathroom</p>
            </div>
            <div className={styles.bathroomCard}>
              <h4>Rooftop Level</h4>
              <p>1 half bathroom</p>
            </div>
          </div>
          <p className={styles.bathroomNote}>Starter amenities provided: shampoo, conditioner, toilet paper, and fresh towels.</p>
        </section>

        {/* Entertainment Section */}
        <section className={styles.entertainmentSection}>
          <h2>Entertainment & Fun (Multi-Level Experience)</h2>
          <div className={styles.entertainmentGrid}>
            <div className={styles.entertainmentCard}>
              <h3>Indoor Highlights</h3>
              <ul>
                <li>Private indoor heated pool (keypad lock & safety alarm)</li>
                <li>Home theatre for movie nights</li>
                <li>Game rooms with PS5, Nintendo Switch, arcade games & gaming chairs</li>
                <li>Poker table, billiards & golf simulator</li>
              </ul>
            </div>
            <div className={styles.entertainmentCard}>
              <h3>Outdoor Highlights</h3>
              <ul>
                <li>Hot tub</li>
                <li>Fire pit with seating</li>
                <li>BBQ grill</li>
                <li>Covered patios on multiple levels</li>
              </ul>
            </div>
          </div>
          <p className={styles.entertainmentNote}>Endless entertainment for kids and adults alike.</p>
          
          <div className={styles.poolInfo}>
            <h3>Indoor Pool Info:</h3>
            <ul>
              <li>Pool room heated to a comfortable 84–86°F</li>
              <li>Pool water stays at 82°F (+/- 3°F)</li>
              <li>Note: The pool is warm, but not hot tub temperature (100+°F). It's perfect for year-round swimming.</li>
              <li>The pool alarm is for the safety of the guests and the alarm is expected to go off whenever there is a sudden movement or a big splash in the water.</li>
            </ul>
          </div>
        </section>

        {/* Kitchen & Smart TV Section */}
        <section className={styles.kitchenSection}>
          <h2>Kitchen, Dining & Living</h2>
          <ul>
            <li>Fully equipped modern kitchen with high-end appliances</li>
            <li>Pots, pans, dishware & utensils for large groups</li>
            <li>Expansive island with bar seating</li>
            <li>Open concept living room with stylish seating, electric fireplace & Smart TV</li>
            <li>Ideal for shared meals, celebrations, and relaxing together</li>
          </ul>
          
          <div className={styles.smartTvInfo}>
            <h3>Smart TV & Streaming Use</h3>
            <p>• The property is equipped with Smart TVs for guest use.</p>
            <p>• Guests may access their own streaming/OTT subscriptions during their stay.</p>
            <p>• For security and privacy reasons, guests are required to sign out of all personal accounts on TVs and other connected devices at checkout.</p>
            <p><strong>The host is not responsible for any accounts left logged in after departure.</strong></p>
          </div>
        </section>

        {/* What Guests Love Section */}
        <section className={styles.guestsLoveSection}>
          <h2>What Guests Love</h2>
          <ul className={styles.guestsLoveList}>
            <li>Brand-new design with high-end & modern finishes</li>
            <li>Every bedroom curated with comfort in mind — ideal for couples & families</li>
            <li>Incredible variety of entertainment — you'll never get bored!</li>
          </ul>
        </section>

        {/* Family & Child Safety Section */}
        <section className={styles.safetySection}>
          <h2>Family & Child Safety</h2>
          <p>For families with young children, safety is a top priority:</p>
          <ul className={styles.safetyList}>
            <li>Pool room equipped with keypad lock</li>
            <li>Safety alarm installed</li>
            <li>Clear visibility for parents</li>
          </ul>
        </section>

        {/* Parking & EV Charging Section */}
        <section className={styles.parkingSection}>
          <h2>Parking & EV Charging</h2>
          <ul className={styles.parkingList}>
            <li>Ample private on-site parking available</li>
            <li>Comfortably accommodates up to 5 large SUVs or 6 mid-size/small vehicles in the paved driveway</li>
            <li>No street parking required</li>
            <li>Fully paved access — no steep or difficult roads</li>
          </ul>
          
          <h3>EV Charging (On-Site)</h3>
          <p>This home is EV-friendly and equipped with a Level 2 plug-in EV charger for guest convenience.</p>
          <ul className={styles.evList}>
            <li>Charger: Legrand Level 2 EV Charger (NEMA 14-50 plug)</li>
            <li>Charging speed: Up to 40A (suitable for overnight or extended charging)</li>
            <li>Simple plug-and-use system — no internet or app required</li>
          </ul>
          <div className={styles.evNote}>
            <strong>Important EV Note:</strong> Guests must bring their own compatible EV charging cable/adapter. 
            This is a residential Level 2 charger (not a commercial fast charger) and is ideal for steady, overnight charging.
          </div>
        </section>

        {/* Guest Access Section */}
        <section className={styles.guestAccessSection}>
          <h2>Guest Access</h2>
          <p>
            Guests have <strong>private access to the entire property</strong>, including all indoor amenities, outdoor spaces, and exclusive waterpark access.
          </p>
        </section>

        {/* House Rules Section */}
        <section className={styles.houseRulesSection}>
          <h2>House Rules</h2>
          <div className={styles.rulesList}>
            <div className={styles.ruleItem}>
              <strong>⚠️ Very Important</strong>
              <p>Refraining from feeding all types of animals under any circumstances to ensure a safe stay. Ensure not to leave any food or drinks in outdoor areas to prevent attracting wild animals.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🎉 No Parties</strong>
              <p>Please always refrain from hosting parties during your stay.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>👟 Shoes off at Entryway</strong>
              <p>Kindly remove your shoes upon entering the house.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>👥 Head Count</strong>
              <p>Head count not beyond the number stated in the booking request.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🐕 No Pets</strong>
              <p>No pets allowed. In case of service pet, prior notice to host is required.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🪑 Furniture Care</strong>
              <p>Please do not abuse the furniture and furniture cannot be moved. Please reach out to the host if you have any special needs to move the furniture to prevent any damages.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🖼️ Wall Fixtures</strong>
              <p>Do not move the fixtures that are on the walls. If you have to move any kind of decorative items, please seek prior approval from the host. Please handle all fixtures gently and put them back before the checkout in case of changes made with the approval of the host.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🏊 Pool Room Controls Policy</strong>
              <p>Guests are not allowed to adjust: Pool water temperature, Indoor pool AC temperature, Humidity levels.</p>
              <p className={styles.penalty}>$500 penalty for any tampering.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🚭 No Smoking/Vaping Policy</strong>
              <p>Smoking or vaping of any kind is prohibited on the property, over the porch and over the deck.</p>
              <p className={styles.penalty}>$500 penalty for violations.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🔥 Propane Grill Note</strong>
              <p>The property includes a propane grill with a small tank. While our team makes every effort to keep it filled, we cannot guarantee the tank will always last for the duration of your stay. For uninterrupted grilling, guests are welcome to bring an extra propane tank and may take it with them upon departure.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🎮 Arcade Games</strong>
              <p>Please DO NOT move, climb, unplug the machines. They are meant for your entertainment. Please use them gently and inform the children the same.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🎯 Games</strong>
              <p>Please use all the gaming equipment provided with gentleness and care. Ensure to leave all the items related to those games within their respective areas.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🎊 No Confetti/Decorations</strong>
              <p>No confetti, no flower petals, no decorative items sticking to the walls with tape, nails or pins.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🛡️ Property Care</strong>
              <p>Do not make any sort of stains, tears, burns to the floors, walls, furniture & fixtures.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🔇 No Loud Sounds</strong>
              <p>Please be mindful of noise levels to respect neighbors.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🌡️ Strictly DO NOT</strong>
              <p>Strictly DO NOT attempt to change pool water temperatures and Pool room AC temperatures.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>💧 Dry Off After Swimming</strong>
              <p>After swimming, please dry off outside before entering the house.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🚽 Septic System Care</strong>
              <p>Only toilet paper should be flushed down the toilet to prevent clogging, blockages from the septic system. Please report to the host immediately if you notice slow draining or no draining situation of water in the toilets, sinks and shower area.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🔒 Security Measures</strong>
              <p>Before leaving the property, ensure that all doors and windows are securely locked.</p>
            </div>
            
            <div className={styles.ruleItem}>
              <strong>🚗 Parking</strong>
              <p>Always use the driveway for parking. Do not park on the street to avoid inconvenience to our neighbors. If you have any questions, do not hesitate to contact the host.</p>
            </div>
          </div>
        </section>

        {/* Location Disclaimer Section */}
        <section className={styles.disclaimerSection}>
          <h2>Before You Book</h2>
          <p>If your preferred dates aren't available, reach out — we manage additional nearby properties and may be able to accommodate your group.</p>
          
          <div className={styles.disclaimerBox}>
            <h3>Location Disclaimer:</h3>
            <p>This home is located near a national park. <strong>No refunds</strong> can be issued for temporary rolling power outages, internet/Wi-Fi interruptions, or wildlife sightings (including mice, rodents, or bears). Pest control services are performed <strong>1–2 times per month</strong>, and our team responds quickly if assistance is needed.</p>
          </div>
        </section>

        {/* Cabins Listing Section */}
        <section className={styles.cabinsSection} id="cabins">
          <div className={styles.cabinsGrid}>
            {/* <div className={`${styles.cabinCard} ${styles.reviewsCard}`}>
              <div className={styles.cabinContent}>
                <div>
                  <h3>Curious about what guests say?</h3>
                  <p>Discover heartfelt experiences from those who stayed with us.</p>
                </div>
                <Link to="/review/property3" className={styles.ctaButton}>
                  Hear Their Stories
                </Link>
              </div>
            </div> */}
            <div className={`${styles.cabinCard} ${styles.reviewsCard}`}>
              <div className={styles.cabinContent}>
                <div>
                  <h3>Nearby Activities</h3>
                  <p>Explore fun activities in the vicinity of your stay</p>
                </div>
                <Link to="/activities-Halftime" className={styles.ctaButton}>
                  Explore Activities
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* PHOTO SLIDER SECTION (Centered Carousel with Blank Sides) */}
        <section className={styles["photoSlider"]}>
          <h2>Unveiling Halftime Hideaway</h2>
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
                      alt=""
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

export default HalftimeProperty;
