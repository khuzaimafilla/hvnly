/**
 * Local Session Cart Manager for Heavenly Food
 */
const CART_KEY = 'hvnly_cart_session';
const CUSTOMER_KEY = 'hvnly_customer_info';

export class CartSessionManager {
  static getCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  static saveCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
  }

  static addItem(menuItem, quantity = 1) {
    const cart = this.getCart();
    const index = cart.findIndex((item) => String(item.id) === String(menuItem.id));

    if (index > -1) {
      cart[index].quantity += quantity;
    } else {
      cart.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        image: menuItem.image || 'images/logo.png',
        quantity: quantity
      });
    }
    this.saveCart(cart);
    return cart;
  }

  static updateQty(itemId, quantity) {
    let cart = this.getCart();
    const qty = parseInt(quantity, 10);
    if (qty <= 0) {
      cart = cart.filter((item) => String(item.id) !== String(itemId));
    } else {
      const idx = cart.findIndex((item) => String(item.id) === String(itemId));
      if (idx > -1) cart[idx].quantity = qty;
    }
    this.saveCart(cart);
    return cart;
  }

  static clearCart() {
    localStorage.removeItem(CART_KEY);
    return [];
  }

  static getTotalItems() {
    return this.getCart().reduce((total, item) => total + (item.quantity || 1), 0);
  }

  static getTotalPrice() {
    return this.getCart().reduce((total, item) => total + item.price * (item.quantity || 1), 0);
  }

  static getCustomerInfo() {
    try {
      const data = localStorage.getItem(CUSTOMER_KEY);
      return data ? JSON.parse(data) : { name: '', phone: '', address: '', notes: '' };
    } catch (e) {
      return { name: '', phone: '', address: '', notes: '' };
    }
  }

  static saveCustomerInfo(info) {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(info));
    } catch (e) {}
  }
}
