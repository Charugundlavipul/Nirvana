CREATE TABLE IF NOT EXISTS public.page_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_key TEXT NOT NULL UNIQUE,
    seo_title TEXT NOT NULL,
    description TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    canonical_path TEXT,
    open_graph_title TEXT,
    open_graph_description TEXT,
    open_graph_image TEXT,
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    noindex BOOLEAN NOT NULL DEFAULT FALSE,
    follow BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT page_metadata_page_key_check CHECK (page_key LIKE '/%')
);

CREATE INDEX IF NOT EXISTS page_metadata_updated_at_idx
    ON public.page_metadata(updated_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'page_metadata_set_updated_at') THEN
        CREATE TRIGGER page_metadata_set_updated_at
        BEFORE UPDATE ON public.page_metadata
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    END IF;
END;
$$;

ALTER TABLE public.page_metadata ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published page metadata is viewable by everyone" ON public.page_metadata;
CREATE POLICY "Published page metadata is viewable by everyone"
    ON public.page_metadata FOR SELECT USING (true);
GRANT SELECT ON TABLE public.page_metadata TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_page_metadata_approval(
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
BEGIN
    v_actor_role := public.current_admin_role();
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('owner', 'superadmin') THEN
        RAISE EXCEPTION 'Only superadmin/owner can approve or reject requests';
    END IF;

    SELECT * INTO req FROM approval_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND OR req.entity_type <> 'page_metadata' THEN
        RAISE EXCEPTION 'Page metadata approval request not found';
    END IF;
    IF req.status NOT IN ('pending', 'revision_requested') THEN
        RAISE EXCEPTION 'Only pending or revision_requested requests can be processed';
    END IF;

    IF p_new_status IN ('rejected', 'revision_requested') THEN
        UPDATE approval_requests
        SET status = p_new_status, approved_by = auth.uid(), approved_at = NOW(),
            comment = COALESCE(p_comment, comment), updated_at = NOW()
        WHERE id = req.id;
        RETURN jsonb_build_object('ok', true, 'status', p_new_status, 'request_id', req.id);
    END IF;
    IF p_new_status <> 'approved' THEN
        RAISE EXCEPTION 'Unsupported status %, use approved/rejected/revision_requested', p_new_status;
    END IF;

    IF req.action IN ('create', 'update') THEN
        INSERT INTO public.page_metadata (
            id, page_key, seo_title, description, keywords, canonical_path,
            open_graph_title, open_graph_description, open_graph_image,
            twitter_title, twitter_description, twitter_image,
            noindex, follow, updated_by, updated_at
        ) VALUES (
            COALESCE(NULLIF(req.payload->>'id', '')::uuid, req.entity_id, uuid_generate_v4()),
            req.payload->>'page_key', req.payload->>'seo_title', req.payload->>'description',
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(req.payload->'keywords', '[]'::jsonb))),
            COALESCE(NULLIF(req.payload->>'canonical_path', ''), req.payload->>'page_key'),
            NULLIF(req.payload->>'open_graph_title', ''), NULLIF(req.payload->>'open_graph_description', ''),
            NULLIF(req.payload->>'open_graph_image', ''), NULLIF(req.payload->>'twitter_title', ''),
            NULLIF(req.payload->>'twitter_description', ''), NULLIF(req.payload->>'twitter_image', ''),
            COALESCE((req.payload->>'noindex')::boolean, false),
            COALESCE((req.payload->>'follow')::boolean, true), req.submitted_by, NOW()
        )
        ON CONFLICT (page_key) DO UPDATE SET
            seo_title = EXCLUDED.seo_title, description = EXCLUDED.description,
            keywords = EXCLUDED.keywords, canonical_path = EXCLUDED.canonical_path,
            open_graph_title = EXCLUDED.open_graph_title,
            open_graph_description = EXCLUDED.open_graph_description,
            open_graph_image = EXCLUDED.open_graph_image,
            twitter_title = EXCLUDED.twitter_title,
            twitter_description = EXCLUDED.twitter_description,
            twitter_image = EXCLUDED.twitter_image, noindex = EXCLUDED.noindex,
            follow = EXCLUDED.follow, updated_by = EXCLUDED.updated_by, updated_at = NOW();
    ELSIF req.action = 'delete' THEN
        DELETE FROM public.page_metadata
        WHERE id = req.entity_id OR page_key = req.payload->>'page_key';
    ELSE
        RAISE EXCEPTION 'Unsupported page_metadata action %', req.action;
    END IF;

    UPDATE approval_requests
    SET status = 'applied', approved_by = auth.uid(), approved_at = NOW(),
        comment = COALESCE(p_comment, comment), updated_at = NOW()
    WHERE id = req.id;
    RETURN jsonb_build_object('ok', true, 'status', 'applied', 'request_id', req.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_page_metadata_approval(UUID, TEXT, TEXT) TO authenticated;
