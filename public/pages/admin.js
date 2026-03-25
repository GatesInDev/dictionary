// ============================================
// Admin Dashboard (PT-BR)
// ============================================

import { getTerms, searchTerms, addTerm, updateTerm, deleteTerm, getCategories, fetchExternalDefinition } from '../scripts/api.js';
import { isAuthenticated } from '../scripts/auth.js';
import { debounce } from '../scripts/search.js';
import { icons, escapeHtml } from '../scripts/utils.js';
import { showModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let adminCurrentQuery = '';

export async function renderAdminPage() {
  if (!isAuthenticated()) {
    window.location.hash = '#/login';
    return '<main class="page-content"></main>';
  }

  adminCurrentQuery = '';
  const terms = await getTerms();

  return `
    <main class="page-content page-enter">
      <div class="container">
        <section class="admin-page">
          <div class="admin-header">
            <div>
              <h1 class="admin-header__title">Painel</h1>
              <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 8px;">
                Gerencie os termos do dicionário
              </p>
            </div>
            <div class="admin-header__actions">
              <button class="btn btn--secondary" id="fetch-external-btn">
                ${icons.download} Buscar Externo
              </button>
              <button class="btn btn--primary" id="add-term-btn">
                ${icons.plus} Novo Termo
              </button>
            </div>
          </div>

          ${terms.length > 0 ? `
          <div class="admin-table-wrapper">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Termo</th>
                  <th>Categoria</th>
                  <th>Definição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody id="admin-tbody">
                ${terms.map(t => renderAdminRow(t)).join('')}
              </tbody>
            </table>
          </div>
          ` : `
          <div class="empty-state">
            <h3 class="empty-state__title">Nenhum termo cadastrado</h3>
            <p class="empty-state__text">Clique em "Novo Termo" para começar.</p>
          </div>
          `}
        </section>
      </div>
    </main>
  `;
}

function renderAdminRow(term) {
  return `
    <tr data-row-id="${term.id}">
      <td class="admin-table__term">${escapeHtml(term.term)}</td>
      <td><span class="badge badge--primary">${term.category}</span></td>
      <td class="admin-table__definition">${escapeHtml(term.shortDefinition)}</td>
      <td class="admin-table__actions">
        <button class="btn btn--ghost btn--sm edit-btn" data-edit-id="${term.id}">
          ${icons.edit} Editar
        </button>
        <button class="btn btn--ghost btn--sm delete-btn" data-delete-id="${term.id}" style="color: var(--danger);">
          ${icons.trash} Excluir
        </button>
      </td>
    </tr>
  `;
}

// ── Full-screen Markdown Editor ────────────────────────────────────────────────

/**
 * Open the full-screen editor overlay.
 * @param {Object|null} term  Existing term to edit, or null for a new one.
 * @param {string[]}    categories  List of available categories.
 * @param {Function}    onSave  Async callback(data) called when user clicks Save.
 */
function openTermEditor(term = null, categories = [], onSave) {
  const cats = [...new Set(['Architecture', 'Testing', 'DevOps', 'Design Patterns', 'Agile', ...categories])].sort();
  const isEdit = !!term;

  // Simple markdown → HTML renderer (no external lib needed)
  function renderMarkdown(md) {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Headings
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold / italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Blockquote
      .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
      // Unordered list items
      .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
      // Ordered list items
      .replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Paragraphs — blank-line separated blocks that are not block elements
      .replace(/\n\n(?!<[hHuUoObBpP])/g, '</p><p>')
      .replace(/^(?!<[hHuUoObBpP<])/m, '<p>')
      + '</p>';
  }

  const overlayId = 'term-editor-overlay';

  const html = `
    <div class="term-editor-overlay" id="${overlayId}">
      <div class="term-editor-overlay__header">
        <span class="term-editor__title">${isEdit ? 'Editar Termo' : 'Novo Termo'}</span>
        <div class="term-editor__actions">
          <button class="btn btn--ghost" id="editor-cancel-btn">${icons.x} Cancelar</button>
          <button class="btn btn--primary" id="editor-save-btn">${icons.check} Salvar</button>
        </div>
      </div>

      <div class="term-editor-overlay__body">
        <!-- Left: metadata fields -->
        <div class="term-editor-overlay__meta">
          <div class="input-group">
            <label for="editor-term">Nome do Termo</label>
            <input type="text" id="editor-term" class="input" placeholder="Ex: Docker"
                   value="${term ? escapeHtml(term.term) : ''}" required />
          </div>
          <div class="input-group">
            <label for="editor-category">Categoria</label>
            <select id="editor-category" class="select">
              ${cats.map(c => `<option value="${c}" ${term && term.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="input-group">
            <label for="editor-short">Definição Curta</label>
            <textarea id="editor-short" class="textarea" rows="3"
                      placeholder="Resumo em uma linha...">${term ? escapeHtml(term.shortDefinition) : ''}</textarea>
          </div>
          <div class="input-group">
            <label for="editor-related">Termos Relacionados <span style="font-weight:400;text-transform:none;">(separados por vírgula)</span></label>
            <input type="text" id="editor-related" class="input"
                   placeholder="Ex: REST, API, Microservices"
                   value="${term ? (term.relatedTerms || []).join(', ') : ''}" />
          </div>
        </div>

        <!-- Center: markdown textarea -->
        <div class="term-editor-overlay__editor">
          <div class="term-editor-overlay__pane-label">${icons.pencil} Markdown</div>
          <textarea class="term-editor-overlay__textarea" id="editor-md"
                    placeholder="# Sobre este termo&#10;&#10;Escreva a definição completa em **Markdown**..."
          >${term ? escapeHtml(term.definition) : ''}</textarea>
        </div>

        <!-- Right: live preview -->
        <div class="term-editor-overlay__preview" id="editor-preview">
          <div class="term-editor-overlay__pane-label" style="margin: -32px -40px 24px; padding: 12px 40px;">${icons.eye} Preview</div>
          <div id="editor-preview-content"></div>
        </div>
      </div>
    </div>
  `;

  // Inject overlay into body
  const container = document.createElement('div');
  container.innerHTML = html;
  const overlay = container.firstElementChild;
  document.body.appendChild(overlay);

  // Live preview update
  const mdArea = overlay.querySelector('#editor-md');
  const previewContent = overlay.querySelector('#editor-preview-content');

  function updatePreview() {
    previewContent.innerHTML = renderMarkdown(mdArea.value);
  }
  updatePreview();
  mdArea.addEventListener('input', updatePreview);

  // Close / cancel
  function closeEditor() {
    overlay.remove();
  }
  overlay.querySelector('#editor-cancel-btn').addEventListener('click', closeEditor);

  // Save
  overlay.querySelector('#editor-save-btn').addEventListener('click', async () => {
    const saveBtn = overlay.querySelector('#editor-save-btn');
    const data = {
      term: overlay.querySelector('#editor-term').value.trim(),
      category: overlay.querySelector('#editor-category').value,
      shortDefinition: overlay.querySelector('#editor-short').value.trim(),
      definition: overlay.querySelector('#editor-md').value.trim(),
      relatedTerms: overlay.querySelector('#editor-related').value
        .split(',').map(s => s.trim()).filter(Boolean),
    };

    if (!data.term || !data.shortDefinition) {
      showToast('Preencha o nome e a definição curta', 'error');
      return;
    }

    saveBtn.disabled = true;
    try {
      await onSave(data);
      closeEditor();
    } catch (err) {
      showToast(err.message, 'error');
      saveBtn.disabled = false;
    }
  });
}

// ── Admin Listeners ────────────────────────────────────────────────────────────

export async function initAdminListeners() {
  if (!isAuthenticated()) return;
  const categories = await getCategories();

  // Header search
  const searchInput = document.getElementById('header-search-input');
  const searchClear = document.getElementById('header-search-clear');

  if (searchInput) {
    const debouncedSearch = debounce(async (query) => {
      adminCurrentQuery = query;
      await refreshAdmin();
    }, 250);

    searchInput.value = adminCurrentQuery;
    if (searchClear) searchClear.classList.toggle('visible', adminCurrentQuery.length > 0);

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
      adminCurrentQuery = '';
      refreshAdmin();
      if (searchInput) searchInput.focus();
    });
  }

  // Add new term
  document.getElementById('add-term-btn')?.addEventListener('click', () => {
    openTermEditor(null, categories, async (data) => {
      await addTerm(data);
      showToast('Termo adicionado com sucesso!', 'success');
      refreshAdmin();
    });
  });

  // Table row actions (edit / delete)
  document.getElementById('admin-tbody')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const terms = await getTerms();
      const term = terms.find(t => t.id === id);
      if (!term) return;

      openTermEditor(term, categories, async (data) => {
        await updateTerm(id, data);
        showToast('Termo atualizado!', 'success');
        refreshAdmin();
      });
    }

    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteId;
      const confirmed = await confirmDialog(
        'Excluir Termo',
        'Tem certeza que deseja excluir este termo? Esta ação não pode ser desfeita.'
      );
      if (confirmed) {
        try {
          await deleteTerm(id);
          showToast('Termo excluído', 'success');
          refreshAdmin();
        } catch (err) { showToast(err.message, 'error'); }
      }
    }
  });

  // Fetch external
  document.getElementById('fetch-external-btn')?.addEventListener('click', () => {
    const suggestions = ['CQRS', 'Event Sourcing', 'Monolith', 'E2E Testing', 'Factory Pattern'];
    showModal({
      title: 'Buscar Definição Externa',
      bodyHtml: `
        <div class="input-group">
          <label for="external-term">Termo para buscar</label>
          <input type="text" id="external-term" class="input" placeholder="Ex: CQRS" />
        </div>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 12px;">
          Sugestões: ${suggestions.join(', ')}
        </p>
      `,
      confirmText: 'Buscar e Salvar',
      confirmClass: 'btn--primary',
      onConfirm: async () => {
        const termName = document.getElementById('external-term')?.value.trim();
        if (!termName) {
          showToast('Digite um nome de termo', 'error');
          throw new Error('Empty input');
        }
        try {
          const result = await fetchExternalDefinition(termName);
          if (result.success) {
            await addTerm(result.data);
            showToast(`"${result.data.term}" adicionado!`, 'success');
            refreshAdmin();
          } else {
            showToast(result.error, 'warning');
            throw new Error(result.error);
          }
        } catch (err) {
          showToast('Falha ao buscar definição externa', 'error');
          throw err;
        }
      }
    });
  });
}

async function refreshAdmin() {
  const terms = adminCurrentQuery ? await searchTerms(adminCurrentQuery) : await getTerms();
  const wrapper = document.querySelector('.admin-table-wrapper');
  const section = document.querySelector('.admin-page');

  if (terms.length > 0) {
    if (wrapper) {
      const tbody = document.getElementById('admin-tbody');
      if (tbody) tbody.innerHTML = terms.map(t => renderAdminRow(t)).join('');
    } else if (section) {
      section.querySelector('.empty-state')?.remove();
      const newWrapper = document.createElement('div');
      newWrapper.className = 'admin-table-wrapper';
      newWrapper.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th>Termo</th>
              <th>Categoria</th>
              <th>Definição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody id="admin-tbody">
            ${terms.map(t => renderAdminRow(t)).join('')}
          </tbody>
        </table>
      `;
      section.appendChild(newWrapper);
    }
  } else {
    if (wrapper) wrapper.remove();
    let emptyState = section.querySelector('.empty-state');
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      section.appendChild(emptyState);
    }
    emptyState.innerHTML = `
      <h3 class="empty-state__title">Nenhum termo encontrado</h3>
      <p class="empty-state__text">${adminCurrentQuery ? `Não encontramos nada para "${escapeHtml(adminCurrentQuery)}".` : 'Nenhum termo cadastrado. Clique em "Novo Termo" para começar.'}</p>
    `;
  }
}
