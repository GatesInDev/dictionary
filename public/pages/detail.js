// ============================================
// Detail Page (PT-BR)
// ============================================

import { getTerm, getTerms } from '../scripts/api.js';
import { icons, formatDate } from '../scripts/utils.js';
import { isFavorite, toggleFavorite } from '../scripts/favorites.js';

// Minimal markdown → safe HTML renderer
function renderMarkdown(raw) {
  if (!raw) return '';
  const escaped = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = escaped.split('\n');
  const out = [];
  let inCode = false;

  for (const line of lines) {
    // Fenced code block toggle
    if (line.startsWith('```')) { inCode = !inCode; if (inCode) { out.push('<pre><code>'); } else { out.push('</code></pre>'); } continue; }
    if (inCode) { out.push(line + '\n'); continue; }

    // Headings
    if (/^### /.test(line)) { out.push(`<h3>${inline(line.slice(4))}</h3>`); continue; }
    if (/^## /.test(line))  { out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (/^# /.test(line))   { out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    // Blockquote
    if (/^&gt; /.test(line)) { out.push(`<blockquote>${inline(line.slice(5))}</blockquote>`); continue; }
    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr>'); continue; }
    // List items
    if (/^\s*[-*] /.test(line)) { out.push(`<li>${inline(line.replace(/^\s*[-*] /, ''))}</li>`); continue; }
    if (/^\s*\d+\. /.test(line)) { out.push(`<li>${inline(line.replace(/^\s*\d+\.\s*/, ''))}</li>`); continue; }
    // Blank line = paragraph break
    if (line.trim() === '') { out.push('</p><p>'); continue; }
    // Default: inline content
    out.push(inline(line) + ' ');
  }

  let html = '<p>' + out.join('') + '</p>';
  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>\s*)+/g, m => `<ul>${m}</ul>`);
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

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
                <div class="detail-content__text detail-content__markdown">${renderMarkdown(term.definition)}</div>
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
