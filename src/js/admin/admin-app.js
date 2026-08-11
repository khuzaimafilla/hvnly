/**
 * Admin Passkey Authentication Controller
 */
const ADMIN_PASSKEY = 'heavenly2026';
const AUTH_KEY = 'hvnly_admin_authenticated';

export function checkAdminAuth() {
  const isAuth = sessionStorage.getItem(AUTH_KEY) === 'true';
  const modal = document.getElementById('passkey-modal');
  const input = document.getElementById('passkey-input');
  const submitBtn = document.getElementById('passkey-submit');

  if (isAuth) {
    if (modal) modal.style.display = 'none';
    return true;
  }

  if (modal) modal.style.display = 'flex';

  if (submitBtn && input) {
    const handleLogin = () => {
      const value = input.value.trim();
      if (value === ADMIN_PASSKEY) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        modal.style.display = 'none';
        window.location.reload();
      } else {
        alert('Passkey Admin salah! Silakan coba lagi.');
        input.value = '';
      }
    };

    submitBtn.onclick = handleLogin;
    input.onkeypress = (e) => {
      if (e.key === 'Enter') handleLogin();
    };
  }

  return false;
}
