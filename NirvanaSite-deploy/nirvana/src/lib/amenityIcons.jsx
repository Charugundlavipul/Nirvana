import React from 'react';
import { FaUtensils, FaUsers, FaWifi, FaTv, FaBed, FaBath, FaSnowflake, FaFire, FaParking, FaLaptop, FaDesktop, FaMobile, FaTablet, FaCamera, FaHeadphones, FaMicrophone, FaBook, FaCreditCard, FaMoneyBill, FaGift, FaHeart, FaSwimmingPool, FaDumbbell, FaHotTub, FaTree, FaUmbrellaBeach, FaSkiing, FaWater, FaEye, FaWheelchair, FaBuilding, FaHome, FaCoffee, FaCocktail, FaBeer, FaGlassCheers, FaHamburger, FaGamepad, FaFilm, FaMusic, FaPaintRoller, FaBicycle, FaShoppingBag, FaBaby, FaDog, FaCat, FaShieldAlt, FaKey, FaConciergeBell, FaFireExtinguisher, FaFirstAid, FaSun, FaMoon, FaWind, FaUmbrella, FaThermometerHalf, FaArrowRight, FaArrowLeft, FaCheck, FaTimes, FaQuestion, FaExclamation, FaInfo, FaCar, FaMapMarkerAlt } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import * as GiIcons from 'react-icons/gi';

// 1. The Vast Icon Library (Key -> Component)
// Populated dynamically from full icon sets. 
// This gives access to ~3000+ icons.
export const AVAILABLE_ICONS = {};

// Helper: Add all icons from a set to the library with filtering
const EXCLUDED_KEYWORDS = [
    // Dev / Tech / Office
    'Code', 'File', 'Git', 'Terminal', 'Database', 'Server', 'Cloud', 'LaptopCode', 'Bug', 'Branch',
    'React', 'Javascript', 'Html', 'Css', 'Python', 'Java', 'Linux', 'Windows', 'Android', 'Apple',
    'Docker', 'Aws', 'Azure', 'Google', 'Facebook', 'Twitter', 'Instagram', 'Github', 'Youtube', 'Linkedin',
    'Currency', 'Money', 'Dollar', 'Euro', 'Pound', 'Bitcoin', 'Wallet', 'CreditCard', 'Receipt',
    'Calendar', 'Clock', 'User', 'Users', 'Profile', 'Account', 'Login', 'Logout', 'Settings', 'Cog',
    'Wrench', 'Tool', 'Hammer', 'Briefcase', 'Folder', 'Document', 'Paperclip', 'Print', 'Fax',
    'Archive', 'Clipboard', 'Paste', 'Phone', 'Signal', 'Wifi', // Wifi is tricky, keep specific override

    // UI / Abstract / Shapes
    'Arrow', 'Chevron', 'Caret', 'Angle', 'Sort', 'Filter', 'Search', 'Menu', 'Hamburger', 'Ellipsis',
    'Check', 'Times', 'Plus', 'Minus', 'Exclamation', 'Question', 'Info', 'Circle', 'Square', 'Triangle',
    'Spinner', 'Loader', 'Refresh', 'Sync', 'Edit', 'Trash', 'Save', 'Download', 'Upload', 'Share', 'Link',
    'Copy', 'Paste', 'Cut', 'Undo', 'Redo', 'Zoom', 'Expand', 'Compress', 'List', 'Th', 'Table', 'Chart',
    'Grid', 'Col', 'Row', 'Layout', 'View', 'Eye', 'Close', 'Open', 'Lock', 'Unlock', 'Key', // Careful with lock/key
    'Outline', 'Filled', 'Border', 'Sharp', 'Round', 'Tone', 'Twotone', // Material Design variants

    // Medical / Science / Bio / Math
    'Virus', 'Bacteria', 'Dna', 'Microscope', 'Flask', 'Atom', 'Syringe', 'Pill', 'Skull', 'Bone',
    'Hospital', 'Stethoscope', 'Ambulance', 'FirstAid', // Keep FirstAid if needed, usually just 'Aid'
    'Math', 'Sum', 'Sigma', 'Pi', 'Infinity', 'Percent', 'Divide', 'Equals', 'Quote', 'Text', 'Font',
    'Bio', 'Hazard', 'Radioactive', 'Chemical', 'Lab', 'Test', 'Tube',

    // Violence / Horror / RPG Specific (Game Icons cleanup)
    'Blood', 'Gore', 'Skull', 'Bone', 'Corpse', 'Dead', 'Grave', 'Coffin', 'Zombie', 'Monster',
    'Demon', 'Devil', 'Satan', 'Hell', 'Weapon', 'Gun', 'Sword', 'Knife', 'Axe', 'Spear', 'Bomb',
    'Explosion', 'War', 'Battle', 'Fight', 'Attack', 'Hit', 'Damage', 'Pain', 'Wound', 'Scar',
    'Poison', 'Toxic', 'Death', 'Kill', 'Murder', 'Crime', 'Prison', 'Jail', 'Handcuffs',

    // Misc Irrelevant
    'Flag', 'Bookmark', 'Star', 'Heart', 'Thumb', 'Hand', 'Face', 'Emoji', 'Comment', 'Message',
    'Envelope', 'Inbox', 'Outbox', 'Rss', 'Podcast', 'Volume', 'Mute', 'Sound', 'Audio', 'Video',
    'Play', 'Pause', 'Stop', 'Record', 'Forward', 'Backward', 'Next', 'Previous', 'Skip', 'Eject',
    'Battery', 'Power', 'Plug', 'Usb', 'Sim', 'Sd', 'Disc', 'Drive', 'Mouse', 'Keyboard'
];

