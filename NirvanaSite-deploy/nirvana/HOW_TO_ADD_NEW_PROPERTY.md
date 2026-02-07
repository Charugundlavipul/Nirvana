# How to Add a New Property to Your Website
## A Simple Step-by-Step Guide

This guide will help you add a new property to your website.

---

##  Before You Start - What You'll Need

1. **Photos of the new property** (recommended: 30-50 high-quality photos)
2. **Property details** like:
   - Property name
   - Location (city and state)
   - Number of bedrooms and bathrooms
   - Number of guests it can sleep
   - Bed types (King, Queen, Twin, etc.)
   - Special features (hot tub, pool, etc.)
3. **A list of amenities** (kitchen, wifi, parking, etc.)
4. **Nearby activities** and attractions
5. **FAQ questions and answers** specific to this property

---

##  Step 1: Organize Your Property Photos

### What to do:

1. **Create a new folder** for your property photos:
   - Go to the folder: `public/data/`
   - Create a new folder with your property name (for example: `Paradise Villa`)
   - Put all main property photos here (bedroom, kitchen, living room, etc.)

2. **Create folders for highlights and activities**:
   - In `public/data/`, create another folder called `Paradise Villa Highlights`
   - Put your best 20-30 photos here (these show on the homepage)
   - Create a folder called `Paradise Villa Activities`
   - Put photos of nearby attractions here

### Example folder structure:
```
public/data/
  ├── Paradise Villa/           (Main property photos)
  ├── Paradise Villa Highlights/ (Best photos for homepage)
  └── Paradise Villa Activities/ (Nearby attractions photos)
```

### Tips:
- Name photos with numbers: `01.webp`, `02.webp`, etc. (easier to manage)
- Use `.webp` or `.jpg` format for photos
- Keep photo file sizes under 2MB each for faster loading

---

##  Step 2: Add Property Information to the Homepage
### What to do:

1. **Open the file**: `src/components/Home/Home.js`

2. **Find the section** that lists property photos (around line 6-28)

3. **Add your new property's highlight photos**:
   - Copy the existing pattern for "featureImagesNirvana" or "featureImagesOasis"
   - Create a new list called `featureImagesYourProperty`
   - List all your highlight photos like this:

```javascript
const featureImagesParadiseVilla = [
    "/data/Paradise Villa Highlights/01.webp",
    "/data/Paradise Villa Highlights/02.webp",
    "/data/Paradise Villa Highlights/03.webp",
    // ... add all your highlight photos
];
```

4. **Add helper code**
  - in const home when we are declaring the variables, add this:
      const [currentIndexHalftime, setCurrentIndexHalftime] = useState(0);
  - in handle full screen preview add :
      if (fullscreenSet === 'halftime') setCurrentIndexHalftime(newIndex);
  - in handle full screen next add :
      if (fullscreenSet === 'halftime') setCurrentIndexHalftime(newIndex);
  - in close full screen add:
      if (fullscreenSet === 'halftime') setCurrentIndexHalftime(fullscreenIndex);
  - in get full screen image add:
      if (fullscreenSet === 'halftime') return featureImagesHalftime;

5. **Add your property details**
    Below the last property detail, copy paste this chunk of code and make changes to the content in this part to add a new property.

    '''''
        <div className={styles.featureItem}>
                    <div className={styles.imageContainer}>
                        <img 
                            src={featureImagesHalftime[currentIndexHalftime]}
                            srcSet={`
                                ${featureImagesHalftime[currentIndexHalftime]} 700w,
                                ${featureImagesHalftime[currentIndexHalftime]} 400w
                            `}
                            sizes="(max-width: 600px) 90vw, 700px"
                            alt="Luxury Living"
                            onClick={() => handleImageClick(featureImagesHalftime[currentIndexHalftime], 'halftime', currentIndexHalftime)}
                            style={{ cursor: 'pointer' }}
                        />
                        <button 
                            className={`${styles.arrowButton} ${styles.leftArrow}`}
                            onClick={() => setCurrentIndexHalftime((prev) => (prev === 0 ? featureImagesHalftime.length - 1 : prev - 1))}
                        >
                            ❮
                        </button>
                        <button 
                            className={`${styles.arrowButton} ${styles.rightArrow}`}
                            onClick={() => setCurrentIndexHalftime((prev) => (prev === featureImagesHalftime.length - 1 ? 0 : prev + 1))}
                        >
                            ❯
                        </button>
                    </div>
                    <div className={styles.featureText}>
                        <Link to="/halftime" className={styles.featureLink}>
                            <h3 className={styles.featureTitle}>
                                Enjoy your break at Halftime Hideaway
                            </h3>
                            <h4 className={styles.featureSubtitle}>Sevierville, TN</h4>
                            <p className={styles.featureDescription}>
                                A one-of-a-kind luxury rooftop retreat designed for families, friends, and large groups seeking comfort, privacy, and nonstop entertainment
                            </p>
                        </Link>
                    </div>
                </div>
    '''''

