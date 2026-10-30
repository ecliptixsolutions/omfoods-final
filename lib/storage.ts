import 'server-only';
import {get,put,head,BlobNotFoundError,BlobPreconditionFailedError} from '@vercel/blob';
import {defaultContent,type Content} from '../app/data';

function path(key:string){return (process.env.STORAGE_NAMESPACE||'')+key;}
export type Account={email:string;role:'Administrator'|'Content Editor';passwordHash:string;sessionVersion:number};
export type State={content:Content;contentVersion:number;users:Account[];leads:Record<string,unknown>[];audit:{actor:string;action:string;at:string}[]};
function initial():State{
 const email=process.env.ADMIN_OWNER_EMAIL?.toLowerCase();const passwordHash=process.env.ADMIN_PASSWORD_HASH;
 if(!email||!passwordHash)throw Error('Admin credentials are not configured.');
 return {content:structuredClone(defaultContent),contentVersion:0,users:[{email,role:'Administrator',passwordHash,sessionVersion:0}],leads:[],audit:[]};
}
export async function readJson<T>(key:string):Promise<{value:T;etag:string}|null>{
 try{const file=await get(path(key),{access:'private',useCache:false});if(!file||!file.stream)return null;return {value:await new Response(file.stream).json() as T,etag:file.blob.etag.replace(/^W\//,'')};}catch(e){if(e instanceof BlobNotFoundError)return null;throw e;}
}
export async function writeJson(key:string,value:unknown,etag?:string){return put(path(key),JSON.stringify(value),{access:'private',addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60,...etag?{ifMatch:etag}:{allowOverwrite:false}});}
export async function readState(){return (await readJson<State>('state/website.json'))?.value||initial();}
export async function mutateState<T>(edit:(state:State)=>T):Promise<T>{
 // Small business CMS: one private JSON record; conditional writes prevent concurrent edits from overwriting each other.
 for(let attempt=0;attempt<4;attempt++){
  const current=await readJson<State>('state/website.json');const state=current?.value||initial();const result=edit(state);
  try{await writeJson('state/website.json',state,current?.etag);return result;}catch(e){if(!(e instanceof BlobPreconditionFailedError)&&!(e instanceof Error&&/already exists/i.test(e.message)))throw e;}
 }
 throw Error('Another update is in progress. Please retry.');
}
export async function uploadFile(key:string,bytes:Uint8Array,contentType:string){await put(path(key),Buffer.from(bytes),{access:'private',addRandomSuffix:false,contentType,cacheControlMaxAge:60});}
export async function fileExists(key:string){try{await head(path(key));return true;}catch(e){if(e instanceof BlobNotFoundError)return false;throw e;}}
export async function readFile(key:string){try{return await get(path(key),{access:'private',useCache:false});}catch(e){if(e instanceof BlobNotFoundError)return null;throw e;}}