// Specific overrides to KEEP even if they match keywords
const KEEP_EXCEPTIONS = [
    'Fireplace', 'FirePit', 'Wifi', 'FirstAid', 'Aid', 'Lock', 'Key', 'Tv', 'Laptop', 'Desktop', 'Mobile', 'Tablet'
];

const isRelevant = (key) => {
    // 1. Must satisfy prefix (Fa, Md, Gi) matches

    // 2. Filter out explicit excluded words
    for (const badWord of EXCLUDED_KEYWORDS) {
        if (key.includes(badWord)) {
            // Check exceptions list
            for (const exception of KEEP_EXCEPTIONS) {
                if (key.includes(exception)) return true;
            }
            return false;
        }
    }
    return true;
};

const addIconsToLibrary = (iconSet, prefix) => {
    Object.keys(iconSet).forEach(key => {
        // Filter out non-icon exports (if any) and ensure it starts with prefix
        if (key.startsWith(prefix) && typeof iconSet[key] === 'function') {
            // Apply relevance filter
            if (isRelevant(key)) {
                AVAILABLE_ICONS[key] = iconSet[key];
            }
        }
    });
};

// Load ALL icons (Warning: Large Bundle Size, but requested by user)
addIconsToLibrary(FaIcons, 'Fa');
addIconsToLibrary(MdIcons, 'Md');
addIconsToLibrary(GiIcons, 'Gi');

