// ============================================
// Modal Component (PT-BR)
// ============================================

export function showModal({ title, bodyHtml, onConfirm, onCancel, confirmText = 'Confirmar', confirmClass = 'btn--primary', cancelText = 'Cancelar' }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="modal__close" aria-label="Fechar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
      <div class="modal__footer">
        <button class="btn btn--secondary" id="modal-cancel">${cancelText || 'Cancelar'}</button>
        <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); if (onCancel) onCancel(); };
  overlay.querySelector('.modal__close').addEventListener('click', close);
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.querySelector('#modal-confirm').addEventListener('click', async () => { 
    try {
      if (onConfirm) await onConfirm(); 
      overlay.remove(); 
    } catch (e) {
      console.error(e); // keep open if it fails validation
    }
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-cancel').focus();
  return overlay;
}

export function confirmDialog(title, message) {
  return new Promise((resolve) => {
    showModal({
      title,
      bodyHtml: `<p>${message}</p>`,
      confirmText: 'Confirmar',
      confirmClass: 'btn--danger',
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}