---

##  Step 3: Create a Detailed Property Page

### What to do:

1. **Copy an existing property page file**:
   - Go to: `src/components/NirvanaPage/`
   - Copy `NirvanaProperty.js`
   - Rename it to: `ParadiseVillaProperty.js`

2. **Open your new file** and update these sections:

### A. Update the photo list (beginning of file):
```javascript
const images = [
  "/data/Paradise Villa/01.webp",
  "/data/Paradise Villa/02.webp",
  "/data/Paradise Villa/03.webp",
  // ... list all main property photos
];

const intro1 = '/data/Paradise Villa/intro1.webp';  // First intro image
const heroImage = '/data/Paradise Villa/hero.webp';  // Main hero image
```

### B. Update property information (around line 150-200):
Find the section with property details and change:
- Property name
- Location
- Number of guests
- Bedrooms and bathrooms
- Description text
- Check-in/check-out times
- House rules

### C. Save the file!

---

## Step 4: Create Amenities List

### What to do:

1. **Go to folder**: `src/data/`

2. **Copy the file**: `NirvanaAmenities.json`

3. **Rename it to**: `ParadiseVillaAmenities.json`

4. **Open the file** and edit each amenity:

```json
[
  {
    "id": 1,
    "icon": "/icons/bath.svg",
    "title": "Bath Amenities",
    "description": "Bath, hair dryer, shampoo and conditioner, body soap, hot water"
  },
  {
    "id": 2,
    "icon": "/icons/wifi.svg",
    "title": "High-Speed Wifi",
    "description": "Fast and reliable WiFi available throughout the villa"
  }
]
```

### Available icons you can use:
- `/icons/bath.svg` - Bathroom amenities
- `/icons/wifi.svg` - Internet/WiFi
- `/icons/kitchen.svg` - Kitchen features
- `/icons/tv.svg` - Entertainment
- `/icons/parking.svg` - Parking
- `/icons/ac.svg` - Heating/Cooling
- `/icons/outdoor.svg` - Outdoor features
- `/icons/family.svg` - Family friendly
- `/icons/safety.svg` - Safety features
- `/icons/laundry.svg` - Laundry
- `/icons/workspace.svg` - Workspace
- `/icons/selfcheckin.svg` - Self check-in

5. **Update your property page file** to use this amenities file:
   - Open `ParadiseVillaProperty.js`
   - Find the line: `import amenitiesData from '../../data/NirvanaAmenities.json';`
   - Change to: `import amenitiesData from '../../data/ParadiseVillaAmenities.json';`

---

## Step 5: Add FAQ Questions

### What to do:

1. **Open the file**: `src/data/faqData.json`

2. **Add a new section** for your property:

```json
{
  "common": [
    // Don't change these - applies to all properties
  ],
  "propertyOne": [
    // Existing property - don't change
  ],
  "propertyTwo": [
    // Existing property - don't change
  ],
  "propertyThree": [
    {
      "question": "What are the check-in and check-out times for Paradise Villa?",
      "answer": "Check-in time is at 3:00 PM and check-out time is at 11:00 AM."
    },
    {
      "question": "What amenities are included at Paradise Villa?",
      "answer": "Paradise Villa includes a private pool, beach access, and ocean views."
    },
    {
      "question": "Is parking available at Paradise Villa?",
      "answer": "Yes, free parking for up to 3 cars in the private driveway."
    }
  ]
}
```

---

## Step 6: Add Property to Overview Page

### What to do:

1. **Open the file**: `src/components/PropertyOverview/propertyOverview.js`

2. **Find the properties list** (around line 5-25)

3. **Add your new property**:

