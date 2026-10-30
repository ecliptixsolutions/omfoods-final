import {type Content,visibleDocuments} from './data';
import {readState} from '../lib/storage';
export async function getContent():Promise<Content>{
 return (await readState()).content;
}
export async function getPublicContent():Promise<Content>{const c=await getContent();return {...c,products:c.products.filter(p=>p.published),documents:visibleDocuments(c.documents),process:c.process.filter(p=>p.approved)};}
