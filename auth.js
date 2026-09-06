const authApi = async (url, options) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
};

const requestedRole = new URLSearchParams(window.location.search).get('role');
const roleField = document.querySelector('[name="role"]');
if (roleField && ['buyer', 'farmer'].includes(requestedRole)) roleField.value = requestedRole;

document.querySelector('[data-auth-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector('[data-error]');
  error.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  try {
    await authApi(form.dataset.authForm === 'register' ? '/api/register' : '/api/login', { method: 'POST', body: JSON.stringify(data) });
    window.location.href = '/dashboard';
  } catch (requestError) {
    error.textContent = requestError.message;
  }
});