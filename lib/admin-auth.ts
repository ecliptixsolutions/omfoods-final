import 'server-only';
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {readState,readJson,writeJson} from './storage';
const cookieName='omfoods_session';
function secret(){const key=process.env.SESSION_SECRET;if(!key||key.length<32)throw Error('Session secret is not configured.');return key;}
export function hashPassword(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function verifyPassword(password:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const expected=Buffer.from(hash,'hex');const actual=scryptSync(password,salt,64);return actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function validOrigin(request:Request){const expected=process.env.NEXT_PUBLIC_SITE_URL;const allowed=[new URL(request.url).origin,...expected?[new URL(expected).origin]:[],...process.env.VERCEL_PROJECT_PRODUCTION_URL?['https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL]:[],...process.env.VERCEL_URL?['https://'+process.env.VERCEL_URL]:[]];if(process.env.NODE_ENV==='development')allowed.push('http://127.0.0.1:3000','http://localhost:3000');return allowed.includes(request.headers.get('origin')||'');}
export async function currentUser(){
 const raw=(await cookies()).get(cookieName)?.value;if(!raw)return null;
 try{const [body,signature]=raw.split('.');if(!body||!signature)return null;const expected=createHmac('sha256',secret()).update(body).digest();const supplied=Buffer.from(signature,'base64url');if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;
 const data=JSON.parse(Buffer.from(body,'base64url').toString()) as {email:string;exp:number;version:number};if(data.exp<Date.now())return null;const state=await readState();const user=state.users.find(u=>u.email===data.email&&u.sessionVersion===data.version);return user?{email:user.email,role:user.role,sessionVersion:user.sessionVersion}:null;
 }catch{return null;}
}
export async function createSession(email:string,version:number){const body=Buffer.from(JSON.stringify({email,version,exp:Date.now()+8*60*60*1000})).toString('base64url');const signature=createHmac('sha256',secret()).update(body).digest('base64url');(await cookies()).set(cookieName,body+'.'+signature,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*60*60});}
export async function clearSession(){(await cookies()).delete(cookieName);}
export async function allowLogin(request:Request){
 const ip=(request.headers.get('x-forwarded-for')||'local').split(',')[0].trim();const id=createHmac('sha256',secret()).update(ip).digest('hex');const key='security/login-'+id+'.json';
 for(let i=0;i<4;i++){const row=await readJson<{count:number;reset:number}>(key);const now=Date.now();const value=row&&row.value.reset>now?row.value:{count:0,reset:now+15*60*1000};if(value.count>=10)return false;value.count++;
 try{await writeJson(key,value,row?.etag);return true;}catch(e){if(i===3)throw e;}
 }return false;
}
