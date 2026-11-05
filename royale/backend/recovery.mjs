// Codes have 256 bits of randomness. Only SHA-256 verifiers enter the database.
export const recoveryHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export function newRecoveryCode(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('').match(/.{8}/g).join('-');}
export function normalizeRecoveryCode(value){const code=typeof value==='string'?value.replace(/[-\s]/g,'').toLowerCase():'';return /^[a-f0-9]{64}$/.test(code)?code:null;}
export async function recoveryBundle(count=8){if(count!==8)throw Error('Eight recovery codes are required.');const codes=Array.from({length:count},newRecoveryCode);return {codes,hashes:await Promise.all(codes.map(c=>recoveryHash(normalizeRecoveryCode(c))))};}
// Parse only AFTER Supabase getUser verified the bearer token. This is not verification.
export function verifiedSessionId(token){try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return /^[0-9a-f-]{36}$/i.test(payload.session_id)?payload.session_id:null;}catch{return null;}}
