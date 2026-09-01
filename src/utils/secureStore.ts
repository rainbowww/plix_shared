// 고객 API 키 로컬 보관 — 평문 저장 금지.
// AES-GCM 256 키를 IndexedDB에 "추출 불가(non-extractable)" 상태로 두고,
// 암호문만 localStorage에 남긴다. 확장프로그램·스크립트가 저장소를 통째로 읽어도
// 원문 키를 복원할 수 없다(브라우저가 원본 키 바이트를 내주지 않음).
// 키는 이 브라우저 밖으로 나가지 않으며, 서버에 저장되지 않는다.

const DB_NAME = 'plix_secure';
const STORE = 'keys';
const DEVICE_KEY_ID = 'device-aes-key';
const CIPHER_STORAGE_KEY = 'plix_provider_keys_enc';

function hasCrypto(): boolean {
  return (
    typeof indexedDB !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    !!crypto.subtle
  );
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 이 브라우저 전용 암호키. 한 번 만들면 재사용하고, 원본 바이트는 꺼낼 수 없다.
async function getDeviceKey(): Promise<CryptoKey> {
  const db = await openDb();
  const existing = await idbGet(db, DEVICE_KEY_ID);
  if (existing) return existing as CryptoKey;
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // extractable = false
    ['encrypt', 'decrypt']
  );
  await idbPut(db, DEVICE_KEY_ID, key);
  return key;
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** providers 배열에서 키만 뽑아 암호화 저장. 키가 하나도 없으면 저장분을 지운다. */
export async function saveProviderKeys(
  providers: Array<{ id: string; apiKey?: string }>
): Promise<void> {
  if (!hasCrypto()) return; // 암호화 불가 환경에서는 아예 저장하지 않는다(평문 저장 금지)
  try {
    const map: Record<string, string> = {};
    for (const p of providers) if (p.apiKey) map[p.id] = p.apiKey;

    if (!Object.keys(map).length) {
      localStorage.removeItem(CIPHER_STORAGE_KEY);
      return;
    }

    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(map));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    localStorage.setItem(
      CIPHER_STORAGE_KEY,
      JSON.stringify({ v: 1, iv: toB64(iv.buffer), ct: toB64(ct) })
    );
  } catch (e) {
    console.warn('[secureStore] 키 저장 실패(저장 생략):', String(e).slice(0, 80));
  }
}

/** 저장된 키를 복호화해 { providerId: apiKey } 로 돌려준다. 실패하면 빈 객체. */
export async function loadProviderKeys(): Promise<Record<string, string>> {
  if (!hasCrypto()) return {};
  try {
    const raw = localStorage.getItem(CIPHER_STORAGE_KEY);
    if (!raw) return {};
    const { iv, ct } = JSON.parse(raw);
    if (!iv || !ct) return {};
    const key = await getDeviceKey();
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(iv) },
      key,
      fromB64(ct)
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch (e) {
    console.warn('[secureStore] 키 복호화 실패:', String(e).slice(0, 80));
    return {};
  }
}

/** 저장된 키 전부 삭제 */
export async function clearProviderKeys(): Promise<void> {
  try {
    localStorage.removeItem(CIPHER_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
