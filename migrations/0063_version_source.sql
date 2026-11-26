-- Each published version keeps the working copy it was published from (studio#184;
-- Venkat, session 87): its text with any [TK] scopes, and their provenance cache.
-- Publication strips each scope to its bare output, so "discard changes" could only
-- give back the stripped text, losing the scopes and leaving a copy that could never
-- be clean again. Studio-private: no public route, feed or item document reads these.
-- NULL for versions published before this migration, and for withdrawal endcaps.
ALTER TABLE versions ADD COLUMN source_md TEXT;
ALTER TABLE versions ADD COLUMN source_provenance_json TEXT;
