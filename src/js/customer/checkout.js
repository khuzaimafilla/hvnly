/**
 * Customer Checkout, Geolocation & WhatsApp Token Handler
 */
import { CartManager } from './cart.js';
import { encodeToken } from '../common/token-crypto.js';

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number).replace('IDR', 'Rp').trim();
}

export function initGeolocation() {
  const geoBtn = document.getElementById('btn-use-geolocation');
  const gmapsInput = document.getElementById('cust-gmaps');

  if (geoBtn && gmapsInput) {
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation tidak didukung oleh browser Anda.');
        return;
      }

      geoBtn.disabled = true;
      geoBtn.textContent = 'Mengambil Lokasi...';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          gmapsInput.value = `https://maps.google.com/?q=${lat},${lng}`;
          geoBtn.disabled = false;
          geoBtn.textContent = 'Lokasi Berhasil Ditemukan';
        },
        (error) => {
          console.warn('Geolocation error:', error);
          alert('Gagal mengambil lokasi. Mohon masukkan link Google Maps secara manual.');
          geoBtn.disabled = false;
          geoBtn.textContent = 'Gunakan Lokasi Saat Ini';
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
}

export async function shortenUrl(longUrl) {
  try {
    const fetchPromise = fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`).then(async (res) => {
      if (res.ok) return await res.text();
      return longUrl;
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(longUrl), 1200));
    const result = await Promise.race([fetchPromise, timeoutPromise]);
    if (result && typeof result === 'string' && result.startsWith('http')) {
      return result.trim();
    }
  } catch (err) {
    console.warn('URL shortener fallback triggered:', err);
  }
  return longUrl;
}

let pendingOrderData = null;

export async function executePaymentSuccessAndOpenWA(verifiedToken) {
  if (!pendingOrderData) return;

  const qrisBtn = document.getElementById('qris-confirm-paid-btn');
  if (qrisBtn) {
    qrisBtn.disabled = true;
    qrisBtn.textContent = 'Menghubungkan ke WA...';
  }

  try {
    const { customerInfo, cart, totalAmount, signedToken } = pendingOrderData;
    const { name, phone, gmaps, notes } = customerInfo;

    const orderId = `#HVN-${Date.now().toString().slice(-6)}`;
    const compactPayload = {
      id: orderId,
      n: name,
      p: phone,
      i: cart.map((x) => [x.id, x.quantity || 1, x.price, x.name]),
      t: totalAmount,
      g: gmaps || '',
      nt: notes || '',
      s: 'PAID',
      ts: Date.now()
    };

    const finalToken = verifiedToken || signedToken || encodeToken(compactPayload);

    let baseUrl;
    if (window.location.protocol.startsWith('http')) {
      const currentPath = window.location.pathname;
      const dirPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
      baseUrl = window.location.origin + dirPath;
    } else {
      baseUrl = 'https://hvnly.vercel.app/';
    }

    const rawAdminVerifierUrl = `${baseUrl}admin.html?token=${finalToken}`;
    const adminVerifierUrl = await shortenUrl(rawAdminVerifierUrl);

    const itemListFormatted = cart.map((item) => `- ${item.quantity}x ${item.name} (${formatRupiah(item.price * item.quantity)})`).join('\n');
    const waText = `[PESANAN BARU - LUNAS]

*Order ID:* \`${orderId}\`
*Pemesan:* ${name} (${phone})
*Lokasi:* ${gmaps || 'Tidak dilampirkan'}
*Catatan:* ${notes || '-'}

*Pesanan:*
${itemListFormatted}

*Total:* ${formatRupiah(totalAmount)} (QRIS)

*Link Verifikasi:*
${adminVerifierUrl}

Mohon diproses, terima kasih.`;

    const adminPhone = '6282132517964';
    const waUrl = `https://wa.me/${adminPhone}?text=${encodeURIComponent(waText)}`;

    const qrisModal = document.getElementById('qris-modal');
    if (qrisModal) qrisModal.setAttribute('aria-hidden', 'true');

    CartManager.clearCart();
    pendingOrderData = null;
    window.open(waUrl, '_blank');
  } catch (e) {
    console.error('WA redirect error:', e);
  } finally {
    if (qrisBtn) {
      qrisBtn.disabled = false;
      qrisBtn.textContent = 'Saya Sudah Bayar (Konfirmasi & Kirim ke WA)';
    }
  }
}

export function processCustomerCheckout() {
  const name = document.getElementById('cust-name')?.value.trim();
  const phone = document.getElementById('cust-phone')?.value.trim();
  const gmaps = document.getElementById('cust-gmaps')?.value.trim();
  const notes = document.getElementById('cust-notes')?.value.trim();

  if (!name || !phone) {
    alert('Mohon lengkapi Nama Lengkap dan Nomor WhatsApp Anda.');
    return;
  }

  const customerInfo = { name, phone, gmaps, notes };
  CartManager.saveCustomerInfo(customerInfo);

  const cart = CartManager.getCart();
  const totalAmount = CartManager.getTotalPrice();

  if (!cart.length) {
    alert('Keranjang belanja Anda masih kosong.');
    return;
  }

  pendingOrderData = { customerInfo, cart, totalAmount };

  // Close checkout form modal
  const checkoutModal = document.getElementById('checkout-modal');
  if (checkoutModal) checkoutModal.setAttribute('aria-hidden', 'true');

  // Display total Rupiah amount in QRIS modal
  const amountVal = document.getElementById('qris-amount-val');
  if (amountVal) amountVal.textContent = formatRupiah(totalAmount);

  // Open QRIS payment modal instantly with 0ms delay!
  const qrisModal = document.getElementById('qris-modal');
  if (qrisModal) qrisModal.setAttribute('aria-hidden', 'false');

  const payBtn = document.getElementById('pay-submit-btn');
  if (payBtn) {
    payBtn.disabled = false;
    payBtn.textContent = 'Bayar Sekarang (QRIS / E-Wallet)';
  }
}
