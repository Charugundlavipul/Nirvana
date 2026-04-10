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
    hospitable_property_id TEXT,
    video_url TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    location TEXT,
    description TEXT,
    guests_max INT,
    bedroom_count INT,
    bed_details TEXT,
    full_bath_count INT DEFAULT 0,
    half_bath_count INT DEFAULT 0,
    bath_details TEXT,
    pet_friendly BOOLEAN DEFAULT FALSE,
    pet_fee NUMERIC(10,2) DEFAULT 0,
    hot_tub BOOLEAN DEFAULT FALSE,
    spaces JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE properties ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS hospitable_property_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS spaces JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS full_bath_count INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS half_bath_count INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathroom_count NUMERIC(3,1);
ALTER TABLE properties ALTER COLUMN is_published SET DEFAULT TRUE;
ALTER TABLE properties ALTER COLUMN spaces SET DEFAULT '[]'::jsonb;
ALTER TABLE properties ALTER COLUMN full_bath_count SET DEFAULT 0;
ALTER TABLE properties ALTER COLUMN half_bath_count SET DEFAULT 0;
UPDATE properties
SET hospitable_property_id = NULLIF(LOWER(BTRIM(hospitable_property_id)), '')
WHERE hospitable_property_id IS NOT NULL;
UPDATE properties SET is_published = TRUE WHERE is_published IS DISTINCT FROM TRUE;
UPDATE properties SET spaces = '[]'::jsonb WHERE spaces IS NULL;
UPDATE properties
SET
    full_bath_count = COALESCE(full_bath_count, FLOOR(bathroom_count)::int),
    half_bath_count = COALESCE(
        half_bath_count,
        CASE
            WHEN bathroom_count IS NULL THEN NULL
            WHEN bathroom_count - FLOOR(bathroom_count) >= 0.5 THEN 1
            ELSE 0
        END
    )
WHERE bathroom_count IS NOT NULL
  AND (full_bath_count IS NULL OR half_bath_count IS NULL);
UPDATE properties
SET
    full_bath_count = COALESCE(full_bath_count, 0),
    half_bath_count = COALESCE(half_bath_count, 0)
WHERE full_bath_count IS NULL OR half_bath_count IS NULL;
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
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'properties'
        AND indexname = 'properties_hospitable_property_id_uidx'
    ) THEN
        CREATE UNIQUE INDEX properties_hospitable_property_id_uidx
            ON properties (LOWER(hospitable_property_id))
            WHERE hospitable_property_id IS NOT NULL;
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
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'revision_requested')),
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

