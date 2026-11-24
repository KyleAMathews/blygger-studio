/** Published references retain both the row and bytes indefinitely. These
 * correlated predicates apply to the media table in reads and mutations. */
export const retainedMediaSql = 'EXISTS (SELECT 1 FROM version_media WHERE media_id = media.id) OR EXISTS (SELECT 1 FROM versions WHERE instr(content_html, media.r2_key) > 0)';
/** Retained by a version the public surface serves. Private versions keep their media
 * (retainedMediaSql) without making it public: serving asks this one. */
export const publicRetainedMediaSql = "EXISTS (SELECT 1 FROM version_media vm JOIN items i ON i.id = vm.item_id WHERE vm.media_id = media.id AND i.status IN ('public','withdrawn')) OR EXISTS (SELECT 1 FROM versions v JOIN items i ON i.id = v.item_id WHERE i.status IN ('public','withdrawn') AND instr(v.content_html, media.r2_key) > 0)";
export const avatarMediaSql = "EXISTS (SELECT 1 FROM settings WHERE key = 'avatar_media_id' AND value = media.id)";
