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

  adminCurrentQuery = ''; // Reset on page load
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

function getTermFormHtml(term = null, categories = []) {
  const cats = ['Architecture', 'Testing', 'DevOps', 'Design Patterns', 'Agile', ...categories];
  const uniqueCats = [...new Set(cats)].sort();
  return `
    <div class="input-group">
      <label for="modal-term">Nome do Termo</label>
      <input type="text" id="modal-term" class="input" placeholder="Ex: Docker" value="${term ? escapeHtml(term.term) : ''}" required />
    </div>
    <div class="input-group">
      <label for="modal-category">Categoria</label>
      <select id="modal-category" class="select">
        ${uniqueCats.map(c => `<option value="${c}" ${term && term.category === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="input-group">
      <label for="modal-short">Definição Curta</label>
      <textarea id="modal-short" class="textarea" rows="2" placeholder="Resumo em uma linha...">${term ? escapeHtml(term.shortDefinition) : ''}</textarea>
    </div>
    <div class="input-group">
      <label for="modal-full">Definição Completa</label>
      <textarea id="modal-full" class="textarea" rows="4" placeholder="Definição detalhada...">${term ? escapeHtml(term.definition) : ''}</textarea>
    </div>
    <div class="input-group">
      <label for="modal-related">Termos Relacionados (separados por vírgula)</label>
      <input type="text" id="modal-related" class="input" placeholder="Ex: REST, API, Microservices" value="${term ? (term.relatedTerms || []).join(', ') : ''}" />
    </div>
  `;
}

function getFormValues() {
  return {
    term: document.getElementById('modal-term').value.trim(),
    category: document.getElementById('modal-category').value,
    shortDefinition: document.getElementById('modal-short').value.trim(),
    definition: document.getElementById('modal-full').value.trim(),
    relatedTerms: document.getElementById('modal-related').value
      .split(',').map(s => s.trim()).filter(Boolean)
  };
}

export async function initAdminListeners() {
  if (!isAuthenticated()) return;
  const categories = await getCategories();

  // Search logic
  const searchInput = document.getElementById('header-search-input');
  const searchClear = document.getElementById('header-search-clear');

  if (searchInput) {
    // Note: since we use the shared header input, we might need to remove old listeners 
    // or just rely on the router recreating the DOM header (which `app.js` does).
    const debouncedSearch = debounce(async (query) => {
      adminCurrentQuery = query;
      await refreshAdmin();
    }, 250);

    // Reset input value if coming from another page
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

  document.getElementById('add-term-btn')?.addEventListener('click', () => {
    showModal({
      title: 'Novo Termo',
      bodyHtml: getTermFormHtml(null, categories),
      confirmText: 'Adicionar',
      confirmClass: 'btn--primary',
      onConfirm: async () => {
        const data = getFormValues();
        if (!data.term || !data.shortDefinition) {
          showToast('Preencha ao menos o nome e a definição curta', 'error');
          throw new Error('Validation failed');
        }
        try {
          await addTerm(data);
          showToast('Termo adicionado com sucesso!', 'success');
          refreshAdmin();
        } catch (err) { 
          showToast(err.message, 'error'); 
          throw err; 
        }
      }
    });
  });

  document.getElementById('admin-tbody')?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (editBtn) {
      const id = editBtn.dataset.editId;
      const terms = await getTerms();
      const term = terms.find(t => t.id === id);
      if (!term) return;

      showModal({
        title: 'Editar Termo',
        bodyHtml: getTermFormHtml(term, categories),
        confirmText: 'Salvar',
        confirmClass: 'btn--primary',
        onConfirm: async () => {
          const data = getFormValues();
          if (!data.term || !data.shortDefinition) {
            showToast('Preencha os campos obrigatórios', 'error');
            throw new Error('Validation failed');
          }
          try {
            await updateTerm(id, data);
            showToast('Termo atualizado!', 'success');
            refreshAdmin();
          } catch (err) { 
            showToast(err.message, 'error'); 
            throw err;
          }
        }
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
      // Re-create table if it was previously empty
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
    // Show empty state inside section if wrapper exists
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
