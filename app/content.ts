import {env} from 'cloudflare:workers';
import {defaultContent,type Content,visibleDocuments} from './data';
export async function getContent():Promise<Content>{
 const row=await env.DB.prepare('SELECT value FROM content WHERE id = ?').bind('main').first<{value:string}>();
 return row?JSON.parse(row.value):defaultContent;
}
export async function getPublicContent():Promise<Content>{const c=await getContent();return {...c,products:c.products.filter(p=>p.published),documents:visibleDocuments(c.documents),process:c.process.filter(p=>p.approved)};}
