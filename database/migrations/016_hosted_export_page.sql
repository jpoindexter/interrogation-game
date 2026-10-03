-- Service-only bounded export pages. No transcript is silently truncated or skipped.
-- At most 1 MiB of JSON row text (+newline per row) leaves this RPC as row payload.
-- Cursor order is stable created_at DESC,id DESC; offset is first-page compatibility.
BEGIN;
CREATE INDEX IF NOT EXISTS game_exports_created_id_page ON public.game_exports(created_at DESC,id DESC);
CREATE FUNCTION public.interrogation_export_page(
  p_limit integer DEFAULT 100,p_offset integer DEFAULT 0,p_max_bytes integer DEFAULT 1048576,
  p_outcome text DEFAULT NULL,p_difficulty text DEFAULT NULL,p_setting text DEFAULT NULL,
  p_after_at timestamptz DEFAULT NULL,p_after_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE
  candidate record;
  row_data jsonb;
  row_bytes integer;
  used_bytes integer := 0;
  row_count integer := 0;
  rows_json jsonb := '[]'::jsonb;
  last_key jsonb := NULL;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 1000 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 128 AND 1048576
    OR (p_after_at IS NULL)<>(p_after_id IS NULL) OR (p_after_at IS NOT NULL AND p_offset<>0)
    OR (p_outcome IS NOT NULL AND p_outcome NOT IN ('win','lose_accusations','lose_time','lose_giveup','lose_lawyer'))
    OR (p_difficulty IS NOT NULL AND p_difficulty NOT IN ('easy','medium','hard','expert'))
    OR (p_setting IS NOT NULL AND length(p_setting)>100) THEN RETURN jsonb_build_object('kind','invalid'); END IF;
  FOR candidate IN SELECT e.id,e.created_at FROM public.game_exports e
    WHERE (p_outcome IS NULL OR e.outcome=p_outcome) AND (p_difficulty IS NULL OR e.difficulty=p_difficulty)
      AND (p_setting IS NULL OR e.setting=p_setting)
      AND (p_after_at IS NULL OR (e.created_at,e.id)<(p_after_at,p_after_id))
    ORDER BY e.created_at DESC,e.id DESC LIMIT p_limit+1 OFFSET p_offset
  LOOP
    IF row_count=p_limit THEN RETURN jsonb_build_object('kind','page','rows',rows_json,'next',last_key); END IF;
    SELECT to_jsonb(e) INTO row_data FROM public.game_exports e WHERE e.id=candidate.id;
    row_bytes := octet_length(row_data::text)+1;
    IF row_bytes>p_max_bytes AND row_count=0 THEN
      RETURN jsonb_build_object('kind','oversized','bytes',row_bytes);
    END IF;
    IF used_bytes+row_bytes>p_max_bytes THEN
      RETURN jsonb_build_object('kind','page','rows',rows_json,'next',last_key);
    END IF;
    rows_json := rows_json||jsonb_build_array(row_data);
    used_bytes := used_bytes+row_bytes; row_count := row_count+1;
    last_key := jsonb_build_object('createdAt',candidate.created_at,'id',candidate.id);
  END LOOP;
  RETURN jsonb_build_object('kind','page','rows',rows_json,'next',NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.interrogation_export_page(integer,integer,integer,text,text,text,timestamptz,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.interrogation_export_page(integer,integer,integer,text,text,text,timestamptz,uuid)
  TO service_role;
COMMIT;
