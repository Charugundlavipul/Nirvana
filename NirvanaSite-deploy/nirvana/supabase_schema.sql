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

-- 8b. Admin users and role helper
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'superadmin', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

UPDATE admin_users
SET role = 'editor'
WHERE role = 'viewer';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_users'
    ) THEN
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
        ALTER TABLE admin_users
            ADD CONSTRAINT admin_users_role_check
            CHECK (role IN ('owner', 'superadmin', 'editor'));
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE OR REPLACE FUNCTION current_admin_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.admin_users
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

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

-- 9b. Approval workflow (maker-checker)
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    entity_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    before_snapshot JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
    submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    comment TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS before_snapshot JSONB;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS approval_requests_status_idx ON approval_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS approval_requests_entity_idx ON approval_requests(entity_type, entity_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'approval_requests_set_updated_at'
    ) THEN
        CREATE TRIGGER approval_requests_set_updated_at
        BEFORE UPDATE ON approval_requests
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION apply_approval_request(
    p_request_id UUID,
    p_new_status TEXT DEFAULT 'approved',
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    req approval_requests%ROWTYPE;
    v_actor_role TEXT;
    v_new_id UUID;
BEGIN
    v_actor_role := public.current_admin_role();
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('owner', 'superadmin') THEN
        RAISE EXCEPTION 'Only superadmin/owner can approve or reject requests';
    END IF;

    SELECT * INTO req
    FROM approval_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request not found';
    END IF;

    IF req.status <> 'pending' THEN
        RAISE EXCEPTION 'Only pending requests can be processed';
    END IF;

    IF p_new_status = 'rejected' THEN
        UPDATE approval_requests
        SET status = 'rejected',
            approved_by = auth.uid(),
            approved_at = NOW(),
            comment = COALESCE(p_comment, comment),
            updated_at = NOW()
        WHERE id = req.id;
        RETURN jsonb_build_object('ok', true, 'status', 'rejected', 'request_id', req.id);
    END IF;

    IF p_new_status <> 'approved' THEN
        RAISE EXCEPTION 'Unsupported status %, use approved/rejected', p_new_status;
    END IF;

    IF req.entity_type = 'property' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.properties (
                slug, name, booking_url, is_published, location, description,
                guests_max, bedroom_count, bed_details, bathroom_count, bath_details,
                pet_friendly, pet_fee, hot_tub
            ) VALUES (
                req.payload->>'slug',
                req.payload->>'name',
                req.payload->>'booking_url',
                COALESCE((req.payload->>'is_published')::boolean, true),
                req.payload->>'location',
                req.payload->>'description',
                NULLIF(req.payload->>'guests_max', '')::int,
                NULLIF(req.payload->>'bedroom_count', '')::int,
                req.payload->>'bed_details',
                NULLIF(req.payload->>'bathroom_count', '')::numeric,
                req.payload->>'bath_details',
                COALESCE((req.payload->>'pet_friendly')::boolean, false),
                COALESCE(NULLIF(req.payload->>'pet_fee', '')::numeric, 0),
                COALESCE((req.payload->>'hot_tub')::boolean, false)
            );
        ELSIF req.action = 'update' THEN
            UPDATE public.properties
            SET
                slug = req.payload->>'slug',
                name = req.payload->>'name',
                booking_url = req.payload->>'booking_url',
                is_published = COALESCE((req.payload->>'is_published')::boolean, true),
                location = req.payload->>'location',
                description = req.payload->>'description',
                guests_max = NULLIF(req.payload->>'guests_max', '')::int,
                bedroom_count = NULLIF(req.payload->>'bedroom_count', '')::int,
                bed_details = req.payload->>'bed_details',
                bathroom_count = NULLIF(req.payload->>'bathroom_count', '')::numeric,
                bath_details = req.payload->>'bath_details',
                pet_friendly = COALESCE((req.payload->>'pet_friendly')::boolean, false),
                pet_fee = COALESCE(NULLIF(req.payload->>'pet_fee', '')::numeric, 0),
                hot_tub = COALESCE((req.payload->>'hot_tub')::boolean, false),
                updated_at = NOW()
            WHERE id = req.entity_id;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.properties WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported property action %', req.action;
        END IF;
    ELSIF req.entity_type = 'review' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.reviews (
                author_name, rating, content, source, date, avatar_url
            ) VALUES (
                req.payload->>'author_name',
                NULLIF(req.payload->>'rating', '')::int,
                req.payload->>'content',
                COALESCE(NULLIF(req.payload->>'source', ''), 'direct'),
                COALESCE(NULLIF(req.payload->>'date', '')::date, CURRENT_DATE),
                req.payload->>'avatar_url'
            )
            RETURNING id INTO v_new_id;

            INSERT INTO public.property_reviews (property_id, review_id)
            SELECT DISTINCT pid::uuid, v_new_id
            FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
        ELSIF req.action = 'update' THEN
            UPDATE public.reviews
            SET
                author_name = req.payload->>'author_name',
                rating = NULLIF(req.payload->>'rating', '')::int,
                content = req.payload->>'content',
                source = COALESCE(NULLIF(req.payload->>'source', ''), 'direct'),
                date = COALESCE(NULLIF(req.payload->>'date', '')::date, CURRENT_DATE),
                avatar_url = req.payload->>'avatar_url'
            WHERE id = req.entity_id;

            DELETE FROM public.property_reviews WHERE review_id = req.entity_id;
            INSERT INTO public.property_reviews (property_id, review_id)
            SELECT DISTINCT pid::uuid, req.entity_id
            FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.reviews WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported review action %', req.action;
        END IF;
    ELSIF req.entity_type = 'faq' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.faqs (
                question, answer, display_order, is_default
            ) VALUES (
                req.payload->>'question',
                req.payload->>'answer',
                COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0),
                COALESCE((req.payload->>'is_default')::boolean, false)
            )
            RETURNING id INTO v_new_id;

            IF COALESCE((req.payload->>'is_default')::boolean, false) = false THEN
                INSERT INTO public.property_faqs (property_id, faq_id)
                SELECT DISTINCT pid::uuid, v_new_id
                FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
            END IF;
        ELSIF req.action = 'update' THEN
            UPDATE public.faqs
            SET
                question = req.payload->>'question',
                answer = req.payload->>'answer',
                display_order = COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0),
                is_default = COALESCE((req.payload->>'is_default')::boolean, false)
            WHERE id = req.entity_id;

            DELETE FROM public.property_faqs WHERE faq_id = req.entity_id;
            IF COALESCE((req.payload->>'is_default')::boolean, false) = false THEN
                INSERT INTO public.property_faqs (property_id, faq_id)
                SELECT DISTINCT pid::uuid, req.entity_id
                FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
            END IF;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.faqs WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported faq action %', req.action;
        END IF;
    ELSIF req.entity_type = 'activity' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.activities (
                title, description, image_url, link_url
            ) VALUES (
                req.payload->>'title',
                req.payload->>'description',
                req.payload->>'image_url',
                req.payload->>'link_url'
            )
            RETURNING id INTO v_new_id;

            INSERT INTO public.property_activities (property_id, activity_id)
            SELECT DISTINCT pid::uuid, v_new_id
            FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
        ELSIF req.action = 'update' THEN
            UPDATE public.activities
            SET
                title = req.payload->>'title',
                description = req.payload->>'description',
                image_url = req.payload->>'image_url',
                link_url = req.payload->>'link_url'
            WHERE id = req.entity_id;

            DELETE FROM public.property_activities WHERE activity_id = req.entity_id;
            INSERT INTO public.property_activities (property_id, activity_id)
            SELECT DISTINCT pid::uuid, req.entity_id
            FROM jsonb_array_elements_text(COALESCE(req.payload->'property_ids', '[]'::jsonb)) AS pid;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.activities WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported activity action %', req.action;
        END IF;
    ELSIF req.entity_type = 'amenity' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.amenities (
                property_id, title, description, icon_key
            ) VALUES (
                NULLIF(req.payload->>'property_id', '')::uuid,
                req.payload->>'title',
                req.payload->>'description',
                req.payload->>'icon_key'
            );
        ELSIF req.action = 'update' THEN
            UPDATE public.amenities
            SET
                title = req.payload->>'title',
                description = req.payload->>'description',
                icon_key = req.payload->>'icon_key'
            WHERE id = req.entity_id;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.amenities WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported amenity action %', req.action;
        END IF;
    ELSIF req.entity_type = 'property_image' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.property_images (
                property_id, url, category, display_order
            ) VALUES (
                NULLIF(req.payload->>'property_id', '')::uuid,
                req.payload->>'url',
                COALESCE(NULLIF(req.payload->>'category', ''), 'gallery'),
                COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0)
            );
        ELSIF req.action = 'update' THEN
            UPDATE public.property_images
            SET
                url = req.payload->>'url',
                category = COALESCE(NULLIF(req.payload->>'category', ''), 'gallery'),
                display_order = COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0)
            WHERE id = req.entity_id;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.property_images WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported property_image action %', req.action;
        END IF;
    ELSIF req.entity_type = 'property_curated_image' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.property_curated_images (
                property_id, slot, url, display_order
            ) VALUES (
                NULLIF(req.payload->>'property_id', '')::uuid,
                req.payload->>'slot',
                req.payload->>'url',
                COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0)
            )
            ON CONFLICT (property_id, slot) DO UPDATE
            SET
                url = EXCLUDED.url,
                display_order = EXCLUDED.display_order,
                updated_at = NOW();
        ELSIF req.action = 'update' THEN
            UPDATE public.property_curated_images
            SET
                url = req.payload->>'url',
                display_order = COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0),
                updated_at = NOW()
            WHERE id = req.entity_id;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.property_curated_images WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported property_curated_image action %', req.action;
        END IF;
    ELSIF req.entity_type = 'property_highlight_image' THEN
        IF req.action = 'create' THEN
            INSERT INTO public.property_highlight_images (
                property_id, url, display_order
            ) VALUES (
                NULLIF(req.payload->>'property_id', '')::uuid,
                req.payload->>'url',
                COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0)
            );
        ELSIF req.action = 'update' THEN
            UPDATE public.property_highlight_images
            SET
                url = req.payload->>'url',
                display_order = COALESCE(NULLIF(req.payload->>'display_order', '')::int, 0),
                updated_at = NOW()
            WHERE id = req.entity_id;
        ELSIF req.action = 'delete' THEN
            DELETE FROM public.property_highlight_images WHERE id = req.entity_id;
        ELSE
            RAISE EXCEPTION 'Unsupported property_highlight_image action %', req.action;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unsupported entity_type % in apply_approval_request', req.entity_type;
    END IF;

    UPDATE approval_requests
    SET status = 'applied',
        approved_by = auth.uid(),
        approved_at = NOW(),
        comment = COALESCE(p_comment, comment),
        updated_at = NOW()
    WHERE id = req.id;

    RETURN jsonb_build_object('ok', true, 'status', 'applied', 'request_id', req.id);
