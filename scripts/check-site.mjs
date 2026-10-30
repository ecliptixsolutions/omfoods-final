import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const cookie='__sites_local_auth=1';
async function post(data,auth=true){return fetch(base+'/api/admin',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...auth?{Cookie:cookie}:{}},body:JSON.stringify(data)});}
assert.equal((await fetch(base+'/api/admin')).status,401,'Anonymous admin access must fail');
assert.equal((await fetch(base+'/api/admin',{method:'POST',body:'{}'})).status,403,'Missing origin must fail');
let state=await (await fetch(base+'/api/admin',{headers:{Cookie:cookie}})).json();
if(state.bootstrap){assert.equal((await post({action:'bootstrap'})).status,200);state=await (await fetch(base+'/api/admin',{headers:{Cookie:cookie}})).json();}
assert.equal(state.user.role,'Administrator');
const original=structuredClone(state.content);
assert.equal(original.products.filter(p=>p.published).length,8);
assert.equal(original.products.filter(p=>!p.published).length,20);
try{
 const draft=structuredClone(original);draft.products.find(p=>!p.published).description='PRIVATE-DRAFT-SENTINEL';
 assert.equal((await post({action:'save',content:draft})).status,200);
 const html=await (await fetch(base+'/products')).text();assert.ok(!html.includes('PRIVATE-DRAFT-SENTINEL'),'Unpublished content must not reach browser');
 const bad=structuredClone(original);bad.products[0].image='javascript:alert(1)';assert.equal((await post({action:'save',content:bad})).status,400,'Unsafe image URLs must fail');
 const dup=structuredClone(original);dup.products[1].slug=dup.products[0].slug;assert.equal((await post({action:'save',content:dup})).status,400,'Duplicate product URLs must fail');
 const form=new FormData();form.append('file',new Blob(['%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'],{type:'application/pdf'}),'qa-document.pdf');
 const uploaded=await fetch(base+'/api/admin',{method:'POST',headers:{Origin:base,Cookie:cookie},body:form});assert.equal(uploaded.status,200);const file=await uploaded.json();
 const c=structuredClone(original);const doc={id:file.id,key:file.key,name:'QA document',type:'TDS',issuer:'QA',scope:'Test only',issued:'',expires:'',status:'private',product:''};c.documents.push(doc);
 assert.equal((await post({action:'save',content:c})).status,200);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404,'Private documents must not download');
 doc.status='approved';doc.expires='2020-01-01';assert.equal((await post({action:'save',content:c})).status,200);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404,'Expired documents must not download');
 doc.expires='2099-01-01';assert.equal((await post({action:'save',content:c})).status,200);const download=await fetch(base+'/api/documents/'+doc.id+'?download=1');assert.equal(download.status,200);assert.ok(download.headers.get('content-disposition').startsWith('attachment'));assert.ok((await download.text()).startsWith('%PDF-'));
 doc.status='withdrawn';assert.equal((await post({action:'save',content:c})).status,200);assert.equal((await fetch(base+'/api/documents/'+doc.id)).status,404,'Withdrawn documents must not download');
 for(const path of ['/','/products','/products/onion-powder','/about','/applications','/plant','/process','/quality','/certificates','/documents','/packaging','/responsibility','/enquiry','/faq','/privacy','/terms','/admin'])assert.equal((await fetch(base+path)).status,200,path+' should load');
 assert.equal((await fetch(base+'/not-a-real-page')).status,404);assert.equal((await fetch(base+'/products/white-onion-powder')).status,404,'Unpublished product must return 404');
 const home=await (await fetch(base)).text();assert.ok(home.includes('https://wa.me/918140712205?text='));assert.ok(home.includes('https://om-food-five.vercel.app/contact'));
 console.log('PASS: auth/origin checks, 8 imported products, 20 drafts, content persistence, draft privacy, URL validation, unique slugs, PDF upload/download/expiry/withdrawal, 17 pages, 404s, preserved enquiry and WhatsApp destinations.');
}finally{const restore=await post({action:'save',content:original});assert.equal(restore.status,200,'Restore original content');}
