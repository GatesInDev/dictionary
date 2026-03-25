// ============================================
// Detail Page (PT-BR)
// ============================================

import { getTerm, getTerms } from '../scripts/api.js';
import { icons, formatDate } from '../scripts/utils.js';
import { isFavorite, toggleFavorite } from '../scripts/favorites.js';

export async function renderDetailPage(termId) {
  try {
    const term = await getTerm(termId);
    const fav = isFavorite(term.id);

    return `
      <main class="page-content page-enter">
        <div class="container container--narrow">
          <section class="detail-page">
            <button class="detail-back" id="back-btn">
              ${icons.arrowLeft} Voltar
            </button>

            <div class="detail-header">
              <div class="detail-header__top">
                <h1 class="detail-header__title">${term.term}</h1>
                <div class="detail-header__actions">
                  <button class="btn btn--secondary btn--icon" id="fav-btn"
                          data-term-id="${term.id}" aria-label="Favoritar"
                          title="${fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                    ${fav ? icons.starFilled : icons.star}
                  </button>
                </div>
              </div>
              <div class="detail-header__meta">
                <span class="badge badge--primary">${term.category}</span>
                <span class="badge badge--neutral">Atualizado em ${formatDate(term.updatedAt)}</span>
              </div>
            </div>

            <div class="detail-content">
              <div class="detail-content__section">
                <div class="detail-content__label">Resumo</div>
                <p class="detail-content__text">${term.shortDefinition}</p>
              </div>

              <div class="detail-content__section">
                <div class="detail-content__label">Definição Completa</div>
                <p class="detail-content__text">${term.definition}</p>
              </div>

              ${term.relatedTerms && term.relatedTerms.length > 0 ? `
                <div class="detail-content__section">
                  <div class="detail-content__label">Termos Relacionados</div>
                  <div class="detail-related" id="related-terms">
                    ${term.relatedTerms.map(rt =>
      `<span class="detail-related__item" data-related="${rt}">${rt}</span>`
    ).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </section>
        </div>

        <footer class="footer">
          <div class="container">
            <div class="footer__inner">
              <span class="footer__text">© 2026 WebWik By Gates Solutions</span>
            </div>
          </div>
        </footer>
      </main>
    `;
  } catch (error) {
    return `
      <main class="page-content page-enter">
        <div class="container">
          <div class="empty-state">
            <h3 class="empty-state__title">Termo não encontrado</h3>
            <p class="empty-state__text">O termo que você procura não existe.</p>
            <button class="btn btn--primary" onclick="location.hash='#/'" style="margin-top:24px">Voltar ao início</button>
          </div>
        </div>
      </main>
    `;
  }
}

export async function initDetailListeners() {
  document.getElementById('back-btn')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  const favBtn = document.getElementById('fav-btn');
  if (favBtn) {
    favBtn.addEventListener('click', () => {
      const id = favBtn.dataset.termId;
      const nowFav = toggleFavorite(id);
      favBtn.innerHTML = nowFav ? icons.starFilled : icons.star;
      favBtn.title = nowFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    });
  }

  document.getElementById('related-terms')?.addEventListener('click', async (e) => {
    const item = e.target.closest('.detail-related__item');
    if (!item) return;
    const termName = item.dataset.related;
    const allTerms = await getTerms();
    const found = allTerms.find(t => t.term.toLowerCase().includes(termName.toLowerCase()));
    window.location.hash = found ? `#/term/${found.id}` : '#/';
  });
}
