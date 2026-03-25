// ============================================
// Favorites — localStorage-based favorites system
// ============================================

const FAVORITES_KEY = 'se_dictionary_favorites';

/**
 * Get all favorite term IDs
 */
export function getFavorites() {
    try {
        const data = localStorage.getItem(FAVORITES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Check if a term is favorited
 */
export function isFavorite(termId) {
    return getFavorites().includes(termId);
}

/**
 * Toggle favorite status for a term
 * @returns {boolean} New favorite state
 */
export function toggleFavorite(termId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(termId);

    if (index === -1) {
        favorites.push(termId);
    } else {
        favorites.splice(index, 1);
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    return index === -1; // Returns true if newly favorited
}

/**
 * Get count of favorites
 */
export function getFavoriteCount() {
    return getFavorites().length;
}
