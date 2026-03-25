// ============================================
// Header — Nav with search + alphabet strip (PT-BR)
// ============================================

import { icons } from '../scripts/utils.js';
import { toggleTheme, initTheme } from '../scripts/theme.js';
import { isAuthenticated, logout } from '../scripts/auth.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function renderHeader() {
  const authenticated = isAuthenticated();
  const currentHash = window.location.hash || '#/';
  const isActive = (hash) => currentHash === hash ? 'header__link--active' : '';

  return `
    <header class="header">
      <div class="header__inner">
        <a class="header__brand" href="#/" data-link>
          <div class="header__title">WebWiki <span>By Gates Solutions</span></div>
        </a>

        <div class="header__search">
          <div class="search-input-wrapper">
            <span class="search-icon">${icons.search}</span>
            <input type="text"
                   class="input"
                   id="header-search-input"
                   placeholder="Buscar termos..."
                   autocomplete="off" />
            <button class="search-clear" id="header-search-clear" aria-label="Limpar busca">
              ${icons.x}
            </button>
          </div>
        </div>

        <!-- Navigation & Actions (Universal) -->
        <div class="header__actions">
          <button class="header__theme-toggle" id="theme-toggle" aria-label="Alternar tema"></button>
          <button class="btn btn--ghost btn--icon header__mobile-menu" id="drawer-btn" aria-label="Menu">
            ${icons.menu}
          </button>
        </div>
      </div>
    </header>

    <!-- Alphabet strip below header -->
    <div class="alphabet-bar" id="alphabet-bar">
      <div class="alphabet-bar__inner">
        <button class="alphabet-bar__letter alphabet-bar__letter--active" data-letter="ALL">Todos</button>
        ${ALPHABET.map(l =>
    `<button class="alphabet-bar__letter" data-letter="${l}">${l}</button>`
  ).join('')}
        <button class="alphabet-bar__letter alphabet-bar__fav" data-letter="FAV" aria-label="Favoritos" title="Mostrar favoritos">${icons.star}</button>
      </div>
    </div>

    <!-- Drawer Overlay -->
    <div class="drawer-overlay" id="drawer-overlay"></div>

    <!-- Navigation Drawer -->
    <aside class="nav-drawer" id="nav-drawer">
      <div class="nav-drawer__header">
        <div class="nav-drawer__title">Menu</div>
        <button class="btn btn--ghost btn--icon" id="drawer-close" aria-label="Fechar menu">
          ${icons.x}
        </button>
      </div>
      <div class="nav-drawer__links">
        <a href="#/" class="header__link ${isActive('#/')}" data-link data-cmd="close-drawer">
          ${icons.home} Início
        </a>
        ${authenticated ? `
          <a href="#/admin" class="header__link ${isActive('#/admin')}" data-link data-cmd="close-drawer">
            ${icons.settings} Painel
          </a>
          <button class="header__link" id="logout-btn" data-cmd="close-drawer">
            ${icons.logout} Sair
          </button>
        ` : `
          <a href="#/login" class="header__link ${isActive('#/login')}" data-link data-cmd="close-drawer">
            ${icons.lock} Admin
          </a>
        `}
      </div>
    </aside>
  `;
}

export function initHeaderListeners() {
  initTheme();

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // Drawer logic
  const drawerBtn = document.getElementById('drawer-btn');
  const drawerCloseBtn = document.getElementById('drawer-close');
  const navDrawer = document.getElementById('nav-drawer');
  const drawerOverlay = document.getElementById('drawer-overlay');

  const openDrawer = () => {
    navDrawer?.classList.add('open');
    drawerOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  };

  const closeDrawer = () => {
    navDrawer?.classList.remove('open');
    drawerOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (drawerBtn) drawerBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  // Auto-close drawer on any link/action click inside it
  document.querySelectorAll('[data-cmd="close-drawer"]').forEach(el => {
    el.addEventListener('click', closeDrawer);
  });

  const logoutBtn = document.getElementById('logout-btn');
  const handleLogout = () => { logout(); window.location.hash = '#/'; };
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}
