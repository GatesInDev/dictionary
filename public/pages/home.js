import { getTerms, searchTerms, getCategories } from '../scripts/api.js';
import { debounce } from '../scripts/search.js';
import { icons } from '../scripts/utils.js';
import { renderTermCard, initTermCardListeners } from '../components/termCard.js';
import { getFavorites } from '../scripts/favorites.js';

let currentCategory = 'All';
let currentQuery = '';
let currentLetter = null;

export async function renderHomePage() {
  const categories = await getCategories();

  return `
    <main class="page-content page-enter">
      <div class="filters-bar" id="filters-bar">
        <div class="filters-bar__inner">
          ${categories.map(cat =>
    `<button class="tag" data-category="${cat}">${cat}</button>`
  ).join('')}
        </div>
      </div>

      <div class="container">
        <div class="results-info" id="results-info">
          <span class="results-info__count" id="results-count"></span>
          <span id="active-letter-label" class="results-info__letter"></span>
        </div>

        <div class="term-list" id="term-list"></div>
      </div>

      <footer class="footer">
        <div class="container">
          <div class="footer__inner">
            <span class="footer__text">© 2026 WebWiki By Gates Solutions</span>
            <div class="footer__links">
              <a href="#/">Início</a>
              <a href="#/login">Admin</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  `;
}

// ... (initHomeListeners remains mostly the same, but we update loadTerms)

async function loadTerms() {
  const list = document.getElementById('term-list');
  const countEl = document.getElementById('results-count');
  const letterLabel = document.getElementById('active-letter-label');
  if (!list) return;

  let terms;
  if (currentQuery) {
    terms = await searchTerms(currentQuery);
    if (currentCategory !== 'All') terms = terms.filter(t => t.category === currentCategory);
  } else {
    terms = await getTerms();
    if (currentCategory !== 'All') terms = terms.filter(t => t.category === currentCategory);
  }

  // Filter by letter or favorites
  if (currentLetter === 'FAV') {
    const favIds = getFavorites();
    terms = terms.filter(t => favIds.includes(t.id));
  } else if (currentLetter) {
    terms = terms.filter(t => {
      const match = t.term.match(/[A-Za-z]/);
      return match && match[0].toUpperCase() === currentLetter;
    });
  }

  // Sort alphabetically only when browsing (search results keep priority order)
  if (!currentQuery) terms.sort((a, b) => a.term.localeCompare(b.term));

  if (countEl) {
    countEl.innerHTML = `<strong>${terms.length}</strong> termo${terms.length !== 1 ? 's' : ''}`;
  }
  if (letterLabel) {
    if (currentLetter === 'FAV') {
      letterLabel.innerHTML = `${icons.starFilled} Favoritos`;
    } else if (currentLetter) {
      letterLabel.textContent = `Letra ${currentLetter}`;
    } else {
      letterLabel.textContent = '';
    }
  }

  if (terms.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">${icons.book}</div>
        <h3 class="empty-state__title">Nenhum termo encontrado</h3>
        <p class="empty-state__text">${
          currentLetter === 'FAV'
            ? 'Você ainda não tem favoritos. Clique no ícone de estrela de um termo para salvá-lo.'
            : currentLetter
            ? `Nenhum termo começa com "${currentLetter}". Clique em "Todos" para ver todos.`
            : 'Tente ajustar a busca ou o filtro.'
        }</p>
      </div>
    `;
    return;
  }

  let html = '';

  if (currentQuery) {
    // Search mode: render flat in priority order (no letter grouping)
    html += `<div class="term-card-grid">`;
    for (const term of terms) {
      html += renderTermCard(term, currentQuery);
    }
    html += `</div>`;
  } else {
    // Browse mode: group by first letter for section headers
    const grouped = {};
    for (const term of terms) {
      const match = term.term.match(/[A-Za-z]/);
      const letter = match ? match[0].toUpperCase() : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    }

    const sortedLetters = Object.keys(grouped).sort();
    for (const letter of sortedLetters) {
      html += `<div class="term-list__section">`;
      html += `<div class="term-list__letter">${letter}</div>`;
      html += `<div class="term-card-grid">`;
      for (const term of grouped[letter]) {
        html += renderTermCard(term, currentQuery);
      }
      html += `</div></div>`;
    }
  }

  list.innerHTML = html;
  initTermCardListeners(list, terms);
}

// Re-expose initHomeListeners (required by app.js)
export async function initHomeListeners() {
  await loadTerms();

  // Search from navbar
  const searchInput = document.getElementById('header-search-input');
  const searchClear = document.getElementById('header-search-clear');

  if (searchInput) {
    const debouncedSearch = debounce(async (query) => {
      currentQuery = query;
      await loadTerms();
    }, 250);

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      if (searchClear) searchClear.classList.toggle('visible', val.length > 0);
      debouncedSearch(val);
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClear.classList.remove('visible');
      currentQuery = '';
      loadTerms();
      if (searchInput) searchInput.focus();
    });
  }

  // Category filters
  const filtersBar = document.getElementById('filters-bar');
  if (filtersBar) {
    filtersBar.addEventListener('click', (e) => {
      const tag = e.target.closest('.tag');
      if (!tag) return;
      if (tag.classList.contains('tag--active')) {
        tag.classList.remove('tag--active');
        currentCategory = 'All';
      } else {
        filtersBar.querySelectorAll('.tag').forEach(t => t.classList.remove('tag--active'));
        tag.classList.add('tag--active');
        currentCategory = tag.dataset.category;
      }
      loadTerms();
    });
  }

  const alphabetBar = document.getElementById('alphabet-bar');
  if (alphabetBar) {
    alphabetBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-letter]');
      if (!btn) return;
      const letter = btn.dataset.letter;
      currentLetter = letter === 'ALL' ? null : letter;
      alphabetBar.querySelectorAll('.alphabet-bar__letter').forEach(b =>
        b.classList.toggle('alphabet-bar__letter--active', b.dataset.letter === letter)
      );
      loadTerms();
    });
  }
}
