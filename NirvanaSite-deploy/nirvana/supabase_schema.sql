-- Idempotent schema for repeated runs in Supabase SQL editor.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Reusable trigger function for updated_at fields.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 1. Properties
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    booking_url TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    location TEXT,
    description TEXT,
    guests_max INT,
    bedroom_count INT,
    bed_details TEXT,
    bathroom_count NUMERIC(3,1),
    bath_details TEXT,
    pet_friendly BOOLEAN DEFAULT FALSE,
    pet_fee NUMERIC(10,2) DEFAULT 0,
    hot_tub BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE properties ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE properties ALTER COLUMN is_published SET DEFAULT TRUE;
UPDATE properties SET is_published = TRUE WHERE is_published IS DISTINCT FROM TRUE;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'properties'
        AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
        AND indexdef ILIKE '%(slug)%'
    ) THEN
        CREATE UNIQUE INDEX properties_slug_uidx ON properties (slug);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'properties_set_updated_at'
    ) THEN
        CREATE TRIGGER properties_set_updated_at
        BEFORE UPDATE ON properties
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- 2. Curated Property Images (strictly one image per slot per property)
-- Slots:
--   home      -> home/feature card image
--   bg        -> background/parallax image
--   secondary -> secondary curated image
CREATE TABLE IF NOT EXISTS property_curated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    slot TEXT NOT NULL CHECK (slot IN ('home', 'bg', 'secondary')),
    url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_curated_images ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE property_curated_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS property_curated_images_property_slot_uidx
    ON property_curated_images (property_id, slot);
CREATE INDEX IF NOT EXISTS property_curated_images_property_id_idx
    ON property_curated_images (property_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'property_curated_images_set_updated_at'
    ) THEN
        CREATE TRIGGER property_curated_images_set_updated_at
        BEFORE UPDATE ON property_curated_images
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- 3. Gallery Images (bulk uploads only)
CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'gallery',
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'gallery';
ALTER TABLE property_images ALTER COLUMN category SET DEFAULT 'gallery';
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE property_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS property_images_property_url_uidx
    ON property_images (property_id, url);
CREATE INDEX IF NOT EXISTS property_images_property_id_idx
    ON property_images (property_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'property_images_set_updated_at'
    ) THEN
        CREATE TRIGGER property_images_set_updated_at
        BEFORE UPDATE ON property_images
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- 4. Highlight Images (separate from gallery for homepage/featured sets)
CREATE TABLE IF NOT EXISTS property_highlight_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_highlight_images ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE property_highlight_images ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS property_highlight_images_property_url_uidx
    ON property_highlight_images (property_id, url);
CREATE INDEX IF NOT EXISTS property_highlight_images_property_id_idx
    ON property_highlight_images (property_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'property_highlight_images_set_updated_at'
    ) THEN
        CREATE TRIGGER property_highlight_images_set_updated_at
        BEFORE UPDATE ON property_highlight_images
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

-- 5. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- @deprecated: Use property_reviews
    author_name TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    source TEXT,
    date DATE DEFAULT CURRENT_DATE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reviews ALTER COLUMN property_id DROP NOT NULL; -- Allow nulls for M:N transition
ALTER TABLE reviews ALTER COLUMN rating SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN content SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN date SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN avatar_url SET NOT NULL;
ALTER TABLE reviews ALTER COLUMN source SET DEFAULT 'direct';

-- 6. FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- @deprecated: Use property_faqs
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE faqs ALTER COLUMN property_id DROP NOT NULL; -- Allow nulls for M:N transition
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- 7. Amenities
CREATE TABLE IF NOT EXISTS amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    icon_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Activities
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS activities_title_idx ON activities (title);

-- 9. Junction Tables (M:N)

-- Property Reviews (Many-to-Many)
CREATE TABLE IF NOT EXISTS property_reviews (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, review_id)
);

-- Property FAQs (Many-to-Many)
CREATE TABLE IF NOT EXISTS property_faqs (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, faq_id)
);

