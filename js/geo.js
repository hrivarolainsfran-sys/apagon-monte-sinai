// Cifrado de la ubicación de los equipos.
// El celular cifra con la clave pública (RSA-OAEP); solo quien tiene el PIN de admin
// puede recuperar la clave privada (guardada cifrada con AES-GCM + PBKDF2) y leerla.
import { GAME } from './config.js';

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ALG = { name: 'RSA-OAEP', hash: 'SHA-256' };
let pubKey = null;

export async function encryptForAdmin(obj) {
  if (!GAME.presenceKey) throw new Error('Falta presenceKey en la configuración');
  pubKey = pubKey || await crypto.subtle.importKey('jwk', GAME.presenceKey.pub, ALG, false, ['encrypt']);
  return b64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pubKey, new TextEncoder().encode(JSON.stringify(obj))));
}

export async function unlockAdminKey(pin) {
  const k = GAME.presenceKey;
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  const aes = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(k.salt), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const jwk = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(k.iv) }, aes, unb64(k.privEnc))));
  return crypto.subtle.importKey('jwk', jwk, ALG, false, ['decrypt']);
}

export async function decryptPresence(privKey, enc) {
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privKey, unb64(enc))));
}