-- Migration: ensure status check constraint includes revision_requested (for existing DBs)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'approval_requests' AND constraint_name = 'approval_requests_status_check'
    ) THEN
        ALTER TABLE approval_requests DROP CONSTRAINT approval_requests_status_check;
    END IF;
    ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'revision_requested'));
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

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
    v_slug TEXT;
    v_base_slug TEXT;
    v_suffix INT;
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

    IF req.status NOT IN ('pending', 'revision_requested') THEN
        RAISE EXCEPTION 'Only pending or revision_requested requests can be processed';
    END IF;

    -- Handle revision_requested: save comment, don't apply changes
    IF p_new_status = 'revision_requested' THEN
        UPDATE approval_requests
        SET status = 'revision_requested',
            approved_by = auth.uid(),
            approved_at = NOW(),
            comment = COALESCE(p_comment, comment),
            updated_at = NOW()
        WHERE id = req.id;
        RETURN jsonb_build_object('ok', true, 'status', 'revision_requested', 'request_id', req.id);
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
        RAISE EXCEPTION 'Unsupported status %, use approved/rejected/revision_requested', p_new_status;
    END IF;

    IF req.entity_type = 'property' THEN
        IF req.action = 'create' THEN
            -- Deduplicate slug: if "my-cabin" exists, try "my-cabin-2", "my-cabin-3", etc.
            v_base_slug := req.payload->>'slug';
            v_slug := v_base_slug;
            v_suffix := 2;
            WHILE EXISTS (SELECT 1 FROM public.properties WHERE slug = v_slug) LOOP
                v_slug := v_base_slug || '-' || v_suffix;
                v_suffix := v_suffix + 1;
            END LOOP;

            INSERT INTO public.properties (
                slug, name, booking_url, hospitable_property_id, video_url, is_published, location, description,
                guests_max, bedroom_count, bed_details, full_bath_count, half_bath_count, bath_details,
                pet_friendly, pet_fee, hot_tub, spaces
            ) VALUES (
                v_slug,
                req.payload->>'name',
                req.payload->>'booking_url',
                NULLIF(LOWER(BTRIM(req.payload->>'hospitable_property_id')), ''),
                req.payload->>'video_url',
                COALESCE((req.payload->>'is_published')::boolean, true),
                req.payload->>'location',
                req.payload->>'description',
                NULLIF(req.payload->>'guests_max', '')::int,
                NULLIF(req.payload->>'bedroom_count', '')::int,
                req.payload->>'bed_details',
                COALESCE(
                    NULLIF(req.payload->>'full_bath_count', '')::int,
                    FLOOR(NULLIF(req.payload->>'bathroom_count', '')::numeric)::int,
                    0
                ),
                COALESCE(
                    NULLIF(req.payload->>'half_bath_count', '')::int,
                    CASE
                        WHEN NULLIF(req.payload->>'bathroom_count', '') IS NULL THEN NULL
                        WHEN NULLIF(req.payload->>'bathroom_count', '')::numeric - FLOOR(NULLIF(req.payload->>'bathroom_count', '')::numeric) >= 0.5 THEN 1
                        ELSE 0
                    END,
                    0
                ),
                req.payload->>'bath_details',
                COALESCE((req.payload->>'pet_friendly')::boolean, false),
                COALESCE(NULLIF(req.payload->>'pet_fee', '')::numeric, 0),
                COALESCE((req.payload->>'hot_tub')::boolean, false),
                COALESCE(req.payload->'spaces', '[]'::jsonb)
            );
        ELSIF req.action = 'update' THEN
            UPDATE public.properties
            SET
                slug = req.payload->>'slug',
                name = req.payload->>'name',
                booking_url = req.payload->>'booking_url',
                hospitable_property_id = NULLIF(LOWER(BTRIM(req.payload->>'hospitable_property_id')), ''),
                video_url = req.payload->>'video_url',
                is_published = COALESCE((req.payload->>'is_published')::boolean, true),
                location = req.payload->>'location',
                description = req.payload->>'description',
                guests_max = NULLIF(req.payload->>'guests_max', '')::int,
                bedroom_count = NULLIF(req.payload->>'bedroom_count', '')::int,
                bed_details = req.payload->>'bed_details',
                full_bath_count = COALESCE(
                    NULLIF(req.payload->>'full_bath_count', '')::int,
                    FLOOR(NULLIF(req.payload->>'bathroom_count', '')::numeric)::int,
                    0
                ),
                half_bath_count = COALESCE(
                    NULLIF(req.payload->>'half_bath_count', '')::int,
                    CASE
                        WHEN NULLIF(req.payload->>'bathroom_count', '') IS NULL THEN NULL
                        WHEN NULLIF(req.payload->>'bathroom_count', '')::numeric - FLOOR(NULLIF(req.payload->>'bathroom_count', '')::numeric) >= 0.5 THEN 1
                        ELSE 0
                    END,
                    0
                ),
                bath_details = req.payload->>'bath_details',
                pet_friendly = COALESCE((req.payload->>'pet_friendly')::boolean, false),
                pet_fee = COALESCE(NULLIF(req.payload->>'pet_fee', '')::numeric, 0),
                hot_tub = COALESCE((req.payload->>'hot_tub')::boolean, false),
                spaces = COALESCE(req.payload->'spaces', '[]'::jsonb),
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
    DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON properties;
    CREATE POLICY "Public properties are viewable by everyone"
    ON properties FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Editors can submit approval requests" ON approval_requests;
    CREATE POLICY "Editors can submit approval requests"
    ON approval_requests FOR INSERT
        WITH CHECK (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own approval requests and superadmins see all" ON approval_requests;
    CREATE POLICY "Users can view own approval requests and superadmins see all"
    ON approval_requests FOR SELECT
        USING (
            auth.role() = 'service_role'
            OR submitted_by = auth.uid()
            OR public.current_admin_role() IN ('owner', 'superadmin')
        );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Superadmins can update approval requests" ON approval_requests;
    CREATE POLICY "Superadmins can update approval requests"
    ON approval_requests FOR UPDATE
        USING (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin')
        )
        WITH CHECK (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin')
        );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can view own role" ON admin_users;
    CREATE POLICY "Admins can view own role"
    ON admin_users FOR SELECT
        USING (
            auth.role() = 'service_role'
            OR user_id = auth.uid()
            OR public.current_admin_role() IN ('owner', 'superadmin')
        );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can manage admin users" ON admin_users;
    DROP POLICY IF EXISTS "Superadmins can view all admin users" ON admin_users;
    DROP POLICY IF EXISTS "Superadmins can add admin users" ON admin_users;
    DROP POLICY IF EXISTS "Superadmins can delete admin users" ON admin_users;

    -- 1. Owners have full control over all admin users
    CREATE POLICY "Owners can manage admin users"
    ON admin_users FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() = 'owner')
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() = 'owner');

    -- 2. Superadmins can view all admin users
    CREATE POLICY "Superadmins can view all admin users"
    ON admin_users FOR SELECT
        USING (public.current_admin_role() = 'superadmin');

    -- 3. Superadmins can add editors or other superadmins (but never owners)
    CREATE POLICY "Superadmins can add admin users"
    ON admin_users FOR INSERT
        WITH CHECK (
            public.current_admin_role() = 'superadmin' 
            AND role IN ('editor', 'superadmin')
        );

    -- 4. Superadmins can remove editors or other superadmins (but never owners)
    CREATE POLICY "Superadmins can delete admin users"
    ON admin_users FOR DELETE
        USING (
            public.current_admin_role() = 'superadmin' 
            AND role IN ('editor', 'superadmin')
        );

    -- Note: Superadmins explicitly lack UPDATE permission to prevent role changes,
    -- and their INSERT/DELETE policies prevent them from touching owner accounts.
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage properties" ON properties;
    CREATE POLICY "Admins can manage properties"
    ON properties FOR ALL
    USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
    WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage curated images" ON property_curated_images;
    CREATE POLICY "Admins can manage curated images"
    ON property_curated_images FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage gallery images" ON property_images;
    CREATE POLICY "Admins can manage gallery images"
    ON property_images FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage highlight images" ON property_highlight_images;
    CREATE POLICY "Admins can manage highlight images"
    ON property_highlight_images FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage reviews" ON reviews;
    CREATE POLICY "Admins can manage reviews"
    ON reviews FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage faqs" ON faqs;
    CREATE POLICY "Admins can manage faqs"
    ON faqs FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage amenities" ON amenities;
    CREATE POLICY "Admins can manage amenities"
    ON amenities FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage activities" ON activities;
    CREATE POLICY "Admins can manage activities"
    ON activities FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage property activities" ON property_activities;
    CREATE POLICY "Admins can manage property activities"
    ON property_activities FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

