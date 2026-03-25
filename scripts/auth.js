// ============================================
// Auth — Backend authentication
// ============================================

import { loginApi } from './api.js';

const AUTH_KEY = 'se_dictionary_auth';

/**
 * Parse token payload
 */
function parseToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1]));
    } catch {
        return null;
    }
}

/**
 * Login with username and password against backend API
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
export async function login(username, password) {
    try {
        const result = await loginApi(username, password);
        if (result.success && result.token) {
            const authData = { token: result.token, username: result.username };
            localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
            return { success: true, token: result.token };
        }
        return { success: false, error: 'Credenciais inválidas' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Logout
 */
export function logout() {
    localStorage.removeItem(AUTH_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    const authData = getAuthData();
    if (!authData || !authData.token) return false;

    const payload = parseToken(authData.token);
    if (!payload) return false;

    // Check expiration
    if (payload.exp < Date.now()) {
        logout();
        return false;
    }

    return true;
}

/**
 * Get stored auth data
 */
function getAuthData() {
    try {
        const data = localStorage.getItem(AUTH_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Get the current token
 */
export function getToken() {
    const authData = getAuthData();
    return authData ? authData.token : null;
}

/**
 * Get the current username
 */
export function getUsername() {
    const authData = getAuthData();
    return authData ? authData.username : null;
}
