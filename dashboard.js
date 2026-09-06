const dashboardApi = async (url, options = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
};

const dashboard = document.querySelector('[data-role]');
const isFarmer = dashboard.dataset.role === 'farmer';
const ordersBox = document.querySelector('[data-orders]');
const total = document.querySelector('[data-total]');
const pending = document.querySelector('[data-pending]');
const statusText = { pending: 'Pendiente', accepted: 'Aceptada', declined: 'Rechazada' };

function renderOrders(orders) {
  total.textContent = orders.length;
  pending.textContent = orders.filter((order) => order.status === 'pending').length;
  if (!orders.length) { ordersBox.innerHTML = '<div class="empty-state">Todavía no hay actividad aquí.</div>'; return; }
  ordersBox.innerHTML = orders.map((order) => `<article class="dashboard-order"><div><strong>${isFarmer ? order.product.name : order.product.name}</strong><small>${isFarmer ? `${order.buyer.name} · ${order.buyer.email}` : `Solicitaste ${order.quantity} ${order.product.unit}`} ${order.message ? `· ${order.message}` : ''}</small></div><span class="status ${order.status}">${statusText[order.status] || order.status}</span>${isFarmer && order.status === 'pending' ? `<div class="order-actions"><button data-order-action="accepted" data-order-id="${order.id}">Aceptar</button><button data-order-action="declined" data-order-id="${order.id}">Rechazar</button></div>` : ''}</article>`).join('');
  ordersBox.querySelectorAll('[data-order-action]').forEach((button) => button.addEventListener('click', () => updateOrder(button.dataset.orderId, button.dataset.orderAction)));
}

async function loadOrders() {
  try { renderOrders((await dashboardApi('/api/orders')).orders); } catch (error) { ordersBox.innerHTML = `<div class="form-error">${error.message}</div>`; }
}

async function updateOrder(id, status) {
  try { await dashboardApi(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadOrders(); } catch (error) { window.alert(error.message); }
}

document.querySelector('[data-logout]').addEventListener('click', async () => { await dashboardApi('/api/logout', { method: 'POST' }); window.location.href = '/'; });
document.querySelector('.farmer-only')?.classList.toggle('hidden', !isFarmer);
document.querySelector('[data-product-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector('[data-product-error]');
  error.textContent = '';
  try { await dashboardApi('/api/products', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); form.reset(); await loadOrders(); window.alert('Lote publicado correctamente.'); } catch (requestError) { error.textContent = requestError.message; }
});
loadOrders();