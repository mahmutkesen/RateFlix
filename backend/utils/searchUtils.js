/**
 * Shared helpers for community search, sorting and pagination.
 * All user input is length-limited and regex-escaped (ReDoS / injection safe).
 */

const MAX_QUERY_LENGTH = 60;
const MAX_WORDS = 8;

// Turkish-aware, diacritic-insensitive character classes.
// Typing "yuzuk" matches "Yüzük", "ISIK" matches "ışık", etc.
const CHAR_GROUPS = [
    ['i', 'ı', 'İ', 'I'],
    ['c', 'ç', 'C', 'Ç'],
    ['g', 'ğ', 'G', 'Ğ'],
    ['o', 'ö', 'O', 'Ö'],
    ['s', 'ş', 'S', 'Ş'],
    ['u', 'ü', 'U', 'Ü']
];

const CHAR_CLASS_MAP = CHAR_GROUPS.reduce((map, group) => {
    const cls = `[${group.join('')}]`;
    group.forEach(ch => { map[ch] = cls; });
    return map;
}, {});

const escapeRegex = (ch) => ch.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/**
 * Converts a raw search string into an array of safe regex source strings (one per word).
 */
function buildSearchPatterns(rawQuery) {
    if (!rawQuery || typeof rawQuery !== 'string') return [];
    const words = rawQuery
        .trim()
        .slice(0, MAX_QUERY_LENGTH)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, MAX_WORDS);

    return words.map(word =>
        Array.from(word).map(ch => CHAR_CLASS_MAP[ch] || escapeRegex(ch)).join('')
    );
}

/**
 * Builds a Mongo $match condition: every word must appear in at least one of the given fields.
 */
function buildSearchMatch(rawQuery, fields) {
    const patterns = buildSearchPatterns(rawQuery);
    if (patterns.length === 0) return null;
    return {
        $and: patterns.map(pattern => ({
            $or: fields.map(field => ({ [field]: { $regex: pattern, $options: 'i' } }))
        }))
    };
}

function parsePaging(query, defaultLimit = 50, maxLimit = 100) {
    let limit = parseInt(query.limit, 10);
    let page = parseInt(query.page, 10);
    if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > 500) page = 500;
    return { limit, skip: (page - 1) * limit };
}

/**
 * Whitelisted sort options. Unknown values fall back to newest.
 * _id is always the final tie-breaker for stable pagination.
 */
function buildSort(sortKey, extra = {}) {
    const options = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        most_liked: { likesCount: -1, createdAt: -1 },
        most_disliked: { dislikesCount: -1, createdAt: -1 },
        most_commented: { commentCount: -1, createdAt: -1 },
        ...extra
    };
    const chosen = options[sortKey] || options.newest;
    return { ...chosen, _id: chosen.createdAt === 1 ? 1 : -1 };
}

module.exports = {
    buildSearchPatterns,
    buildSearchMatch,
    parsePaging,
    buildSort
};
