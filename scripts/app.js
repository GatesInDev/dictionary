// ============================================
// App — SPA Router + Initialization
// ============================================

import { renderHeader, initHeaderListeners } from '../components/header.js';
import { renderHomePage, initHomeListeners } from '../pages/home.js';
import { renderDetailPage, initDetailListeners } from '../pages/detail.js';
import { renderLoginPage, initLoginListeners } from '../pages/login.js';
import { renderAdminPage, initAdminListeners } from '../pages/admin.js';
import { initTheme } from './theme.js';

const app = document.getElementById('app');

/**
 * Parse the current hash into a route object
 */
function parseRoute() {
    const hash = window.location.hash || '#/';
    const parts = hash.replace('#', '').split('/').filter(Boolean);

    if (parts.length === 0) return { page: 'home', params: {} };
    if (parts[0] === 'term' && parts[1]) return { page: 'detail', params: { id: parts[1] } };
    if (parts[0] === 'login') return { page: 'login', params: {} };
    if (parts[0] === 'admin') return { page: 'admin', params: {} };

    return { page: 'home', params: {} };
}

/**
 * Render the current route
 */
async function renderRoute() {
    const route = parseRoute();
    let pageHtml = '';

    try {
        switch (route.page) {
            case 'home':
                pageHtml = await renderHomePage();
                break;
            case 'detail':
                pageHtml = await renderDetailPage(route.params.id);
                break;
            case 'login':
                pageHtml = renderLoginPage();
                break;
            case 'admin':
                pageHtml = await renderAdminPage();
                break;
            default:
                pageHtml = await renderHomePage();
        }
    } catch (error) {
        console.error('Route render error:', error);
        pageHtml = `
      <main class="page-content">
        <div class="container">
          <div class="empty-state">
            <h3 class="empty-state__title">Something went wrong</h3>
            <p class="empty-state__text">${error.message}</p>
            <button class="btn btn--primary" onclick="location.hash='#/'" style="margin-top:16px">Go Home</button>
          </div>
        </div>
      </main>
    `;
    }

    const headerHtml = renderHeader();
    app.innerHTML = headerHtml + pageHtml;

    // Initialize listeners
    initHeaderListeners();

    switch (route.page) {
        case 'home': await initHomeListeners(); break;
        case 'detail': initDetailListeners(); break;
        case 'login': initLoginListeners(); break;
        case 'admin': await initAdminListeners(); break;
    }

    // Scroll to top on page change
    window.scrollTo(0, 0);
}

// === Initialize App ===
function init() {
    initTheme();
    renderRoute();

    // Listen for hash changes (SPA navigation)
    window.addEventListener('hashchange', renderRoute);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
