// [CLAUDE] Web Push ohne Fremdbibliothek: VAPID (RFC 8292) + aes128gcm-Verschlüsselung (RFC 8291)
import { b64urlEncode, b64urlDecode, concatBytes, nowIso } from './util.js';

const te = new TextEncoder();

// VAPID-Schlüssel: bevorzugt aus Secret VAPID_PRIVATE_JWK, sonst einmalig erzeugt und in settings abgelegt
export async function getVapid(env) {
  let jwk = null;
  if (env.VAPID_PRIVATE_JWK) jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  if (!jwk) {
    const row = await env.DB.prepare(`SELECT value FROM settings WHERE key='vapid_private_jwk'`).first();
    if (row) jwk = JSON.parse(row.value);
  }
  if (!jwk) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    await env.DB.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('vapid_private_jwk', ?, ?)`).bind(JSON.stringify(jwk), nowIso()).run();
    const row = await env.DB.prepare(`SELECT value FROM settings WHERE key='vapid_private_jwk'`).first();
    jwk = JSON.parse(row.value); // bei parallelem Erzeugen gewinnt der erste Eintrag
  }
  const privateKey = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'], ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const publicRaw = concatBytes(new Uint8Array([4]), b64urlDecode(jwk.x), b64urlDecode(jwk.y));
  return { privateKey, publicKey: b64urlEncode(publicRaw) };
}

async function vapidAuthHeader(env, endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64urlEncode(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(te.encode(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.PUSH_CONTACT || 'mailto:fuhrpark@cevik-mobility.de',
  })));
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, vapid.privateKey, te.encode(unsigned));
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${vapid.publicKey}`;
}

async function hkdf(salt, ikm, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bits));
}

// Verschlüsselt eine Nutzlast für ein Abonnement (aes128gcm, ein Record)
export async function encryptPayload(p256dhB64, authB64, payloadBytes, { salt, asKeyPair } = {}) {
  const uaPublic = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);
  const kp = asKeyPair || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, kp.privateKey, 256));
  const keyInfo = concatBytes(te.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 256);
  const s = salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(s, ikm, te.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(s, ikm, te.encode('Content-Encoding: nonce\0'), 96);
  const plaintext = concatBytes(payloadBytes, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concatBytes(s, rs, new Uint8Array([asPublic.length]), asPublic, ct);
}

// Sendet an ein Abonnement. Ergebnis: {status:'accepted'|'gone'|'failed', http, error}
export async function sendPush(env, sub, payloadObj, { urgent = false, ttl = 24 * 3600 } = {}) {
  const vapid = await getVapid(env);
  const body = await encryptPayload(sub.p256dh, sub.auth, te.encode(JSON.stringify(payloadObj)));
  const fetcher = env.__pushFetch || fetch; // in Tests ersetzbar
  let res;
  try {
    res = await fetcher(sub.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        'content-encoding': 'aes128gcm',
        ttl: String(ttl),
        urgency: urgent ? 'high' : 'normal',
        authorization: await vapidAuthHeader(env, sub.endpoint, vapid),
      },
      body,
    });
  } catch (e) {
    return { status: 'failed', http: 0, error: String(e).slice(0, 200) };
  }
  if (res.status === 201 || res.status === 200 || res.status === 202) return { status: 'accepted', http: res.status };
  if (res.status === 404 || res.status === 410) return { status: 'gone', http: res.status };
  let text = '';
  try { text = (await res.text()).slice(0, 200); } catch {}
  return { status: 'failed', http: res.status, error: text };
}
