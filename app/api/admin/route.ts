import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {getContent} from '../../content';
import {z} from 'zod';
export const dynamic='force-dynamic';
const str=z.string().max(5000);const short=z.string().max(250);const image=z.string().max(1500).refine(v=>v===''||/^\/images\/[a-zA-Z0-9._-]+$/.test(v)||/^\/api\/media\/[a-zA-Z0-9-]+$/.test(v)||/^https:\/\//.test(v),'Use an uploaded image or HTTPS URL');
const product=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),name:short.min(1),description:str,image,family:short,form:short,published:z.boolean(),code:short,sizes:short,origin:short,shelfLife:short,packaging:str,specifications:z.array(z.object({parameter:short,value:short,unit:short.optional(),method:short.optional()})).max(100),treatments:z.array(short).max(20),applications:z.array(short).max(30),source:short.optional()}).superRefine((p,ctx)=>{if(p.published&&(!p.image||!p.description))ctx.addIssue({code:'custom',message:'Published products need a description and an approved image.'});});
const date=z.string().refine(v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)));
const contentSchema=z.object({products:z.array(product).max(200),settings:z.object({company:short,phone:short,whatsapp:z.string().regex(/^\d{7,15}$/),email:z.string().email(),address:str,hours:short,tagline:short,heroTitle:short,heroDescription:str,seoDescription:str}),pages:z.record(z.object({title:short,intro:str,body:str})),documents:z.array(z.object({id:z.string().uuid(),name:short.min(1),type:short,issuer:short,scope:str,issued:date,expires:date,status:z.enum(['pending','approved','private','withdrawn']),product:short,key:z.string().regex(/^files\/[a-f0-9-]+\.pdf$/)})).max(200),process:z.array(z.object({title:short.min(1),description:str,check:str,approved:z.boolean(),image:image.optional()})).max(50)}).refine(c=>new Set(c.products.map(p=>p.slug)).size===c.products.length,'Product slugs must be unique');
const leadSchema=z.object({id:z.string().uuid(),name:short.min(1),company:short,email:z.union([z.string().email(),z.literal('')]),phone:short,product:short,status:z.enum(['New','Contacted','Sample sent','Quoted','Negotiation','Won','Lost']),priority:z.enum(['HOT','WARM','COLD']),owner:short,nextAction:str,buyerMilestone:str,followUp:date,lastContact:date,notes:str,source:short});
async function actor(){const user=await getChatGPTUser();if(!user)return null;const record=await env.DB.prepare('SELECT role FROM users WHERE email = ?').bind(user.email.toLowerCase()).first<{role:string}>();return {...user,role:record?.role||null};}
export async function GET(){try{const user=await actor();if(!user)return Response.json({error:'Sign in required'},{status:401});const count=await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>();if(!user.role)return Response.json({user,bootstrap:count?.n===0},{headers:{'Cache-Control':'no-store'}});const content=await getContent();const leads=user.role==='Administrator'?(await env.DB.prepare('SELECT value FROM leads').all<{value:string}>()).results.map(r=>JSON.parse(r.value)):[];const users=user.role==='Administrator'?(await env.DB.prepare('SELECT email,role FROM users').all()).results:[];return Response.json({content,user,leads,users},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Admin storage is unavailable. Please retry.'},{status:503});}}
export async function POST(request:Request){
try{
const url=new URL(request.url);if(request.headers.get('origin')!==url.origin)return Response.json({error:'Invalid request origin'},{status:403});
const user=await actor();if(!user)return Response.json({error:'Sign in required'},{status:401});
if(Number(request.headers.get('content-length')||0)>12_000_000)return Response.json({error:'Request too large'},{status:413});
if(request.headers.get('content-type')?.includes('multipart/form-data')){
 if(!user.role)return Response.json({error:'Access denied'},{status:403});
 const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||file.size>8*1024*1024)return Response.json({error:'Choose a file up to 8 MB.'},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());const pdf=new TextDecoder().decode(bytes.slice(0,5))==='%PDF-';const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 if(!pdf&&!png&&!jpg&&!webp)return Response.json({error:'Only PDF, PNG, JPEG and WebP files are supported.'},{status:400});
 const id=crypto.randomUUID();const ext=pdf?'pdf':png?'png':jpg?'jpg':'webp';const key='files/'+id+'.'+ext;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':'image/webp'}});return Response.json({key,id,url:pdf?null:'/api/media/'+id});
}
const raw=await request.text();if(raw.length>1_000_000)return Response.json({error:'Content too large'},{status:413});const data=JSON.parse(raw);
if(data.action==='bootstrap'){
 const existing=await env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{n:number}>();if(existing?.n)return Response.json({error:'An administrator is already configured.'},{status:403});
 // Initial ownership is only available inside the owner-private Sites access boundary.
 await env.DB.prepare("INSERT INTO users(id,email,role) SELECT ?,?,'Administrator' WHERE NOT EXISTS (SELECT 1 FROM users)").bind(user.userId,user.email.toLowerCase()).run();return Response.json({ok:true});
}
if(!user.role)return Response.json({error:'Access denied'},{status:403});
if(data.action==='save'){
 const parsed=contentSchema.safeParse(data.content);if(!parsed.success)return Response.json({error:parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},{status:400});
 for(const d of parsed.data.documents){if(d.status==='approved'&&!(await env.BUCKET.head(d.key)))return Response.json({error:'Upload the actual PDF before publishing '+d.name},{status:400});}
 await env.DB.batch([env.DB.prepare('INSERT INTO content(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind('main',JSON.stringify(parsed.data)),env.DB.prepare('INSERT INTO audit(id,actor,action,at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.email,'Saved website content',new Date().toISOString())]);
}else if(data.action==='lead'){
 if(user.role!=='Administrator')return Response.json({error:'Administrator permission required'},{status:403});const lead=leadSchema.parse(data.lead);await env.DB.prepare('INSERT INTO leads(id,value) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').bind(lead.id,JSON.stringify(lead)).run();
}else if(data.action==='role'){
 if(user.role!=='Administrator')return Response.json({error:'Administrator permission required'},{status:403});const role=z.enum(['Administrator','Content Editor','Revoked']).parse(data.role);const email=z.string().email().parse(data.email).toLowerCase();if(email===user.email.toLowerCase())return Response.json({error:'You cannot change your own role.'},{status:400});
 if(role==='Revoked')await env.DB.prepare('DELETE FROM users WHERE email = ?').bind(email).run();else await env.DB.prepare('INSERT INTO users(id,email,role) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role').bind(crypto.randomUUID(),email,role).run();
}else return Response.json({error:'Unsupported action'},{status:400});
return Response.json({ok:true});
}catch(error){return Response.json({error:error instanceof z.ZodError?'Please check the supplied fields.':error instanceof SyntaxError?'Invalid JSON request.':'Unable to save. Your changes have not been confirmed; please retry.'},{status:400});}}
