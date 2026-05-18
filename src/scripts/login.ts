import { supabase } from '../lib/supabase';

function setStatus(message: string, type: 'error' | 'success' | '' = '') {
  const status = document.querySelector<HTMLElement>('[data-login-status]');
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
}

function bindPasswordToggle() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-password-toggle]');

  toggle?.addEventListener('click', () => {
    const input = document.getElementById('adminPassword') as HTMLInputElement | null;
    if (!input) return;

    const showPassword = input.type === 'password';
    input.type = showPassword ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(showPassword));
    toggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
    input.focus();
  });
}

function bindLoginForm() {
  document.querySelector('[data-login-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement | null;
    const email = form?.querySelector<HTMLInputElement>('#adminEmail');
    const password = form?.querySelector<HTMLInputElement>('#adminPassword');

    if (!email?.value.trim() || !password?.value.trim()) {
      setStatus('Completa correo y contraseña para continuar.', 'error');
      return;
    }

    setStatus('Validando credenciales...', '');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value
    });

    if (error) {
      setStatus(error.message, 'error');
      return;
    }

    setStatus('Acceso concedido. Redirigiendo...', 'success');
    window.location.href = '/admin';
  });
}

async function redirectIfAuthenticated() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    window.location.href = '/admin';
  }
}

export function initLogin() {
  redirectIfAuthenticated();
  bindPasswordToggle();
  bindLoginForm();
}