-- FIX: Add policies for property_reviews and property_faqs which were missing
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public property reviews are viewable by everyone" ON property_reviews;
    CREATE POLICY "Public property reviews are viewable by everyone"
    ON property_reviews FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage property reviews" ON property_reviews;
    CREATE POLICY "Admins can manage property reviews"
    ON property_reviews FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public property faqs are viewable by everyone" ON property_faqs;
    CREATE POLICY "Public property faqs are viewable by everyone"
    ON property_faqs FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage property faqs" ON property_faqs;
    CREATE POLICY "Admins can manage property faqs"
    ON property_faqs FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
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
    DROP POLICY IF EXISTS "Public read property and profile images" ON storage.objects;
    CREATE POLICY "Public read property and profile images"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('property-assets', 'profile-pictures'));
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins upload property and profile images" ON storage.objects;
    CREATE POLICY "Admins upload property and profile images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id IN ('property-assets', 'profile-pictures')
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins update property and profile images" ON storage.objects;
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
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins delete property and profile images" ON storage.objects;
    CREATE POLICY "Admins delete property and profile images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id IN ('property-assets', 'profile-pictures')
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public curated images are viewable by everyone" ON property_curated_images;
    CREATE POLICY "Public curated images are viewable by everyone"
    ON property_curated_images FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public gallery images are viewable by everyone" ON property_images;
    CREATE POLICY "Public gallery images are viewable by everyone"
    ON property_images FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public highlight images are viewable by everyone" ON property_highlight_images;
    CREATE POLICY "Public highlight images are viewable by everyone"
    ON property_highlight_images FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON reviews;
    CREATE POLICY "Public reviews are viewable by everyone"
    ON reviews FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public faqs are viewable by everyone" ON faqs;
    CREATE POLICY "Public faqs are viewable by everyone"
    ON faqs FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public amenities are viewable by everyone" ON amenities;
    CREATE POLICY "Public amenities are viewable by everyone"
    ON amenities FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public activities are viewable by everyone" ON activities;
    CREATE POLICY "Public activities are viewable by everyone"
    ON activities FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public property activities are viewable by everyone" ON property_activities;
    CREATE POLICY "Public property activities are viewable by everyone"
    ON property_activities FOR SELECT USING (true);
    
