-- Each published version keeps the working copy it was published from (studio#184;
-- Venkat, session 87): its text with any [TK] scopes, and their provenance cache.
-- Publication strips each scope to its bare output, so "discard changes" could only
-- give back the stripped text, losing the scopes and leaving a copy that could never
-- be clean again. Studio-private: no public route, feed or item document reads these.
-- `source_md` is stored only where it differs from the published `content_md` (most
-- versions have no scopes and no comments to self, and cost nothing); NULL means "the
-- same as published". `source_provenance_json` is always written from here on ('[]'
-- when there is none), so a NULL there marks a version from before this migration,
-- or a withdrawal endcap.
ALTER TABLE versions ADD COLUMN source_md TEXT;
ALTER TABLE versions ADD COLUMN source_provenance_json TEXT;
