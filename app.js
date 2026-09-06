const state = { user: null, products: [], selectedProduct: null, authMode: 'login', authRole: 'buyer' };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Ha ocurrido un error.');
  return data;
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3500);
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); document.body.style.overflow = ''; }

function updateUserUi() {
  const loggedIn = Boolean(state.user);
  $('#login-button').classList.toggle('hidden', loggedIn);
  $('#register-button').classList.toggle('hidden', loggedIn);
  $('#user-menu').classList.toggle('hidden', !loggedIn);
  if (!loggedIn) return;
  $('#avatar-button').textContent = initials(state.user.name);
  $('#user-name').textContent = state.user.name;
  $('#user-role').textContent = state.user.role === 'farmer' ? 'Agricultor' : 'Comprador';
  renderDashboard();
}

function renderProducts() {
  const search = $('#search-input').value.trim().toLowerCase();
  const category = $('#category-filter').value;
  const visible = state.products.filter((product) => {
    const matchesSearch = `${product.name} ${product.description} ${product.farmer.name}`.toLowerCase().includes(search);
    return matchesSearch && (category === 'all' || product.category === category);
  });
  const grid = $('#product-grid');
  if (!visible.length) { grid.innerHTML = '<div class="empty-state">No encontramos lotes con esos filtros.</div>'; return; }
  grid.innerHTML = visible.map((product) => `
    <article class="product-card">
      <div class="product-image"><img src="${product.image || '/static/images/papa.png'}" alt="${product.name}"><span class="category-label">${product.category}</span></div>
      <div class="product-body"><h3>${product.name}</h3><p class="product-desc">${product.description}</p><div class="product-meta"><div class="farmer-line"><span class="farmer-dot">${initials(product.farmer.name)}</span><span>${product.farmer.company || product.farmer.name}</span></div><div class="price">${money(product.price)} <small>/ ${product.unit}</small></div></div><div class="card-bottom"><span class="harvest">${product.quantity.toLocaleString('es-CO')} ${product.unit} disponibles</span>${state.user?.role === 'farmer' && state.user.id === product.farmer_id ? `<button class="manage-link" data-delete="${product.id}">Eliminar lote</button>` : `<button class="card-action" data-order="${product.id}">Solicitar lote ↗</button>`}</div></div>
    </article>`).join('');
  $$('[data-order]').forEach((button) => button.addEventListener('click', () => startOrder(Number(button.dataset.order))));
  $$('[data-delete]').forEach((button) => button.addEventListener('click', () => deleteProduct(Number(button.dataset.delete))));
}

function renderDashboard() {
  const existing = $('#dashboard-strip');
  if (existing) existing.remove();
  const existingRequests = $('#request-list');
  if (existingRequests) existingRequests.remove();
  if (!state.user) return;
  const productCount = state.products.filter((product) => product.farmer_id === state.user.id).length;
  const strip = document.createElement('section');
  strip.id = 'dashboard-strip';
  strip.className = 'dashboard-strip';
  strip.innerHTML = state.user.role === 'farmer' ? `<div><h3>Tu espacio de agricultor</h3><small>${productCount} lote${productCount === 1 ? '' : 's'} publicados · revisa quién quiere comprarte</small></div><div class="dashboard-actions"><button class="outline-button" id="view-requests">Ver solicitudes</button><button class="primary-button" id="new-product">+ Publicar lote</button></div>` : `<div><h3>Tu espacio de compras</h3><small>Busca lotes y conecta directamente con agricultores locales</small></div><div class="dashboard-actions"><button class="outline-button" id="view-orders">Mis solicitudes</button></div>`;
  $('#product-section').before(strip);
  if (state.user.role === 'farmer') $('#new-product').addEventListener('click', () => openModal('product-modal'));
  if (state.user.role === 'farmer') $('#view-requests').addEventListener('click', () => loadRequests(true));
  if (state.user.role === 'buyer') $('#view-orders').addEventListener('click', () => loadRequests(true));
}

async function loadRequests(scroll = false) {
  try {
    const data = await api('/api/orders');
    const existing = $('#request-list');
    if (existing) existing.remove();
    const section = document.createElement('section');
    section.id = 'request-list'; section.className = 'request-list';
    section.innerHTML = `<h3>${state.user.role === 'farmer' ? 'Personas interesadas en tus lotes' : 'Mis solicitudes de compra'}</h3>`;
    section.innerHTML += data.orders.length ? data.orders.map((order) => `<div class="request-item"><div><strong>${state.user.role === 'farmer' ? order.buyer.company || order.buyer.name : order.product.name}</strong><small>${state.user.role === 'farmer' ? `${order.buyer.name} · ${order.buyer.email}` : `Solicitaste ${order.quantity} ${order.product.unit}`} ${order.message ? `· “${order.message}”` : ''}</small></div><div class="request-status"><span class="status ${order.status}">${order.status === 'pending' ? 'Pendiente' : order.status === 'accepted' ? 'Aceptada' : 'Rechazada'}</span>${state.user.role === 'farmer' && order.status === 'pending' ? `<div class="request-actions"><button data-accept="${order.id}">Aceptar</button><button data-decline="${order.id}">Rechazar</button></div>` : ''}</div></div>`).join('') : '<div class="empty-state">Todavía no hay solicitudes aquí.</div>';
    $('#product-section').after(section);
    $$('[data-accept]').forEach((button) => button.addEventListener('click', () => updateOrder(button.dataset.accept, 'accepted')));
    $$('[data-decline]').forEach((button) => button.addEventListener('click', () => updateOrder(button.dataset.decline, 'declined')));
    if (scroll) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { showToast(error.message); }
}

async function updateOrder(id, status) {
  try { await api(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); showToast(status === 'accepted' ? 'Solicitud aceptada.' : 'Solicitud rechazada.'); loadRequests(); } catch (error) { showToast(error.message); }
}

function startOrder(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!state.user) { state.selectedProduct = product; openAuth('login', 'buyer'); return; }
  if (state.user.role !== 'buyer') { showToast('Cambia a una cuenta de comprador para solicitar lotes.'); return; }
  state.selectedProduct = product;
  $('#order-title').innerHTML = `Lleva este lote<br><em>a tu cocina.</em>`;
  $('#order-description').textContent = `${product.name} · ${product.quantity.toLocaleString('es-CO')} ${product.unit} disponibles · ${product.farmer.company || product.farmer.name}`;
  $('#order-price').textContent = `${money(product.price)} / ${product.unit}`;
  $('#order-quantity').max = product.quantity;
  openModal('order-modal');
}

