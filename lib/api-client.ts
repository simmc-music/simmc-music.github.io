declare global { var SIMMUSIC_API_BASE: string | undefined; }
const base = () => globalThis.SIMMUSIC_API_BASE || '';
let memoryToken = '';
function token() { try { return sessionStorage.getItem('simmusic_session') || memoryToken; } catch { return memoryToken; } }
function save(value: string) { memoryToken=value; try { if(value)sessionStorage.setItem('simmusic_session',value);else sessionStorage.removeItem('simmusic_session'); }catch{} }
export function apiFetch(path: string, init: RequestInit = {}) {
 const headers=new Headers(init.headers);
 if(base() && token()) headers.set('Authorization',`Bearer ${token()}`);
 return fetch(base()+path,{...init,headers,credentials:base()?'omit':'same-origin'});
}
function rewrite(value: unknown, field = ''): unknown {
 if(typeof value==='string' && ['imageUrl','avatarUrl'].includes(field) && value.startsWith('/api/images/'))return base()+value;
 if(Array.isArray(value))return value.map(v=>rewrite(v));
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v,k)]));
 return value;
}
export async function readApiJson(response: Response): Promise<unknown> {
 const data=await response.json() as Record<string,unknown> | null;
 if(base() && response.ok) {
  if(typeof data?.sessionToken==='string')save(data.sessionToken);
  else if(new URL(response.url).pathname==='/api/auth' && data && Object.hasOwn(data,'user') && data.user===null)save('');
 }
 return base()?rewrite(data):data;
}
