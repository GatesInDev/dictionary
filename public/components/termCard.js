// ============================================
// Term Card (PT-BR)
// ============================================

import { icons } from '../scripts/utils.js';
import { isFavorite, toggleFavorite } from '../scripts/favorites.js';
import { highlightMatch } from '../scripts/search.js';
import { showModal } from './modal.js';

export function renderTermCard(term, searchQuery = '') {
  const fav = isFavorite(term.id);
  const termText = searchQuery ? highlightMatch(term.term, searchQuery) : term.term;
  const defText = searchQuery ? highlightMatch(term.shortDefinition, searchQuery) : term.shortDefinition;

  return `
    <article class="term-card" data-term-id="${term.id}" role="button" tabindex="0">
      <div class="term-card__header">
        <h3 class="term-card__term">${termText}</h3>
        <button class="term-card__favorite ${fav ? 'term-card__favorite--active' : ''}"
                data-favorite-id="${term.id}" aria-label="Favoritar" title="Favoritar">
          ${fav ? icons.starFilled : icons.star}
        </button>
      </div>
      <div class="term-card__category">
        <span class="badge badge--primary">${term.category}</span>
      </div>
      <p class="term-card__definition">${defText}</p>

      <div class="term-card__footer">
        <span class="term-card__footer-link">
          Ver detalhes ${icons.arrowRight}
        </span>
      </div>
    </article>
  `;
}

export function initTermCardListeners(container, terms = []) {
  if (!container) return;

  container.querySelectorAll('.term-card').forEach(card => {
    const termId = card.dataset.termId;
    const term = terms.find(t => t.id === termId);

    card.addEventListener('click', (e) => {
      if (e.target.closest('.term-card__favorite')) return;

      if (term) {
        showModal({
          title: term.term,
          bodyHtml: `
            <div class="term-detail-modal">
              <div class="badge badge--primary" style="margin-bottom: 16px;">${term.category}</div>
              <p class="term-detail-modal__def" style="margin-bottom: 24px; line-height: 1.6; color: var(--text-secondary);">${term.shortDefinition}</p>
              ${term.relatedTerms && term.relatedTerms.length > 0 ? `
                <div style="padding-top: 16px; border-top: 1px solid var(--border);">
                  <h4 style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px;">Termos Relacionados</h4>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${term.relatedTerms.map(tag => `<span class="tag tag--sm" style="cursor:default;pointer-events:none;">${tag}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `,
          confirmText: 'Ver tudo',
          confirmClass: 'btn--primary',
          onConfirm: () => {
            window.location.hash = `#/term/${termId}`;
          },
          onCancel: () => { },
          cancelText: 'Fechar'
        });
      } else {
        window.location.hash = `#/term/${termId}`;
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') card.click();
    });

    // Hover effect managed by CSS mainly, but we could add JS logic if needed
  });

  container.querySelectorAll('.term-card__favorite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.favoriteId;
      const nowFav = toggleFavorite(id);
      btn.classList.toggle('term-card__favorite--active', nowFav);
      btn.innerHTML = nowFav ? icons.starFilled : icons.star;
    });
  });
}