-- Property Activities (Many-to-Many)
CREATE TABLE IF NOT EXISTS property_activities (
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, activity_id)
);

-- Backfill Migration logic (Safe to run repeatedly)
-- 1. Reviews Migration
INSERT INTO property_reviews (property_id, review_id)
SELECT property_id, id FROM reviews WHERE property_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. FAQs Migration
INSERT INTO property_faqs (property_id, faq_id)
SELECT property_id, id FROM faqs WHERE property_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Backfill curated slots from legacy category values (safe to re-run).
INSERT INTO property_curated_images (property_id, slot, url, display_order, created_at, updated_at)
SELECT
    pi.property_id,
    CASE LOWER(TRIM(COALESCE(pi.category, '')))
        WHEN 'primary' THEN 'home'
        WHEN 'home' THEN 'home'
        WHEN 'hero' THEN 'bg'
        WHEN 'background' THEN 'bg'
        WHEN 'bg' THEN 'bg'
        WHEN 'secondary' THEN 'secondary'
    END AS slot,
    pi.url,
    COALESCE(pi.display_order, 0),
    COALESCE(pi.created_at, NOW()),
    NOW()
FROM property_images pi
WHERE pi.property_id IS NOT NULL
  AND LOWER(TRIM(COALESCE(pi.category, ''))) IN ('primary', 'home', 'hero', 'background', 'bg', 'secondary')
ON CONFLICT (property_id, slot) DO UPDATE
SET
    url = EXCLUDED.url,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Keep gallery table clean after backfill.
DELETE FROM property_images
WHERE LOWER(TRIM(COALESCE(category, ''))) IN ('primary', 'home', 'hero', 'background', 'bg', 'secondary');

UPDATE property_images
SET category = 'gallery'
WHERE LOWER(TRIM(COALESCE(category, ''))) <> 'gallery';

-- RLS: public read-only policies.
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_curated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_highlight_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'properties'
        AND policyname = 'Public properties are viewable by everyone'
    ) THEN
        CREATE POLICY "Public properties are viewable by everyone"
        ON properties FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'admin_users'
        AND policyname = 'Admins can view own role'
    ) THEN
        CREATE POLICY "Admins can view own role"
        ON admin_users FOR SELECT
        USING (
            auth.role() = 'service_role'
            OR user_id = auth.uid()
            OR current_admin_role() = 'owner'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'admin_users'
        AND policyname = 'Owners can manage admin users'
    ) THEN
        CREATE POLICY "Owners can manage admin users"
        ON admin_users FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() = 'owner')
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() = 'owner');
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'properties'
        AND policyname = 'Admins can manage properties'
    ) THEN
        CREATE POLICY "Admins can manage properties"
        ON properties FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_curated_images'
        AND policyname = 'Admins can manage curated images'
    ) THEN
        CREATE POLICY "Admins can manage curated images"
        ON property_curated_images FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_images'
        AND policyname = 'Admins can manage gallery images'
    ) THEN
        CREATE POLICY "Admins can manage gallery images"
        ON property_images FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_highlight_images'
        AND policyname = 'Admins can manage highlight images'
    ) THEN
        CREATE POLICY "Admins can manage highlight images"
        ON property_highlight_images FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'reviews'
        AND policyname = 'Admins can manage reviews'
    ) THEN
        CREATE POLICY "Admins can manage reviews"
        ON reviews FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'faqs'
        AND policyname = 'Admins can manage faqs'
    ) THEN
        CREATE POLICY "Admins can manage faqs"
        ON faqs FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'amenities'
        AND policyname = 'Admins can manage amenities'
    ) THEN
        CREATE POLICY "Admins can manage amenities"
        ON amenities FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'activities'
        AND policyname = 'Admins can manage activities'
    ) THEN
        CREATE POLICY "Admins can manage activities"
        ON activities FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_activities'
        AND policyname = 'Admins can manage property activities'
    ) THEN
        CREATE POLICY "Admins can manage property activities"
        ON property_activities FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