async function deleteProduct(productId) {
  if (!window.confirm('¿Eliminar este lote del mercado?')) return;
  try { await api(`/api/products/${productId}`, { method: 'DELETE' }); showToast('Lote eliminado del mercado.'); await loadProducts(); } catch (error) { showToast(error.message); }
}

async function loadProducts() { const data = await api('/api/products'); state.products = data.products; renderProducts(); renderDashboard(); }

function openAuth(mode = 'login', role = 'buyer') {
  state.authMode = mode; state.authRole = role;
  $('#auth-error').textContent = '';
  $('#auth-form').reset();
  $$('#auth-form input').forEach((input) => input.removeAttribute('required'));
  $('#auth-form input[name="email"], #auth-form input[name="password"]').forEach((input) => input.setAttribute('required', ''));
  const register = mode === 'register';
  $('#auth-title').innerHTML = register ? 'Haz parte de<br><em>AGROVIA.</em>' : 'Vuelve a conectar<br><em>con el campo.</em>';
  $('#auth-subtitle').textContent = register ? 'Crea tu cuenta y empieza a mover productos locales.' : 'Ingresa para gestionar tus compras y lotes.';
  $('#auth-submit').innerHTML = register ? 'Crear mi cuenta <span>↗</span>' : 'Ingresar <span>↗</span>';
  $('#toggle-copy').textContent = register ? '¿Ya tienes una cuenta?' : '¿Aún no tienes cuenta?';
  $('#toggle-auth').textContent = register ? 'Ingresar' : 'Crear una cuenta';
  $('#name-field').classList.toggle('hidden', !register); $('#company-field').classList.toggle('hidden', !register); $('#location-row').classList.toggle('hidden', !register);
  $$('#name-field input, #company-field input').forEach((input) => input.toggleAttribute('required', register));
  $$('.role-switch button').forEach((button) => button.classList.toggle('selected', button.dataset.role === role));
  openModal('auth-modal');
}

$('#login-button').addEventListener('click', () => { window.location.href = '/login'; });
$('#register-button').addEventListener('click', () => { window.location.href = '/register'; });
$('#farmer-register-button').addEventListener('click', () => { window.location.href = '/register?role=farmer'; });
$('#explore-button').addEventListener('click', () => $('#product-section').scrollIntoView({ behavior: 'smooth' }));
$('#toggle-auth').addEventListener('click', () => openAuth(state.authMode === 'login' ? 'register' : 'login', state.authRole));
$$('.role-switch button').forEach((button) => button.addEventListener('click', () => openAuth(state.authMode, button.dataset.role)));
$$('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));
$('#avatar-button').addEventListener('click', () => $('#user-menu').classList.toggle('open'));
$('#logout-button').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); state.user = null; updateUserUi(); renderProducts(); showToast('Sesión cerrada.'); });
$('#search-input').addEventListener('input', renderProducts); $('#category-filter').addEventListener('change', renderProducts);

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); data.role = state.authRole;
  try { const result = await api(state.authMode === 'register' ? '/api/register' : '/api/login', { method: 'POST', body: JSON.stringify(data) }); state.user = result.user; closeModal('auth-modal'); updateUserUi(); renderProducts(); showToast(state.authMode === 'register' ? 'Tu cuenta está lista.' : `Qué bueno verte, ${state.user.name.split(' ')[0]}.`); if (state.selectedProduct && state.user.role === 'buyer') startOrder(state.selectedProduct.id); } catch (error) { $('#auth-error').textContent = error.message; }
});

$('#product-form').addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); try { await api('/api/products', { method: 'POST', body: JSON.stringify(data) }); closeModal('product-modal'); event.target.reset(); await loadProducts(); showToast('Tu lote ya está visible en el mercado.'); } catch (error) { $('#product-error').textContent = error.message; } });
$('#order-form').addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); data.product_id = state.selectedProduct.id; try { await api('/api/orders', { method: 'POST', body: JSON.stringify(data) }); closeModal('order-modal'); event.target.reset(); showToast('Solicitud enviada al agricultor.'); } catch (error) { $('#order-error').textContent = error.message; } });

(async function init() { try { const sessionData = await api('/api/session'); state.user = sessionData.user; updateUserUi(); await loadProducts(); } catch (error) { $('#product-grid').innerHTML = `<div class="empty-state">No se pudo cargar el mercado: ${error.message}</div>`; } })();
