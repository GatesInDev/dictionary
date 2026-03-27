import { login, isAuthenticated } from '../scripts/auth.js';
import { icons, escapeHtml } from '../scripts/utils.js';

export function renderLoginPage() {
  if (isAuthenticated()) {
    window.location.hash = '#/admin';
    return '<main class="page-content"></main>';
  }

  return `
    <main class="page-content page-enter">
      <div class="login-page">
        <div class="login-card animate-fade-in">
          <div class="login-card__header">
            <div class="login-card__icon">${icons.lock}</div>
            <h2 class="login-card__title">Acesso Admin</h2>
            <p class="login-card__subtitle">Entre para gerenciar os termos do dicionário</p>
          </div>

          <form class="login-card__form" id="login-form">
            <div id="login-error"></div>

            <div class="input-group">
              <label for="login-username">Usuário</label>
              <input type="text" id="login-username" class="input"
                     placeholder="Digite seu usuário" autocomplete="username" required />
            </div>

            <div class="input-group">
              <label for="login-password">Senha</label>
              <input type="password" id="login-password" class="input"
                     placeholder="Digite sua senha" autocomplete="current-password" required />
            </div>

            <button type="submit" class="btn btn--primary btn--lg login-card__submit">
              Entrar
            </button>
          </form>

          <div class="login-card__footer">
            <a href="#/">← Voltar ao dicionário</a>
          </div>
        </div>
      </div>
    </main>
  `;
}

export function initLoginListeners() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.innerHTML = '<div class="error-message">Preencha todos os campos</div>';
      return;
    }

    const result = await login(username, password);
    if (result.success) {
      window.location.hash = '#/admin';
    } else {
      errorEl.innerHTML = `<div class="error-message">${escapeHtml(result.error)}</div>`;
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  });
}