END;
$$;

-- 10. Site Content (Legal Pages: T&C, Privacy Policy)
CREATE TABLE IF NOT EXISTS site_content (
    key TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    effective_date DATE,
    last_updated DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_content ADD COLUMN IF NOT EXISTS effective_date DATE;
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS last_updated DATE;

INSERT INTO site_content (key, title, content, effective_date, last_updated) VALUES
    ('terms_and_conditions', 'Terms and Conditions', '', '2026-02-27', '2026-02-27'),
    ('privacy_policy', 'Privacy Policy', '', '2026-02-27', '2026-02-27')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public site content is viewable by everyone" ON site_content;
    CREATE POLICY "Public site content is viewable by everyone"
    ON site_content FOR SELECT USING (true);
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage site content" ON site_content;
    CREATE POLICY "Admins can manage site content"
    ON site_content FOR ALL
        USING (public.current_admin_role() IN ('owner', 'superadmin'));
END;
$$;

-- 11. Alert Subscribers (Email subscription list)
CREATE TABLE IF NOT EXISTS alert_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    unsubscribe_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    privacy_accepted BOOLEAN NOT NULL DEFAULT true,
    subscribed_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

ALTER TABLE alert_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (public insert)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can subscribe" ON alert_subscribers;
    CREATE POLICY "Anyone can subscribe"
    ON alert_subscribers FOR INSERT
        WITH CHECK (true);
    
END;
$$;

-- Public can update via unsubscribe token (for unsubscribe flow)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Unsubscribe via token" ON alert_subscribers;
    CREATE POLICY "Unsubscribe via token"
    ON alert_subscribers FOR UPDATE
        USING (true)
        WITH CHECK (true);
    
END;
$$;

-- Authenticated admins can read all subscribers
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can read all subscribers" ON alert_subscribers;
    CREATE POLICY "Admins can read all subscribers"
    ON alert_subscribers FOR SELECT
        USING (auth.role() = 'authenticated');
    
END;
$$;

-- Authenticated admins can delete subscribers
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can delete subscribers" ON alert_subscribers;
    CREATE POLICY "Admins can delete subscribers"
    ON alert_subscribers FOR DELETE
        USING (auth.role() = 'authenticated');
    
END;
$$;

-- 12. Knowledge Hubs, sources, AI sync state, and RAG storage
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_hubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope_type TEXT NOT NULL CHECK (scope_type IN ('general', 'property')),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'ready', 'error', 'stale')),
    source_fingerprint TEXT,
    last_synced_source_fingerprint TEXT,
    last_synced_at TIMESTAMPTZ,
    last_sync_error TEXT,
    last_sync_model TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS source_fingerprint TEXT;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS last_synced_source_fingerprint TEXT;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS last_sync_error TEXT;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS last_sync_model TEXT;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE knowledge_hubs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE knowledge_hubs DROP CONSTRAINT IF EXISTS knowledge_hubs_scope_type_check;
    ALTER TABLE knowledge_hubs
        ADD CONSTRAINT knowledge_hubs_scope_type_check
        CHECK (scope_type IN ('general', 'property'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

DO $$
BEGIN
    ALTER TABLE knowledge_hubs DROP CONSTRAINT IF EXISTS knowledge_hubs_sync_status_check;
    ALTER TABLE knowledge_hubs
        ADD CONSTRAINT knowledge_hubs_sync_status_check
        CHECK (sync_status IN ('idle', 'syncing', 'ready', 'error', 'stale'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'knowledge_hubs'
        AND indexname = 'knowledge_hubs_general_uidx'
    ) THEN
        CREATE UNIQUE INDEX knowledge_hubs_general_uidx
            ON knowledge_hubs ((scope_type))
            WHERE scope_type = 'general' AND property_id IS NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'knowledge_hubs'
        AND indexname = 'knowledge_hubs_property_uidx'
    ) THEN
        CREATE UNIQUE INDEX knowledge_hubs_property_uidx
            ON knowledge_hubs (property_id)
            WHERE scope_type = 'property' AND property_id IS NOT NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'knowledge_hubs_set_updated_at'
    ) THEN
        CREATE TRIGGER knowledge_hubs_set_updated_at
        BEFORE UPDATE ON knowledge_hubs
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES knowledge_hubs(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('system_snapshot', 'manual_note', 'upload')),
    source_key TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    mime_type TEXT,
    file_name TEXT,
    storage_bucket TEXT,
    storage_path TEXT,
    content_text TEXT NOT NULL DEFAULT '',
    checksum TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'processing', 'archived', 'error')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_processed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS source_key TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS storage_bucket TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS content_text TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS checksum TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE knowledge_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE knowledge_sources DROP CONSTRAINT IF EXISTS knowledge_sources_source_type_check;
    ALTER TABLE knowledge_sources
        ADD CONSTRAINT knowledge_sources_source_type_check
        CHECK (source_type IN ('system_snapshot', 'manual_note', 'upload'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

DO $$
BEGIN
    ALTER TABLE knowledge_sources DROP CONSTRAINT IF EXISTS knowledge_sources_status_check;
    ALTER TABLE knowledge_sources
        ADD CONSTRAINT knowledge_sources_status_check
        CHECK (status IN ('active', 'processing', 'archived', 'error'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS knowledge_sources_hub_status_idx
    ON knowledge_sources (hub_id, status, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'knowledge_sources'
        AND indexname = 'knowledge_sources_hub_source_key_uidx'
    ) THEN
        CREATE UNIQUE INDEX knowledge_sources_hub_source_key_uidx
            ON knowledge_sources (hub_id, source_key)
            WHERE source_key IS NOT NULL;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'knowledge_sources_set_updated_at'
    ) THEN
        CREATE TRIGGER knowledge_sources_set_updated_at
        BEFORE UPDATE ON knowledge_sources
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS knowledge_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES knowledge_hubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    content_markdown TEXT NOT NULL DEFAULT '',
    source_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    section_origin TEXT NOT NULL DEFAULT 'ai' CHECK (section_origin IN ('manual', 'ai', 'hybrid', 'system')),
    display_order INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS content_markdown TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS source_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS section_origin TEXT NOT NULL DEFAULT 'ai';
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;
ALTER TABLE knowledge_sections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE knowledge_sections DROP CONSTRAINT IF EXISTS knowledge_sections_section_origin_check;
    ALTER TABLE knowledge_sections
        ADD CONSTRAINT knowledge_sections_section_origin_check
        CHECK (section_origin IN ('manual', 'ai', 'hybrid', 'system'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sections_hub_slug_uidx
    ON knowledge_sections (hub_id, slug);
CREATE INDEX IF NOT EXISTS knowledge_sections_hub_order_idx
    ON knowledge_sections (hub_id, is_archived, display_order, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'knowledge_sections_set_updated_at'
    ) THEN
        CREATE TRIGGER knowledge_sections_set_updated_at
        BEFORE UPDATE ON knowledge_sections
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS knowledge_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES knowledge_hubs(id) ON DELETE CASCADE,
    section_id UUID REFERENCES knowledge_sections(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    question_origin TEXT NOT NULL DEFAULT 'ai' CHECK (question_origin IN ('manual', 'ai', 'hybrid', 'system')),
    display_order INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS source_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS question_origin TEXT NOT NULL DEFAULT 'ai';
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS last_generated_at TIMESTAMPTZ;
ALTER TABLE knowledge_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE knowledge_questions DROP CONSTRAINT IF EXISTS knowledge_questions_question_origin_check;
    ALTER TABLE knowledge_questions
        ADD CONSTRAINT knowledge_questions_question_origin_check
        CHECK (question_origin IN ('manual', 'ai', 'hybrid', 'system'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS knowledge_questions_hub_section_idx
    ON knowledge_questions (hub_id, section_id, is_archived, display_order, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'knowledge_questions_set_updated_at'
    ) THEN
        CREATE TRIGGER knowledge_questions_set_updated_at
        BEFORE UPDATE ON knowledge_questions
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS knowledge_sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES knowledge_hubs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    trigger_source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
    source_count INT NOT NULL DEFAULT 0,
    section_count INT NOT NULL DEFAULT 0,
    question_count INT NOT NULL DEFAULT 0,
    chunk_count INT NOT NULL DEFAULT 0,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS trigger_source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS source_count INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS section_count INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS question_count INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS chunk_count INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE knowledge_sync_runs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
    ALTER TABLE knowledge_sync_runs DROP CONSTRAINT IF EXISTS knowledge_sync_runs_status_check;
    ALTER TABLE knowledge_sync_runs
        ADD CONSTRAINT knowledge_sync_runs_status_check
        CHECK (status IN ('running', 'completed', 'failed'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS knowledge_sync_runs_hub_started_idx
    ON knowledge_sync_runs (hub_id, started_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hub_id UUID NOT NULL REFERENCES knowledge_hubs(id) ON DELETE CASCADE,
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    section_id UUID REFERENCES knowledge_sections(id) ON DELETE CASCADE,
    question_id UUID REFERENCES knowledge_questions(id) ON DELETE CASCADE,
    chunk_type TEXT NOT NULL CHECK (chunk_type IN ('source', 'section', 'question')),
    chunk_index INT NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    token_estimate INT NOT NULL DEFAULT 0,
    checksum TEXT,
    embedding vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES knowledge_sections(id) ON DELETE CASCADE;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES knowledge_questions(id) ON DELETE CASCADE;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS token_estimate INT NOT NULL DEFAULT 0;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS checksum TEXT;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    ALTER TABLE knowledge_chunks DROP CONSTRAINT IF EXISTS knowledge_chunks_chunk_type_check;
    ALTER TABLE knowledge_chunks
        ADD CONSTRAINT knowledge_chunks_chunk_type_check
        CHECK (chunk_type IN ('source', 'section', 'question'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS knowledge_chunks_hub_type_idx
    ON knowledge_chunks (hub_id, chunk_type, created_at DESC);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx
    ON knowledge_chunks (source_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_section_idx
    ON knowledge_chunks (section_id, chunk_index);
CREATE INDEX IF NOT EXISTS knowledge_chunks_question_idx
    ON knowledge_chunks (question_id, chunk_index);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'knowledge_chunks'
        AND indexname = 'knowledge_chunks_embedding_idx'
    ) THEN
        CREATE INDEX knowledge_chunks_embedding_idx
            ON knowledge_chunks
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'knowledge_chunks_set_updated_at'
    ) THEN
        CREATE TRIGGER knowledge_chunks_set_updated_at
        BEFORE UPDATE ON knowledge_chunks
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding vector(768),
    requested_hub_ids UUID[] DEFAULT NULL,
    match_threshold FLOAT DEFAULT 0.55,
    match_count INT DEFAULT 12
)
RETURNS TABLE (
    id UUID,
    hub_id UUID,
    source_id UUID,
    section_id UUID,
    question_id UUID,
    chunk_type TEXT,
    title TEXT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        kc.id,
        kc.hub_id,
        kc.source_id,
        kc.section_id,
        kc.question_id,
        kc.chunk_type,
        kc.title,
        kc.content,
        kc.metadata,
        1 - (kc.embedding <=> query_embedding) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
      AND (requested_hub_ids IS NULL OR kc.hub_id = ANY(requested_hub_ids))
      AND 1 - (kc.embedding <=> query_embedding) >= match_threshold
    ORDER BY kc.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 50);
$$;

ALTER TABLE knowledge_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge hubs" ON knowledge_hubs;
    CREATE POLICY "Admins can manage knowledge hubs"
    ON knowledge_hubs FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge sources" ON knowledge_sources;
    CREATE POLICY "Admins can manage knowledge sources"
    ON knowledge_sources FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge sections" ON knowledge_sections;
    CREATE POLICY "Admins can manage knowledge sections"
    ON knowledge_sections FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge questions" ON knowledge_questions;
    CREATE POLICY "Admins can manage knowledge questions"
    ON knowledge_questions FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge sync runs" ON knowledge_sync_runs;
    CREATE POLICY "Admins can manage knowledge sync runs"
    ON knowledge_sync_runs FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage knowledge chunks" ON knowledge_chunks;
    CREATE POLICY "Admins can manage knowledge chunks"
    ON knowledge_chunks FOR ALL
        USING (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'))
        WITH CHECK (auth.role() = 'service_role' OR public.current_admin_role() IN ('owner', 'superadmin', 'editor'));
    
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-sources', 'knowledge-sources', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, public = EXCLUDED.public;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins read knowledge source files" ON storage.objects;
    CREATE POLICY "Admins read knowledge source files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'knowledge-sources'
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins upload knowledge source files" ON storage.objects;
    CREATE POLICY "Admins upload knowledge source files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'knowledge-sources'
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins update knowledge source files" ON storage.objects;
    CREATE POLICY "Admins update knowledge source files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'knowledge-sources'
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    )
    WITH CHECK (
        bucket_id = 'knowledge-sources'
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins delete knowledge source files" ON storage.objects;
    CREATE POLICY "Admins delete knowledge source files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'knowledge-sources'
        AND (
            auth.role() = 'service_role'
            OR public.current_admin_role() IN ('owner', 'superadmin', 'editor')
        )
    );
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM knowledge_hubs
        WHERE scope_type = 'general'
        AND property_id IS NULL
    ) THEN
        INSERT INTO knowledge_hubs (scope_type, property_id, title, description)
        VALUES (
            'general',
            NULL,
            'General Knowledge Base',
            'Shared guidance and context that applies across properties.'
        );
    END IF;
END;
$$;

UPDATE knowledge_hubs
SET description = 'Shared guidance and context that applies across properties.'
WHERE scope_type = 'general'
  AND property_id IS NULL
  AND description IS DISTINCT FROM 'Shared guidance and context that applies across properties.';

INSERT INTO knowledge_hubs (scope_type, property_id, title, description)
SELECT
    'property',
    p.id,
    p.name || ' Knowledge Base',
    'Operational knowledge specific to ' || p.name || '.'
FROM properties p
WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_hubs kh
    WHERE kh.scope_type = 'property'
      AND kh.property_id = p.id
);

UPDATE knowledge_hubs kh
SET title = p.name || ' Knowledge Base'
FROM properties p
WHERE kh.scope_type = 'property'
  AND kh.property_id = p.id
  AND kh.title IS DISTINCT FROM p.name || ' Knowledge Base';
