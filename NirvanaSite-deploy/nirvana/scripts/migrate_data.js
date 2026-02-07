require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const USING_SERVICE_ROLE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const PROPERTY_MEDIA_BUCKET = process.env.SUPABASE_BUCKET || 'property-assets';
const REVIEW_AVATAR_BUCKET = process.env.SUPABASE_PROFILE_PICTURES_BUCKET || 'profile-pictures';
const HIGHLIGHT_TABLE_NAME = 'property_highlight_images';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (fallback: VITE_SUPABASE_ANON_KEY) in .env');
    process.exit(1);
}

if (!USING_SERVICE_ROLE_KEY) {
    console.warn('Warning: using anon key. RLS may block INSERT/DELETE/UPSERT operations.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const CURATED_SLOT_ORDER = { home: 0, bg: 1, secondary: 2 };
const avatarUrlCache = new Map();

// --- DATA ---

const propertiesData = [
    {
        name: 'Nirvana',
        slug: 'nirvana',
        booking_url: 'https://booking.hospitable.com/widget/9e224cf5-d1f1-4684-a679-e44394820fb1/1469000',
        location: 'Sevierville, TN',
        description: 'Luxury mountain retreat with expansive views, entertainment spaces, and premium family-friendly amenities.',
        sleeps: 14,
        bedroom_count: 4,
        bathroom_count: 4.5,
        bed_details: '(4 Bedrooms, 3 King Beds, 4 Queen Bunk beds)',
        bath_details: '(3 Full baths, 3 Half Baths)',
        hot_tub: true,
        image_folder: 'Nirvana',
        highlights_folder: 'Nirvana Highlights',
        curated_images: {
            home: '/assets/aboutUs-hero.avif',
            bg: '/nirvanapics/exterior.avif',
            secondary: '/nirvanapics/bedroom1.avif'
        },
        reviews_file: 'property1.json',
        amenities_file: 'NirvanaAmenities.json',
        faq_key: 'propertyOne'
    },
    {
        name: 'Shoreside Oasis',
        slug: 'shoreside',
        booking_url: 'https://booking.hospitable.com/widget/9e224cf5-d1f1-4684-a679-e44394820fb1/910882',
        location: 'Mooresville (Lake Norman), NC',
        description: 'Spacious lakefront home with private dock access, modern interiors, and indoor-outdoor entertaining areas.',
        sleeps: 12,
        bedroom_count: 5,
        bathroom_count: 3.5,
        bed_details: '(5 Bedrooms, 2 King Beds, 4 Queen beds, 4 Twin Bunk beds)',
        bath_details: '(3 Full baths, 1 Half Bath)',
        hot_tub: false,
        image_folder: 'ShoresideOasis',
        highlights_folder: 'Shoreside Highlights',
        curated_images: {
            home: '/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp',
            bg: '/data/ShoresideOasis/116 Mcnaron-37_40_11zon.webp',
            secondary: '/data/ShoresideOasis/2_2_11zon.webp'
        },
        reviews_file: 'property2.json',
        amenities_file: 'ShoresideAmenities.json',
        faq_key: 'propertyTwo'
    },
    {
        name: 'Halftime Hideaway',
        slug: 'halftime',
        booking_url: 'https://booking.hospitable.com/widget/9e224cf5-d1f1-4684-a679-e44394820fb1/2075486',
        location: 'Sevierville, TN',
        description: 'Large-group Smoky Mountain getaway with rooftop hangout spaces, game rooms, and scenic valley views.',
        sleeps: 22,
        bedroom_count: 5,
        bathroom_count: 7,
        bed_details: '(5 Bedrooms, 3 King Beds, 1 Queen over king bed, 2 full over full , 1 twin over Twin Bunk beds, 1 sleeper sofa )',
        bath_details: '(6 Full baths, 2 Half Baths)',
        hot_tub: true,
        image_folder: 'Halftime Hideaway',
        highlights_folder: 'Halftime Hideaway Highlights',
        curated_images: {
            home: '/data/Halftime Hideaway/6.jpg',
            bg: '/data/Halftime Hideaway/1.jpg',
            secondary: '/data/Halftime Hideaway/9.jpg'
        },
        reviews_file: 'property3.json',
        amenities_file: 'HalftimeAmenities.json',
        faq_key: 'propertyThree'
    },
];

const activitiesByKey = {
    smoky_mountains: {
        title: 'Great Smoky Mountains National Park',
        description: 'Includes scenic drives like Cades Cove and Roaring Fork Trail, with hiking and wildlife viewing year-round.',
        image_path: '/data/Nirvana Activities/Smoky.webp',
        link_url: 'https://www.nps.gov/grsm/index.htm'
    },
    forbidden_caverns: {
        title: 'Forbidden Caverns',
        description: 'Guided cave tours through underground formations, natural chimneys, and streams in Sevierville.',
        image_path: '/data/Nirvana Activities/Caves.webp',
        link_url: 'https://smokymountaincouponbook.com/coupons/forbidden-caverns-sevierville-tn/'
    },
    the_appalachian: {
        title: 'The Appalachian',
        description: 'Upscale downtown Sevierville dining focused on modern Appalachian cuisine and hearth-cooked flavors.',
        image_path: '/data/Nirvana Activities/Dining.webp',
        link_url: 'https://theappalachianrestaurant.com/'
    },
    shine_girl: {
        title: 'Shine Girl Distillery',
        description: 'A locally loved Sevier County distillery known for unique flavors and regional storytelling.',
        image_path: '/data/Nirvana Activities/Drinks.webp',
        link_url: 'https://www.shinegirl.com/'
    },
    lake_norman_park: {
        title: 'Lake Norman State Park',
        description: 'Features hiking and biking trails, swimming, paddling, camping, and picnic areas for families.',
        image_path: '/data/Shoreside Activities/lake.jpg',
        link_url: 'https://www.ncparks.gov/state-parks/lake-norman-state-park'
    },
    fishing_angling: {
        title: 'Fishing and Angling Spots',
        description: 'Lake Norman is a nationally recognized fishery with guides, ramps, and options for all skill levels.',
        image_path: '/data/Shoreside Activities/Fish.avif',
        link_url: 'https://www.visitlakenorman.org/things-to-do/lake-activities/fishing-guides/'
    },
    birkdale_village: {
        title: 'Birkdale Village and Surrounding Areas',
        description: 'Open-air shopping, dining, seasonal events, and family-friendly entertainment just a short drive away.',
        image_path: '/data/Shoreside Activities/village.jpg',
        link_url: 'https://birkdalevillage.com/'
    },
    downtown_mooresville: {
        title: 'Downtown Mooresville and Historic Districts',
        description: 'Charming cafes, live music, specialty shops, and historic mill districts throughout downtown.',
        image_path: '/data/Shoreside Activities/downtown.jpeg',
        link_url: 'https://www.downtownmooresville.com/'
    }
};

const activityKeysBySlug = {
    nirvana: ['smoky_mountains', 'forbidden_caverns', 'the_appalachian', 'shine_girl'],
    halftime: ['smoky_mountains', 'forbidden_caverns', 'the_appalachian', 'shine_girl'],
    shoreside: ['lake_norman_park', 'fishing_angling', 'birkdale_village', 'downtown_mooresville']
};

// --- HELPERS ---

async function uploadFileToStorage(bucket, filePath, destinationPath) {
    try {
        const fileContent = fs.readFileSync(filePath);
        const contentType = mime.lookup(filePath) || 'application/octet-stream';

        const { error } = await supabase.storage
            .from(bucket)
            .upload(destinationPath, fileContent, {
                contentType,
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(destinationPath);
        return publicUrl;
    } catch (err) {
        console.error(`Failed to upload ${filePath}:`, err.message);
        return null;
    }
}

function ensureNoError(error, context) {
    if (error) {
        throw new Error(`${context}: ${error.message}`);
    }
}

function toPublicFilePath(publicPath) {
    const decodedPath = decodeURIComponent(publicPath).split('?')[0].split('#')[0];
    const relativePath = decodedPath.replace(/^\/+/, '').replace(/[\\/]+/g, path.sep);
    return path.join(PUBLIC_DIR, relativePath);
}

function toDateString(value) {
    if (!value) {
        return new Date().toISOString().slice(0, 10);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
}

function normalizeReviewerName(value) {
    const raw = `${value || ''}`.trim();
    if (!raw) return 'Guest';
    return raw.replace(/^-+\s*/, '').trim() || 'Guest';
}

function parseBedroomCount(bedDetails) {
    const match = `${bedDetails || ''}`.match(/(\d+)\s*Bedrooms?/i);
    return match ? Number.parseInt(match[1], 10) : 0;
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listImageFiles(folderPath) {
    if (!fs.existsSync(folderPath)) return [];
    return fs
        .readdirSync(folderPath)
        .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function sanitizePathSegment(value) {
    return `${value}`
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isHttpUrl(value) {
    return /^https?:\/\//i.test(`${value || ''}`);
}

function isSupabaseBucketPublicUrl(value, bucket) {
    return `${value || ''}`.includes(`/storage/v1/object/public/${bucket}/`);
}

async function resolveImageSource(sourcePath, destinationPath, bucket = PROPERTY_MEDIA_BUCKET) {
    if (!sourcePath || typeof sourcePath !== 'string') return null;
    if (!sourcePath.startsWith('/')) return sourcePath;

    const localPath = toPublicFilePath(sourcePath);
    if (!fs.existsSync(localPath)) {
        console.warn(`  -> Missing local file, skipping upload: ${sourcePath}`);
        return null;
    }

    const uploadedUrl = await uploadFileToStorage(bucket, localPath, destinationPath);
    return uploadedUrl || null;
}

async function resolveReviewAvatar(sourcePath, slug, reviewerName) {
    if (!sourcePath || typeof sourcePath !== 'string') return null;
    if (avatarUrlCache.has(sourcePath)) {
        return avatarUrlCache.get(sourcePath);
    }

    let resolvedUrl = null;
    if (isHttpUrl(sourcePath)) {
        if (isSupabaseBucketPublicUrl(sourcePath, REVIEW_AVATAR_BUCKET)) {
            resolvedUrl = sourcePath;
        } else {
            console.warn(`  -> Skipping review avatar URL outside ${REVIEW_AVATAR_BUCKET}: ${sourcePath}`);
            resolvedUrl = null;
        }
    }

    if (sourcePath.startsWith('/')) {
        const ext = path.extname(decodeURIComponent(sourcePath)) || '.jpg';
        const safeName = sanitizePathSegment(reviewerName || 'guest') || 'guest';
        const destinationPath = `${slug}/reviews/avatars/${safeName}-${Date.now()}${ext}`;
        const uploaded = await resolveImageSource(sourcePath, destinationPath, REVIEW_AVATAR_BUCKET);
        resolvedUrl = uploaded || null;
    }

    avatarUrlCache.set(sourcePath, resolvedUrl);
    return resolvedUrl;
}

async function tableExists(tableName) {
    const { error } = await supabase
        .from(tableName)
        .select('*', { head: true, count: 'exact' });

    if (!error) return true;

    if (
        error.message.includes('Could not find the table') ||
        error.message.includes('does not exist')
    ) {
        return false;
    }

    throw new Error(`Failed checking table ${tableName}: ${error.message}`);
}

async function columnExists(tableName, columnName) {
    const { error } = await supabase
        .from(tableName)
        .select(`id,${columnName}`)
        .limit(1);

    if (!error) return true;

    const message = `${error.message || ''}`.toLowerCase();
    const isMissingColumnError =
        (message.includes('column') && message.includes(columnName.toLowerCase()) && message.includes('does not exist')) ||
        message.includes(`could not find the '${columnName.toLowerCase()}' column`);

    if (isMissingColumnError) return false;

    throw new Error(`Failed checking column ${tableName}.${columnName}: ${error.message}`);
}

async function upsertCuratedImages(propertyId, propertyConfig) {
    const curated = propertyConfig.curated_images || {};
    const requiredSlots = Object.keys(CURATED_SLOT_ORDER);
    for (const slot of requiredSlots) {
        if (!curated[slot]) {
            console.warn(`  -> Missing curated image for slot "${slot}" in ${propertyConfig.slug}`);
            continue;
        }

        const source = curated[slot];
        const fileName = path.basename(decodeURIComponent(source));
        const destinationPath = `${propertyConfig.slug}/curated/${slot}/${fileName}`;
        const url = await resolveImageSource(source, destinationPath);
        if (!url) continue;

        const { error } = await supabase
            .from('property_curated_images')
            .upsert(
                {
                    property_id: propertyId,
                    slot,
                    url,
                    display_order: CURATED_SLOT_ORDER[slot]
                },
                { onConflict: 'property_id,slot' }
            );

        ensureNoError(error, `Failed upserting curated ${slot} image for ${propertyConfig.slug}`);
    }
}

async function replaceGalleryImages(propertyId, propertyConfig) {
    const { error: deleteError } = await supabase
        .from('property_images')
        .delete()
        .eq('property_id', propertyId);
    ensureNoError(deleteError, `Failed clearing existing gallery images for ${propertyConfig.slug}`);

    const folderPath = path.join(PUBLIC_DIR, 'data', propertyConfig.image_folder);
    const galleryFiles = listImageFiles(folderPath);
    if (!galleryFiles.length) {
        console.warn(`  -> No gallery images found in ${folderPath}`);
        return;
    }

    let uploadedCount = 0;
    for (let index = 0; index < galleryFiles.length; index += 1) {
        const file = galleryFiles[index];
        const localFilePath = path.join(folderPath, file);
        const destinationPath = `${propertyConfig.slug}/gallery/${file}`;
        const url = await uploadFileToStorage(PROPERTY_MEDIA_BUCKET, localFilePath, destinationPath);

        if (!url) continue;

        const { error } = await supabase
            .from('property_images')
            .insert({
                property_id: propertyId,
                url,
                category: 'gallery',
                display_order: index + 1
            });
        ensureNoError(error, `Failed inserting gallery image ${file} for ${propertyConfig.slug}`);
        uploadedCount += 1;
    }

    console.log(`  -> Uploaded ${uploadedCount} gallery images from ${propertyConfig.image_folder}`);
}

async function replaceHighlightImages(propertyId, propertyConfig) {
    const { error: deleteError } = await supabase
        .from(HIGHLIGHT_TABLE_NAME)
        .delete()
        .eq('property_id', propertyId);
    ensureNoError(deleteError, `Failed clearing existing highlight images for ${propertyConfig.slug}`);

    const folderPath = path.join(PUBLIC_DIR, 'data', propertyConfig.highlights_folder);
    const highlightFiles = listImageFiles(folderPath);
    if (!highlightFiles.length) {
        console.warn(`  -> No highlight images found in ${folderPath}`);
        return;
    }

    let uploadedCount = 0;
    for (let index = 0; index < highlightFiles.length; index += 1) {
        const file = highlightFiles[index];
        const localFilePath = path.join(folderPath, file);
        const destinationPath = `${propertyConfig.slug}/highlights/${file}`;
        const url = await uploadFileToStorage(PROPERTY_MEDIA_BUCKET, localFilePath, destinationPath);

        if (!url) continue;

        const { error } = await supabase
            .from(HIGHLIGHT_TABLE_NAME)
            .insert({
                property_id: propertyId,
                url,
                display_order: index + 1
            });

        ensureNoError(error, `Failed inserting highlight image ${file} for ${propertyConfig.slug}`);
        uploadedCount += 1;
    }

    console.log(`  -> Uploaded ${uploadedCount} highlight images from ${propertyConfig.highlights_folder}`);
}

async function replaceAmenities(propertyId, propertyConfig) {
    const amenitiesPath = path.join(DATA_DIR, propertyConfig.amenities_file);
    const amenities = readJsonIfExists(amenitiesPath) || [];

    const { error: deleteError } = await supabase
        .from('amenities')
        .delete()
        .eq('property_id', propertyId);
    ensureNoError(deleteError, `Failed clearing amenities for ${propertyConfig.slug}`);

    if (!amenities.length) {
        console.warn(`  -> No amenities found in ${amenitiesPath}`);
        return;
    }

    const amenitiesInsert = amenities.map((amenity) => ({
        property_id: propertyId,
        title: amenity.title,
        description: amenity.description,
        icon_key: amenity.icon_key || amenity.title
    }));

    const { error: insertError } = await supabase.from('amenities').insert(amenitiesInsert);
    ensureNoError(insertError, `Failed inserting amenities for ${propertyConfig.slug}`);
    console.log(`  -> Inserted ${amenitiesInsert.length} amenities`);
}

async function replaceReviews(propertyId, propertyConfig) {
    const reviewsPath = path.join(DATA_DIR, 'reviews', propertyConfig.reviews_file);
    const reviews = readJsonIfExists(reviewsPath) || [];

    const { error: deleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('property_id', propertyId);
    ensureNoError(deleteError, `Failed clearing reviews for ${propertyConfig.slug}`);

    if (!reviews.length) {
        console.warn(`  -> No reviews found in ${reviewsPath}`);
        return;
    }

    const reviewsInsert = [];
    for (const review of reviews) {
        const authorName = normalizeReviewerName(review.author || review.name || 'Guest');
        const rating = Math.max(1, Math.min(5, Number(review.stars || review.rating || 5)));
        const content = `${review.text || review.content || ''}`.trim();
        const date = toDateString(review.date);
        const source = `${review.source || 'direct'}`.trim() || 'direct';
        const avatarInput = review.img || review.avatar || null;
        const avatarUrl = await resolveReviewAvatar(avatarInput, propertyConfig.slug, authorName);

        // Enforce required review fields for consistent rendering.
        if (!content) {
            console.warn(`  -> Skipping review with empty content for ${propertyConfig.slug}`);
            continue;
        }
        if (!avatarUrl) {
            console.warn(`  -> Skipping review missing avatar for ${propertyConfig.slug}, reviewer: ${authorName}`);
            continue;
        }

        reviewsInsert.push({
            property_id: propertyId,
            author_name: authorName,
            rating,
            content,
            source,
            date,
            avatar_url: avatarUrl
        });
    }

    const { error: insertError } = await supabase.from('reviews').insert(reviewsInsert);
    ensureNoError(insertError, `Failed inserting reviews for ${propertyConfig.slug}`);
    console.log(`  -> Inserted ${reviewsInsert.length} reviews`);
}

async function replaceFaqs(propertyIdsBySlug) {
    const faqPath = path.join(DATA_DIR, 'faqData.json');
    const faqData = readJsonIfExists(faqPath);
    if (!faqData) {
        console.warn(`FAQs file missing at ${faqPath}`);
        return;
    }

    const { error: deleteCommonError } = await supabase.from('faqs').delete().is('property_id', null);
    ensureNoError(deleteCommonError, 'Failed clearing common FAQs');

    const commonFaqs = faqData.common || [];
    if (commonFaqs.length) {
        const { error: insertCommonError } = await supabase.from('faqs').insert(
            commonFaqs.map((faq, index) => ({
                property_id: null,
                question: faq.question,
                answer: faq.answer,
                display_order: index + 1
            }))
        );
        ensureNoError(insertCommonError, 'Failed inserting common FAQs');
        console.log(`  -> Inserted ${commonFaqs.length} common FAQs`);
    }

    for (const propertyConfig of propertiesData) {
        const propertyId = propertyIdsBySlug[propertyConfig.slug];
        if (!propertyId) continue;

        const { error: deleteError } = await supabase
            .from('faqs')
            .delete()
            .eq('property_id', propertyId);
        ensureNoError(deleteError, `Failed clearing FAQs for ${propertyConfig.slug}`);

        const propertyFaqs = faqData[propertyConfig.faq_key] || [];
        if (!propertyFaqs.length) continue;

        const { error: insertError } = await supabase.from('faqs').insert(
            propertyFaqs.map((faq, index) => ({
                property_id: propertyId,
                question: faq.question,
                answer: faq.answer,
                display_order: index + 1
            }))
        );
        ensureNoError(insertError, `Failed inserting FAQs for ${propertyConfig.slug}`);
        console.log(`  -> Inserted ${propertyFaqs.length} FAQs for ${propertyConfig.slug}`);
    }
}

async function upsertActivity(activityKey, activity) {
    const sourceName = path.basename(decodeURIComponent(activity.image_path || 'activity-image'));
    const destinationPath = `activities/${sanitizePathSegment(activityKey)}/${sourceName}`;
    const imageUrl = activity.image_path
        ? await resolveImageSource(activity.image_path, destinationPath)
        : null;

    let existingQuery = supabase
        .from('activities')
        .select('id')
        .eq('title', activity.title);

    if (activity.link_url) {
        existingQuery = existingQuery.eq('link_url', activity.link_url);
    } else {
        existingQuery = existingQuery.is('link_url', null);
    }

    const { data: existingRows, error: fetchError } = await existingQuery.limit(1);
    ensureNoError(fetchError, `Failed checking activity ${activityKey}`);

    if (existingRows && existingRows.length) {
        const existingId = existingRows[0].id;
        const { error: updateError } = await supabase
            .from('activities')
            .update({
                title: activity.title,
                description: activity.description,
                image_url: imageUrl,
                link_url: activity.link_url || null
            })
            .eq('id', existingId);

        ensureNoError(updateError, `Failed updating activity ${activityKey}`);
        return existingId;
    }

    const { data: inserted, error: insertError } = await supabase
        .from('activities')
        .insert({
            title: activity.title,
            description: activity.description,
            image_url: imageUrl,
            link_url: activity.link_url || null
        })
        .select('id')
        .single();

    ensureNoError(insertError, `Failed inserting activity ${activityKey}`);
    return inserted.id;
}

async function replacePropertyActivities(propertyIdsBySlug) {
    const activityIdCache = {};

    for (const propertyConfig of propertiesData) {
        const propertyId = propertyIdsBySlug[propertyConfig.slug];
        if (!propertyId) continue;

        const { error: deleteError } = await supabase
            .from('property_activities')
            .delete()
            .eq('property_id', propertyId);
        ensureNoError(deleteError, `Failed clearing property_activities for ${propertyConfig.slug}`);

        const activityKeys = activityKeysBySlug[propertyConfig.slug] || [];
        if (!activityKeys.length) {
            console.warn(`  -> No activities mapped for ${propertyConfig.slug}`);
            continue;
        }

        const mappingRows = [];
        for (const activityKey of activityKeys) {
            const activity = activitiesByKey[activityKey];
            if (!activity) {
                console.warn(`  -> Missing activity definition for key "${activityKey}"`);
                continue;
            }

            if (!activityIdCache[activityKey]) {
                activityIdCache[activityKey] = await upsertActivity(activityKey, activity);
            }

            mappingRows.push({
                property_id: propertyId,
                activity_id: activityIdCache[activityKey]
            });
        }

        if (!mappingRows.length) continue;

        const { error: mapInsertError } = await supabase
            .from('property_activities')
            .insert(mappingRows);
        ensureNoError(mapInsertError, `Failed inserting property_activities for ${propertyConfig.slug}`);
        console.log(`  -> Inserted ${mappingRows.length} activity links for ${propertyConfig.slug}`);
    }
}

async function migrate() {
    console.log('Starting migration...');
    const propertyIdsBySlug = {};

    const hasHighlightsTable = await tableExists(HIGHLIGHT_TABLE_NAME);
    if (!hasHighlightsTable) {
        console.warn(`Warning: ${HIGHLIGHT_TABLE_NAME} table not found. Run supabase_schema.sql and rerun migration for highlights.`);
    }

    const hasBookingUrlColumn = await columnExists('properties', 'booking_url');
    if (!hasBookingUrlColumn) {
        console.warn('Warning: properties.booking_url column not found. Run supabase_schema.sql and rerun migration to store booking URLs in DB.');
    }

    for (const p of propertiesData) {
        console.log(`Processing ${p.slug}...`);
        try {
            const propertyPayload = {
                slug: p.slug,
                name: p.name,
                location: p.location,
                description: p.description,
                guests_max: p.sleeps,
                bedroom_count: p.bedroom_count || parseBedroomCount(p.bed_details),
                bathroom_count: p.bathroom_count,
                bed_details: p.bed_details,
                bath_details: p.bath_details,
                hot_tub: p.hot_tub
            };

            if (hasBookingUrlColumn) {
                propertyPayload.booking_url = p.booking_url || null;
            }

            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .upsert(
                    propertyPayload,
                    { onConflict: 'slug' }
                )
                .select('id, slug')
                .single();

            ensureNoError(propertyError, `Failed upserting property ${p.slug}`);
            const propertyId = property.id;
            propertyIdsBySlug[p.slug] = propertyId;
            console.log(`  -> Property ID: ${propertyId}`);

            await upsertCuratedImages(propertyId, p);
            await replaceGalleryImages(propertyId, p);
            if (hasHighlightsTable) {
                await replaceHighlightImages(propertyId, p);
            }
            await replaceAmenities(propertyId, p);
            await replaceReviews(propertyId, p);
        } catch (error) {
            console.error(`Error processing ${p.slug}: ${error.message}`);
            continue;
        }
    }

    try {
        await replaceFaqs(propertyIdsBySlug);
    } catch (e) {
        console.error('Error with FAQs:', e.message);
    }

    try {
        await replacePropertyActivities(propertyIdsBySlug);
    } catch (e) {
        console.error('Error with activities:', e.message);
    }

    console.log('Migration complete!');
}

migrate();
