// ============================================
// Search — Debounced search logic
// ============================================

/**
 * Create a debounced version of a function
 */
export function debounce(fn, delayMs = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delayMs);
    };
}

/**
 * Highlight matching text in a string
 */
export function highlightMatch(text, query) {
    if (!query || !query.trim()) return text;

    const regex = new RegExp(`(${escapeRegex(query.trim())})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