// 2. The Amenity Bank (Title -> Default Configuration)
// Maps a Display Title to a `icon_key` from AVAILABLE_ICONS.
// Uses robust named icons for these presets.
export const PREDEFINED_AMENITIES = {
    // Internet and Office
    'Wifi': 'FaWifi',
    'High-Speed Wifi': 'FaWifi',
    'Dedicated Workspace': 'FaLaptop',


    // Family Features
    'Crib': 'FaBaby',
    'Cot': 'FaBaby',
    'Travel Cot': 'FaBabyCarriage',
    'High Chair': 'FaBaby',
    'Playroom': 'FaGamepad',
    'Board Games': 'FaChessBoard',
    'Family Friendly': 'FaBaby', // Restored
    'Large Group Capacity': 'FaUsers', // Restored

    // Outdoor
    'Backyard': 'FaTree',
    'Back Garden': 'FaTree',
    'Patio': 'MdBalcony',
    'Patio or Balcony': 'MdBalcony', // Restored
    'Multiple Patios': 'MdBalcony', // Restored
    'Fire Pit': 'FaFire',
    'Outdoor Dining Area': 'FaChair',
    'BBQ Grill': 'MdOutdoorGrill',
    'Hammock': 'FaUmbrellaBeach',
    'Rooftop Adults\' Den': 'FaCocktail', // Restored

    // Bathroom
    'Bath': 'FaBath',
    'Hair Dryer': 'FaWind',
    'Cleaning Products': 'FaPumpSoap',
    'Shampoo': 'FaPumpSoap',
    'Hot Water': 'FaHotTub',
    'Multiple Bathrooms': 'FaBath', // Restored

    // Bedroom and Laundry
    'Washer': 'MdLocalLaundryService',
    'Dryer': 'MdLocalLaundryService',
    'Free Washer': 'MdLocalLaundryService',
    'Free Dryer': 'MdLocalLaundryService',
    'Laundry Facilities': 'MdLocalLaundryService', // Restored
    'Towels': 'FaTshirt',
    'Bed Sheets': 'FaBed',
    'Hangers': 'FaTshirt',
    'Extra Pillows and Blankets': 'FaBed',
    'Room-Darkening Shades': 'FaMoon',
    'Iron': 'MdIron',
    'Clothing Storage': 'FaArchive',
    'Essentials': 'FaTshirt', // Restored

    // Heating and Cooling
    'Air Conditioning': 'FaSnowflake',
    'Heating': 'FaFire',
    'Central Heating': 'FaFire',
    'Electric Fireplace': 'FaFire',
    'Indoor Fireplace': 'FaFire', // Restored
    'Portable Fans': 'FaFan',
    'Climate Control': 'FaThermometerHalf', // Restored

    // Kitchen and Dining
    'Kitchen': 'FaUtensils',
    'Full Kitchen': 'MdKitchen',
    'Chef-Style Kitchen': 'MdKitchen', // Restored
    'Refrigerator': 'MdKitchen',
    'Microwave': 'MdMicrowave',
    'Cooking Basics': 'FaUtensils',
    'Dishes and Silverware': 'FaUtensils',
    'Dishwasher': 'FaSink',
    'Stove': 'FaFire',
    'Oven': 'MdKitchen',
    'Coffee Maker': 'FaCoffee',
    'Wine Glasses': 'FaGlassCheers',
    'Toaster': 'FaBreadSlice',
    'Dining Table': 'FaChair',
    'Breakfast': 'FaCoffee', // Restored

    // Location Features
    'Lake Access': 'FaWater',
    'Private Entrance': 'FaDoorOpen',
    'Waterfront': 'FaWater',
    'Beach Access': 'FaUmbrellaBeach',
    'Ski-in/Ski-out': 'FaSkiing', // Restored
    'Scenic Views': 'FaEye', // Restored
    'FREE Waterpark Access': 'FaWater', // Restored

    // Parking and Facilities
    'Free Parking': 'FaParking',
    'Free Driveway Parking': 'FaCar',
    'Ample Parking': 'FaParking', // Restored
    'EV Charger': 'FaChargingStation',
    'Gym': 'FaDumbbell',
    'Pool': 'FaSwimmingPool',
    'Private Indoor Heated Pool': 'MdPool', // Restored
    'Hot Tub': 'FaHotTub',
    'Single Level Home': 'FaHome',

    // Services & Pets
    'Self Check-In': 'FaKey',
    'Keypad': 'FaKey',
    'Smart Lock': 'FaLock',
    'Long Term Stays Allowed': 'FaCalendarAlt',
    'Pets Allowed': 'MdPets', // Restored
    'Dog Friendly': 'FaDog', // Restored
    'Cat Friendly': 'FaCat', // Restored

    // Home Safety
    'Smoke Alarm': 'MdSensors',
    'Carbon Monoxide Alarm': 'MdSensors',
    'Fire Extinguisher': 'FaFireExtinguisher',
    'First Aid Kit': 'FaFirstAid',
    'Exterior Security Cameras': 'FaVideo',
    'Safety Features': 'FaShieldAlt', // Restored

    // Entertainment
    'TV': 'FaTv',
    'HDTV': 'FaTv',
    'Smart TV': 'FaTv',
    'Smart TVs': 'FaTv', // Restored (plural)
    'Sound System': 'FaMusic',
    'Bluetooth Sound System': 'FaBluetooth',
    'Books and Reading Material': 'FaBook',
    'Game Console': 'FaGamepad',
    'Game Rooms': 'FaGamepad', // Restored
    'Home Theatre': 'FaFilm', // Restored
    'Modern Design': 'FaPaintRoller' // Restored
};

// Helper: Get options for the Amenity Bank
export const BANK_OPTIONS = Object.keys(PREDEFINED_AMENITIES).sort().map(title => ({
    label: title,
    value: title,
    iconKey: PREDEFINED_AMENITIES[title]
}));

// Helper: Get ALL options for Custom Mode
// We memoize this or compute it once since it's huge.
export const ICON_OPTIONS = Object.keys(AVAILABLE_ICONS).sort().map(key => {
    // Generate clean label: "FaSwimmingPool" -> "Swimming Pool"
    let label = key.replace(/^(Fa|Md|Gi)/, ''); // Remove prefix
    label = label.replace(/([A-Z])/g, ' $1').trim(); // Add space before caps
    return {
        label: label,
        value: key,
        icon: AVAILABLE_ICONS[key]
    };
});

export const getAmenityIcon = (title, iconKey) => {
    // 1. Try explicit iconKey (Custom Mode or Bank Mode populated)
    if (iconKey && AVAILABLE_ICONS[iconKey]) {
        // Render the component
        const IconComponent = AVAILABLE_ICONS[iconKey];
        return <IconComponent />;
    }

    // 2. Try Title lookup in Presets
    const presetKey = PREDEFINED_AMENITIES[title];
    if (presetKey && AVAILABLE_ICONS[presetKey]) {
        const IconComponent = AVAILABLE_ICONS[presetKey];
        return <IconComponent />;
    }

    // 3. Fallback: Fuzzy match or explicit React Icon mapping for legacy
    if (AVAILABLE_ICONS[title]) {
        const IconComponent = AVAILABLE_ICONS[title];
        return <IconComponent />;
    }

    // 4. Default
    return <FaUtensils />;
};
