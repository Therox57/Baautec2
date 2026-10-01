BEGIN;
-- Existing rows are preserved. NOT VALID checks apply immediately to new writes.
CREATE OR REPLACE FUNCTION public.valid_tec_languages(value jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE item jsonb;
BEGIN
 IF jsonb_typeof(value) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(value) NOT BETWEEN 1 AND 5 THEN RETURN false; END IF;
 FOR item IN SELECT jsonb_array_elements(value) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF jsonb_typeof(item->'language') IS DISTINCT FROM 'string' OR jsonb_typeof(item->'level') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  IF char_length(btrim(item->>'language')) NOT BETWEEN 2 AND 60 OR (item->>'level') NOT IN ('A1–A2','B1–B2','C1–C2') OR (item - 'language' - 'level') <> '{}'::jsonb THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.valid_tec_languages(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_tec_languages(jsonb) TO anon, authenticated, service_role;
ALTER TABLE public.tec_members ADD CONSTRAINT tec_member_payload_bounds CHECK (
 char_length(btrim(first_name)) BETWEEN 2 AND 80 AND char_length(btrim(last_name)) BETWEEN 2 AND 80 AND char_length(btrim(father_name)) BETWEEN 2 AND 80
 AND birth_date <= CURRENT_DATE AND birth_date >= CURRENT_DATE - INTERVAL '100 years'
 AND gender IN ('Kişi','Qadın') AND char_length(email) BETWEEN 5 AND 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][A-Za-z]{2,}$'
 AND phone ~ '^[+]994[ -]?(10|50|51|55|60|70|77|99|12)[ -]?[0-9]{3}[ -]?[0-9]{2}[ -]?[0-9]{2}$'
 AND char_length(btrim(faculty)) BETWEEN 2 AND 120 AND char_length(btrim(specialty)) BETWEEN 2 AND 160
 AND course IN ('1-ci kurs','2-ci kurs','3-cü kurs','4-cü kurs','Magistr 1','Magistr 2')
 AND char_length(btrim(membership_reason)) BETWEEN 10 AND 2000
 AND (skills IS NULL OR char_length(skills)<=1000) AND (additional_note IS NULL OR char_length(additional_note)<=1000)
 AND privacy_accepted IS TRUE AND public.valid_tec_languages(languages)
) NOT VALID;
-- Invoker rights retain existing own-role RLS; public callers cannot query others' roles.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
ALTER TABLE public.tec_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecgpt_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecgpt_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_owned_message_changes" ON public.tecgpt_messages AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM public.tecgpt_chats c WHERE c.id=chat_id AND c.user_id=(SELECT auth.uid())))
 WITH CHECK (EXISTS (SELECT 1 FROM public.tecgpt_chats c WHERE c.id=chat_id AND c.user_id=(SELECT auth.uid())));
ALTER TABLE public.tecgpt_messages ADD CONSTRAINT tecgpt_message_bounds CHECK (role IN ('user','assistant') AND char_length(content) BETWEEN 1 AND 4000) NOT VALID;
COMMIT;