END;
$$;

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
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

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
        AND tablename = 'approval_requests'
        AND policyname = 'Editors can submit approval requests'
    ) THEN
        CREATE POLICY "Editors can submit approval requests"
        ON approval_requests FOR INSERT
        WITH CHECK (
            auth.role() = 'service_role'
            OR current_admin_role() IN ('owner', 'superadmin', 'editor')
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'approval_requests'
        AND policyname = 'Users can view own approval requests and superadmins see all'
    ) THEN
        CREATE POLICY "Users can view own approval requests and superadmins see all"
        ON approval_requests FOR SELECT
        USING (
            auth.role() = 'service_role'
            OR submitted_by = auth.uid()
            OR current_admin_role() IN ('owner', 'superadmin')
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'approval_requests'
        AND policyname = 'Superadmins can update approval requests'
    ) THEN
        CREATE POLICY "Superadmins can update approval requests"
        ON approval_requests FOR UPDATE
        USING (
            auth.role() = 'service_role'
            OR current_admin_role() IN ('owner', 'superadmin')
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR current_admin_role() IN ('owner', 'superadmin')
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
        AND policyname = 'Admins can view own role'
    ) THEN
        CREATE POLICY "Admins can view own role"
        ON admin_users FOR SELECT
        USING (
            auth.role() = 'service_role'
            OR user_id = auth.uid()
            OR current_admin_role() IN ('owner', 'superadmin')
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
        USING (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
                OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
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
                OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
            )
        )
        WITH CHECK (
            bucket_id IN ('property-assets', 'profile-pictures')
            AND (
                auth.role() = 'service_role'
                OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
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
                OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
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

