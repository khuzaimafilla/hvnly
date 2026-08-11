/**
 * Client-Side Token Crypto & Encoding Utilities
 */
export function encodeToken(payload) {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonStr))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    console.error('Token encoding error:', e);
    return '';
  }
}

export function decodeToken(tokenStr) {
  if (!tokenStr) return null;
  try {
    let base64 = tokenStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = decodeURIComponent(atob(base64));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Token decoding error:', e);
    return null;
  }
}
