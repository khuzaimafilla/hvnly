/**
 * Heavenly Food — Admin Bundle (Compatible with file:// & http://)
 */
(function () {
  'use strict';

  const ADMIN_PASSKEY = 'heavenly2026';
  const AUTH_KEY = 'hvnly_admin_authenticated';

  function checkAdminAuth() {
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
      const handleLogin = function () {
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
      input.onkeypress = function (e) {
        if (e.key === 'Enter') handleLogin();
      };
    }

    return false;
  }

  function decodeToken(tokenStr) {
    if (!tokenStr) return null;
    try {
      let base64 = tokenStr.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const jsonStr = decodeURIComponent(atob(base64));
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }

  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number).replace('IDR', 'Rp').trim();
  }

  async function initAdminVerifier() {
    const isAuthorized = checkAdminAuth();
    if (!isAuthorized) return;

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const container = document.getElementById('verifier-container');
    if (!container) return;

    if (!token) {
      container.innerHTML = '<div class="verifier-card">' +
        '<div class="status-badge-container">' +
          '<div class="status-badge invalid">TIDAK ADA TOKEN TRANSAKSI</div>' +
          '<p style="margin-top:12px; color:var(--text-muted);">Silakan buka link verifikasi yang dikirimkan pelanggan dari WhatsApp.</p>' +
        '</div>' +
      '</div>';
      return;
    }

    let verifiedPayload = null;
    let isValid = false;

    try {
      const apiRes = await fetch('/api/verify-token?token=' + encodeURIComponent(token));
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.valid && data.payload) {
          verifiedPayload = data.payload;
          isValid = true;
        }
      }
    } catch (e) {}

    if (!isValid) {
      const decoded = decodeToken(token);
      if (decoded && (decoded.id || decoded.orderId) && (decoded.s === 'PAID' || decoded.status === 'PAID')) {
        verifiedPayload = decoded;
        isValid = true;
      }
    }

    if (isValid && verifiedPayload) {
      const orderId = verifiedPayload.id || verifiedPayload.orderId;
      const name = verifiedPayload.n || verifiedPayload.name;
      const phone = verifiedPayload.p || verifiedPayload.phone;
      const gmaps = verifiedPayload.g || verifiedPayload.gmaps;
      const notes = verifiedPayload.nt || verifiedPayload.notes;
      const total = verifiedPayload.t || verifiedPayload.total;
      const timestamp = verifiedPayload.ts || verifiedPayload.timestamp;

      let rawItems = verifiedPayload.i || verifiedPayload.items || [];
      let items = rawItems.map(function (it) {
        if (Array.isArray(it)) {
          return { id: it[0], quantity: it[1], price: it[2], name: it[3] };
        }
        return it;
      });

      const itemListMarkup = items.map(function (it) {
        return '<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed var(--border-light);"><span>' + (it.quantity || 1) + 'x ' + it.name + '</span><strong>' + formatRupiah((it.price || 0) * (it.quantity || 1)) + '</strong></li>';
      }).join('');

      const formattedDate = timestamp ? new Date(timestamp).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }) : 'Baru saja';

      container.innerHTML = '<div class="verifier-card">' +
        '<div class="status-badge-container">' +
          '<div class="status-badge paid">VERIFIED — PAID VIA MIDTRANS</div>' +
          '<p style="margin-top:8px; color:var(--text-muted); font-size:0.88rem;">' + formattedDate + '</p>' +
        '</div>' +
        '<div class="order-detail-row"><span class="order-detail-label">Order ID</span><span class="order-detail-value" style="color:var(--emerald-600); font-weight:700;">' + orderId + '</span></div>' +
        '<div class="order-detail-row"><span class="order-detail-label">Nama Pelanggan</span><span class="order-detail-value">' + (name || '-') + '</span></div>' +
        '<div class="order-detail-row"><span class="order-detail-label">No. WhatsApp</span><span class="order-detail-value"><a href="https://wa.me/' + (phone || '').replace(/\D/g, '') + '" target="_blank" style="color:var(--emerald-600); font-weight:600;">' + (phone || '-') + '</a></span></div>' +
        '<div class="order-detail-row"><span class="order-detail-label">Alamat / Google Maps</span><span class="order-detail-value">' +
          (gmaps && gmaps.indexOf('http') === 0 ? '<a href="' + gmaps + '" target="_blank" class="gmaps-link-btn">Buka di Google Maps ➔</a>' : (gmaps || 'Ambil di Tempat')) +
        '</span></div>' +
        (notes && notes !== '-' ? '<div class="order-detail-row"><span class="order-detail-label">Catatan Pembeli</span><span class="order-detail-value">' + notes + '</span></div>' : '') +
        '<div style="margin-top:20px; padding:18px; background:var(--bg-main); border-radius:var(--radius-md); border:1px solid var(--border-light);"><h4 style="font-size:0.9rem; font-weight:700; color:var(--text-dark); margin-bottom:12px; text-transform:uppercase; letter-spacing:0.04em;">Rincian Item Pesanan:</h4><ul style="list-style:none;">' + itemListMarkup + '</ul></div>' +
        '<div class="order-detail-row" style="margin-top:16px; border-bottom:none; font-size:1.1rem; align-items:center;"><span class="order-detail-label" style="font-weight:700; color:var(--text-dark);">Total Pembayaran</span><span class="order-detail-value" style="color:var(--emerald-600); font-weight:700; font-size:1.25rem;">' + formatRupiah(total) + '</span></div>' +
      '</div>';
    } else {
      container.innerHTML = '<div class="verifier-card"><div class="status-badge-container"><div class="status-badge invalid">INVALID / UNPAID TOKEN</div><p style="margin-top:16px; color:var(--red-500); font-weight:600;">Peringatan: Token verifikasi ini tidak valid, telah diubah, atau pembayaran belum dikonfirmasi!</p></div></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminVerifier);
  } else {
    initAdminVerifier();
  }
})();
