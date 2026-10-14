/**
 * Security Middleware: Sanitization against NoSQL Injection, XSS, and Code Injection attacks.
 */

// Helper to sanitize strings from potential XSS and code injection payloads
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    // 1. Remove poison null bytes
    let cleaned = str.replace(/\0/g, '');

    // 2. Strip full <script> tags and everything between them
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 3. Strip dangerous executable HTML tags (iframe, embed, object, svg, form, style, link, meta, etc.)
    cleaned = cleaned.replace(/<\/?(?:script|iframe|embed|object|form|input|button|link|style|meta|base|applet|svg|audio|video|source)\b[^>]*>/gi, '');

    // 4. Strip all inline HTML event handlers (e.g. onload=, onerror=, onclick=, onmouseover=)
    cleaned = cleaned.replace(/\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

    // 5. Neutralize dangerous pseudo-protocols in URLs (javascript:, vbscript:, data:text/html)
    cleaned = cleaned.replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, 'blocked-scheme:');

    // 6. Strip dangerous template tag patterns if any (${...})
    cleaned = cleaned.replace(/<\?php[\s\S]*?\?>/gi, '');

    return cleaned;
}

// Recursive helper to remove MongoDB operators ($ and .) and clean strings
function cleanData(data) {
    if (!data || typeof data !== 'object') {
        return typeof data === 'string' ? sanitizeString(data) : data;
    }

    if (Array.isArray(data)) {
        return data.map(item => cleanData(item));
    }

    const cleanObj = {};
    for (const [key, value] of Object.entries(data)) {
        // Drop any key that starts with '$' (NoSQL operator injection like $gt, $ne, $where, $regex) or contains '.'
        if (key.startsWith('$') || key.includes('.')) {
            console.warn(`[SECURITY] Blocked potential NoSQL injection key: ${key}`);
            continue;
        }

        cleanObj[key] = cleanData(value);
    }

    return cleanObj;
}

const sanitizeMiddleware = (req, res, next) => {
    try {
        if (req.body) {
            req.body = cleanData(req.body);
        }
        if (req.query) {
            req.query = cleanData(req.query);
        }
        if (req.params) {
            req.params = cleanData(req.params);
        }
    } catch (err) {
        console.error('[SECURITY] Sanitization error:', err);
    }
    next();
};

module.exports = {
    sanitizeMiddleware,
    sanitizeString,
    cleanData
};