-- FIX: Add policies for property_reviews and property_faqs which were missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_reviews'
        AND policyname = 'Public property reviews are viewable by everyone'
    ) THEN
        CREATE POLICY "Public property reviews are viewable by everyone"
        ON property_reviews FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_reviews'
        AND policyname = 'Admins can manage property reviews'
    ) THEN
        CREATE POLICY "Admins can manage property reviews"
        ON property_reviews FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_faqs'
        AND policyname = 'Public property faqs are viewable by everyone'
    ) THEN
        CREATE POLICY "Public property faqs are viewable by everyone"
        ON property_faqs FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_faqs'
        AND policyname = 'Admins can manage property faqs'
    ) THEN
        CREATE POLICY "Admins can manage property faqs"
        ON property_faqs FOR ALL
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'editor'));
    END IF;
END;
$$;

-- Ensure required buckets exist and remain public-readable.
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-assets', 'property-assets', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = EXCLUDED.public;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Public read property and profile images'
    ) THEN
        CREATE POLICY "Public read property and profile images"
        ON storage.objects FOR SELECT
        USING (bucket_id IN ('property-assets', 'profile-pictures'));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Admins upload property and profile images'
    ) THEN
        CREATE POLICY "Admins upload property and profile images"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id IN ('property-assets', 'profile-pictures')
            AND (
                auth.role() = 'service_role'
                OR public.current_admin_role() IN ('owner', 'editor')
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Admins update property and profile images'
    ) THEN
        CREATE POLICY "Admins update property and profile images"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id IN ('property-assets', 'profile-pictures')
            AND (
                auth.role() = 'service_role'
                OR public.current_admin_role() IN ('owner', 'editor')
            )
        )
        WITH CHECK (
            bucket_id IN ('property-assets', 'profile-pictures')
            AND (
                auth.role() = 'service_role'
                OR public.current_admin_role() IN ('owner', 'editor')
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Admins delete property and profile images'
    ) THEN
        CREATE POLICY "Admins delete property and profile images"
        ON storage.objects FOR DELETE
        USING (
            bucket_id IN ('property-assets', 'profile-pictures')
            AND (
                auth.role() = 'service_role'
                OR public.current_admin_role() IN ('owner', 'editor')
            )
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_curated_images'
        AND policyname = 'Public curated images are viewable by everyone'
    ) THEN
        CREATE POLICY "Public curated images are viewable by everyone"
        ON property_curated_images FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_images'
        AND policyname = 'Public gallery images are viewable by everyone'
    ) THEN
        CREATE POLICY "Public gallery images are viewable by everyone"
        ON property_images FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_highlight_images'
        AND policyname = 'Public highlight images are viewable by everyone'
    ) THEN
        CREATE POLICY "Public highlight images are viewable by everyone"
        ON property_highlight_images FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'reviews'
        AND policyname = 'Public reviews are viewable by everyone'
    ) THEN
        CREATE POLICY "Public reviews are viewable by everyone"
        ON reviews FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'faqs'
        AND policyname = 'Public faqs are viewable by everyone'
    ) THEN
        CREATE POLICY "Public faqs are viewable by everyone"
        ON faqs FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'amenities'
        AND policyname = 'Public amenities are viewable by everyone'
    ) THEN
        CREATE POLICY "Public amenities are viewable by everyone"
        ON amenities FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'activities'
        AND policyname = 'Public activities are viewable by everyone'
    ) THEN
        CREATE POLICY "Public activities are viewable by everyone"
        ON activities FOR SELECT USING (true);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'property_activities'
        AND policyname = 'Public property activities are viewable by everyone'
    ) THEN
        CREATE POLICY "Public property activities are viewable by everyone"
        ON property_activities FOR SELECT USING (true);
    END IF;
END;
$$;
