import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:3000';
const credentials=readFileSync('outputs/vercel-admin-access.txt','utf8');
const email=credentials.match(/^Email: (.+)$/m)[1];const password=credentials.match(/^Initial password: (.+)$/m)[1];
let cookie='';let revision;
async function post(data,auth=true,path='/api/admin'){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...auth?{Cookie:cookie}:{}},body:JSON.stringify(data)});}
async function state(){const response=await fetch(base+'/api/admin',{headers:{Cookie:cookie}});assert.equal(response.status,200);const data=await response.json();revision=data.revision;return data;}
async function save(content){const response=await post({action:'save',content,revision});assert.equal(response.status,200,await response.clone().text());revision=(await response.json()).revision;}
assert.equal((await fetch(base+'/api/admin')).status,401);
assert.equal((await fetch(base+'/api/admin',{headers:{'oai-authenticated-user-email':email,'oai-authenticated-user-id':'forged'}})).status,401,'Old Sites headers must not grant access');
assert.equal((await fetch(base+'/api/admin',{method:'POST',body:'{}'})).status,403);
const login=await post({email,password},false,'/api/auth');assert.equal(login.status,200,await login.clone().text());cookie=login.headers.get('set-cookie').split(';')[0];assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
const original=structuredClone((await state()).content);
assert.equal(original.products.filter(p=>p.published).length,8);assert.equal(original.products.filter(p=>!p.published).length,20);
try{
 const draft=structuredClone(original);draft.products.find(p=>!p.published).description='PRIVATE-DRAFT-SENTINEL';await save(draft);
 assert.ok(!(await (await fetch(base+'/products')).text()).includes('PRIVATE-DRAFT-SENTINEL'));
 assert.equal((await post({action:'save',content:draft,revision:revision-1})).status,409,'Stale saves must not overwrite current content');
 const bad=structuredClone(original);bad.products[0].image='javascript:alert(1)';assert.equal((await post({action:'save',content:bad,revision})).status,400);
 const form=new FormData();form.append('file',new Blob(['%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'],{type:'application/pdf'}),'qa-document.pdf');
 const uploaded=await fetch(base+'/api/admin',{method:'POST',headers:{Origin:base,Cookie:cookie},body:form});assert.equal(uploaded.status,200,await uploaded.clone().text());const file=await uploaded.json();
 const c=structuredClone(original);const doc={id:file.id,key:file.key,name:'QA document',type:'TDS',issuer:'QA',scope:'Test only',issued:'',expires:'',status:'private',product:''};c.documents.push(doc);await save(c);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404);
 doc.status='approved';doc.expires='2020-01-01';await save(c);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404);
 doc.expires='2099-01-01';await save(c);const download=await fetch(base+'/api/documents/'+doc.id+'?download=1');assert.equal(download.status,200);assert.ok(download.headers.get('content-disposition').startsWith('attachment'));assert.ok((await download.text()).startsWith('%PDF-'));
 doc.status='withdrawn';await save(c);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404);
 const role=await post({action:'role',email:'qa-editor@example.com',role:'Content Editor'});assert.equal(role.status,200);const roleData=await role.json();if(roleData.temporaryPassword){const ownerCookie=cookie;const editor=await post({email:'qa-editor@example.com',password:roleData.temporaryPassword},false,'/api/auth');assert.equal(editor.status,200);cookie=editor.headers.get('set-cookie').split(';')[0];const view=await state();assert.deepEqual(view.leads,[]);assert.deepEqual(view.users,[]);assert.equal((await post({action:'role',email:'qa-denied@example.com',role:'Administrator'})).status,403);cookie=ownerCookie;}
 assert.equal((await post({action:'role',email:'qa-editor@example.com',role:'Revoked'})).status,200);
 for(const path of ['/','/products','/products/onion-powder','/about','/applications','/plant','/process','/quality','/certificates','/documents','/packaging','/responsibility','/enquiry','/faq','/privacy','/terms','/admin'])assert.equal((await fetch(base+path)).status,200,path);
 assert.equal((await fetch(base+'/not-a-real-page')).status,404);assert.equal((await fetch(base+'/products/white-onion-powder')).status,404);
 console.log('PASS: password login, HTTP-only sessions, forged-header rejection, CSRF checks, persistent storage, stale-save protection, draft privacy, input validation, private/expired/withdrawn documents, team role enforcement, pages and 404s.');
}finally{await state();await save(original);}
const logout=await post({action:'logout'},true,'/api/auth');assert.equal(logout.status,200);assert.equal((await fetch(base+'/api/admin',{headers:{Cookie:cookie}})).status,401,'Logout must invalidate the session token');
console.log('PASS: server-side logout/session revocation.');
