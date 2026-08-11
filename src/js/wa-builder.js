/**
 * WhatsApp URL Builder Utility
 */
export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number).replace('IDR', 'Rp').trim();
}

export function buildWhatsAppUrl(orderData) {
  const adminPhone = '6282132517964';
  const { queueNumber, customer, items, total } = orderData || {};

  const itemListFormatted = (items || []).map((item) => {
    const qty = item.quantity || 1;
    const itemTotal = item.price * qty;
    return `- ${qty}x ${item.name} (${formatRupiah(itemTotal)})`;
  }).join('\n');

  const rawMessage = `Halo Admin Heavenly Food! Saya sudah melakukan pembayaran via web.

📌 *DETAIL PESANAN*
----------------------------------
🆔 *No. Antrean:* ${queueNumber || '#HVN-ORDER'}
👤 *Nama:* ${customer?.name || '-'}
📱 *No. HP:* ${customer?.phone || '-'}
📍 *Alamat:* ${customer?.address || 'Ambil di Tempat / Delivery'}
${customer?.notes ? `📝 *Catatan:* ${customer.notes}\n` : ''}
📦 *Rincian Menu:*
${itemListFormatted}

💰 *Total Pembayaran:* ${formatRupiah(total || 0)}
💳 *Status Pembayaran:* LUNAS (QRIS via Web)
----------------------------------
Mohon segera diproses dan dikirim ya min, terima kasih! 🙏`;

  return `https://wa.me/${adminPhone}?text=${encodeURIComponent(rawMessage)}`;
}