```javascript
const properties = [
    {
      name: "Nirvana",
      location: "Sevierville, TN",
      // ... existing property
    },
    {
      name: "Shoreside Oasis",
      location: "Mooresville (Lake Norman), NC",
      // ... existing property
    },
    {
      name: "Paradise Villa",
      location: "Miami Beach, FL",
      sleeps: 10,
      bed: "5",
      bedtype: "(5 Bedrooms, 3 King Beds, 2 Queen beds)",
      bath: "4",
      bathtype: "(3 Full baths, 1 Half Bath)",
      hotTub: false,
      image: "/data/Paradise Villa/hero.webp",
    },
];
```

4. **Find the section** that handles property clicks (around line 80-100)

5. **Add your property to the click handler**:
   - Find the code that says `property.name === "Nirvana"`
   - Add another condition for your property:

```javascript
onClick={() =>
  handlePropertyClick(
    property.name === "Nirvana"
      ? "/nirvana"
      : property.name === "Shoreside Oasis"
      ? "/shoreside"
      : "/paradisevilla"
  )
}
```

---

## Step 7: Create a Page Route

### What to do:

1. **Open the file**: `src/App.js`

2. **At the top**, add an import for your new property page:

```javascript
import ParadiseVillaProperty from './components/NirvanaPage/ParadiseVillaProperty';
```

3. **Find the Routes section** (around line 25-35)

4. **Add a new route** for your property:

```javascript
<Route path="/paradisevilla" element={<ParadiseVillaProperty />} />
```

---

## Step 8: Add Nearby Activities Page (Optional)

### What to do:

1. **Go to**: `src/components/NearbyActivities/`

2. **Copy the file**: `ActivitiesNirvana.js`

3. **Rename to**: `ActivitiesParadiseVilla.js`

4. **Open the file** and update:
   - Property name in the title
   - Activity descriptions
   - Photo paths to your activities photos

5. **Add the route in App.js**:

```javascript
import ActivitiesParadiseVilla from "./components/NearbyActivities/ActivitiesParadiseVilla";

// In the Routes section:
<Route path="/activities-ParadiseVilla" element={<ActivitiesParadiseVilla />} />
```

6. **Link from your property page**:
   - Open `ParadiseVillaProperty.js`
   - Find the "Nearby Activities" button
   - Update the link to: `/activities-ParadiseVilla`

---

## Step 9: Test Your New Property

### Before publishing:

1. **Open a terminal/command prompt**
2. **Navigate to your project folder**
3. **Type**: `npm start`
4. **Wait for the website to open** in your browser
5. **Check everything works**:
   - ✓ New property appears on homepage
   - ✓ Can click to open property page
   - ✓ All photos load correctly
   - ✓ Amenities display properly
   - ✓ FAQ section works
   - ✓ Booking button works
   - ✓ Activities page opens (if you created one)

---

## Step 10: Publish to Website

### What to do:

1. **Stop the test website** (press Ctrl+C in terminal)

2. **Build for production**:
   - Type: `npm run build`
   - Wait for it to finish

3. **Deploy the update**:
   - ssh bluefram@67.20.116.164
   - in a new terminal do the below:
        scp -r build bluefram@blueframesanimation.com:/home/bluefram/public_html/website_677d25d4/
   - mv build/* .
   - chmod -R 755 .

---

## Quick Checklist

Before you finish, make sure you completed:

- [ ] Added property photos to `public/data/` folders
- [ ] Updated `Home.js` with property info
- [ ] Created property page file
- [ ] Created amenities JSON file
- [ ] Updated FAQ data
- [ ] Added property to overview page
- [ ] Created page route in App.js
- [ ] Created activities page (optional)
- [ ] Tested everything locally
- [ ] Built and deployed to website

---

## Common Issues & Solutions

### Photos not showing?
- ✓ Check photo file names match exactly (case-sensitive)
- ✓ Make sure photos are in `public/data/` folder
- ✓ Try using lowercase names and no spaces

### Property not appearing on homepage?
- ✓ Make sure you added it to the properties list in `Home.js`
- ✓ Check that the `images` array name matches

### Can't click to open property page?
- ✓ Check you added the route in `App.js`
- ✓ Make sure the path matches in overview page

### Page looks broken?
- ✓ Check for missing commas in JSON files
- ✓ Make sure all brackets `{ }` and `[ ]` are closed properly
- ✓ Look for error messages in the terminal

---


