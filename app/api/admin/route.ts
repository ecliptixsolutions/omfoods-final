import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import {currentUser,hashPassword,validOrigin} from '../../../lib/admin-auth';
import {readState,mutateState,uploadFile,fileExists} from '../../../lib/storage';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const str=z.string().max(5000);const short=z.string().max(250);const image=z.string().max(1500).refine(v=>v===''||/^\/images\/[a-zA-Z0-9._-]+$/.test(v)||/^\/api\/media\/[a-zA-Z0-9-]+$/.test(v)||/^https:\/\//.test(v),'Use an uploaded image or HTTPS URL');
const product=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),name:short.min(1),description:str,image,family:short,form:short,published:z.boolean(),code:short,sizes:short,origin:short,shelfLife:short,packaging:str,specifications:z.array(z.object({parameter:short,value:short,unit:short.optional(),method:short.optional()})).max(100),treatments:z.array(short).max(20),applications:z.array(short).max(30),source:short.optional()}).superRefine((p,ctx)=>{if(p.published&&(!p.image||!p.description))ctx.addIssue({code:'custom',message:'Published products need a description and an approved image.'});});
const date=z.string().refine(v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v)));
const contentSchema=z.object({products:z.array(product).max(200),settings:z.object({company:short,phone:short,whatsapp:z.string().regex(/^\d{7,15}$/),email:z.string().email(),address:str,hours:short,tagline:short,heroTitle:short,heroDescription:str,seoDescription:str}),pages:z.record(z.object({title:short,intro:str,body:str})),documents:z.array(z.object({id:z.string().uuid(),name:short.min(1),type:short,issuer:short,scope:str,issued:date,expires:date,status:z.enum(['pending','approved','private','withdrawn']),product:short,key:z.string().regex(/^files\/[a-f0-9-]+\.pdf$/)})).max(200),process:z.array(z.object({title:short.min(1),description:str,check:str,approved:z.boolean(),image:image.optional()})).max(50)}).refine(c=>new Set(c.products.map(p=>p.slug)).size===c.products.length,'Product slugs must be unique');
const leadSchema=z.object({id:z.string().uuid(),name:short.min(1),company:short,email:z.union([z.string().email(),z.literal('')]),phone:short,product:short,status:z.enum(['New','Contacted','Sample sent','Quoted','Negotiation','Won','Lost']),priority:z.enum(['HOT','WARM','COLD']),owner:short,nextAction:str,buyerMilestone:str,followUp:date,lastContact:date,notes:str,source:short});

class RequestError extends Error{constructor(message:string,public status=400){super(message);}}
async function limited(request:Request,max:number){const reader=request.body?.getReader();if(!reader)throw new RequestError('Empty request');const chunks:Uint8Array[]=[];let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw new RequestError('Request too large',413);}chunks.push(value);}return Buffer.concat(chunks);}
export async function GET(){try{const user=await currentUser();if(!user)return Response.json({error:'Sign in required'},{status:401,headers:{'Cache-Control':'no-store'}});const state=await readState();return Response.json({content:state.content,revision:state.contentVersion,user,leads:user.role==='Administrator'?state.leads:[],users:user.role==='Administrator'?state.users.map(({email,role})=>({email,role})):[]},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Admin storage is unavailable. Please retry.'},{status:503});}}
export async function POST(request:Request){try{
if(!validOrigin(request))throw new RequestError('Invalid request origin',403);
const user=await currentUser();if(!user)throw new RequestError('Sign in required',401);
if(request.headers.get('content-type')?.includes('multipart/form-data')){
 const bytes=await limited(request,4*1024*1024);const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();const file=form.get('file');if(!(file instanceof File)||file.size>3*1024*1024)throw new RequestError('Choose a file up to 3 MB.');
 const payload=new Uint8Array(await file.arrayBuffer());const pdf=new TextDecoder().decode(payload.slice(0,5))==='%PDF-';const png=payload[0]===137&&payload[1]===80&&payload[2]===78&&payload[3]===71;const jpg=payload[0]===255&&payload[1]===216&&payload[2]===255;const webp=new TextDecoder().decode(payload.slice(0,4))==='RIFF'&&new TextDecoder().decode(payload.slice(8,12))==='WEBP';
 if(!pdf&&!png&&!jpg&&!webp)throw new RequestError('Only PDF, PNG, JPEG and WebP files are supported.');
 const id=crypto.randomUUID();const ext=pdf?'pdf':png?'png':jpg?'jpg':'webp';const key='files/'+id+'.'+ext;await uploadFile(key,payload,pdf?'application/pdf':png?'image/png':jpg?'image/jpeg':'image/webp');return Response.json({key,id,url:pdf?null:'/api/media/'+id});
}
const bytes=await limited(request,1_000_000);const data=JSON.parse(bytes.toString());
if(data.action==='save'){
 const parsed=contentSchema.safeParse(data.content);if(!parsed.success)throw new RequestError(parsed.error.issues.map(i=>i.path.join('.')+': '+i.message).join('; '));
 for(const d of parsed.data.documents)if(d.status==='approved'&&!(await fileExists(d.key)))throw new RequestError('Upload the actual PDF before publishing '+d.name);
 const revision=await mutateState(state=>{if(data.revision!==state.contentVersion)throw new RequestError('Content changed in another session. Reload before saving.',409);state.content=parsed.data;state.contentVersion++;state.audit.push({actor:user.email,action:'Saved website content',at:new Date().toISOString()});state.audit=state.audit.slice(-2000);return state.contentVersion;});return Response.json({ok:true,revision});
}
if(user.role!=='Administrator')throw new RequestError('Administrator permission required',403);
if(data.action==='lead'){
 const lead=leadSchema.parse(data.lead);await mutateState(state=>{state.leads=[...state.leads.filter(l=>l.id!==lead.id),lead];});
}else if(data.action==='role'){
 const role=z.enum(['Administrator','Content Editor','Revoked']).parse(data.role);const email=z.string().email().parse(data.email).toLowerCase();if(email===user.email)throw new RequestError('You cannot change your own role.');
 const temporaryPassword=randomBytes(18).toString('base64url');let added=false;
 await mutateState(state=>{const existing=state.users.find(u=>u.email===email);if(role==='Revoked')state.users=state.users.filter(u=>u.email!==email);else if(existing){existing.role=role;existing.sessionVersion++;}else{state.users.push({email,role,passwordHash:hashPassword(temporaryPassword),sessionVersion:0});added=true;}});
 return Response.json({ok:true,...added?{temporaryPassword}: {}});
}else throw new RequestError('Unsupported action');
return Response.json({ok:true});
}catch(error){if(!(error instanceof RequestError)&&!(error instanceof z.ZodError))console.error('Admin operation failed:',error instanceof Error?error.message:'Unknown storage failure');return Response.json({error:error instanceof RequestError?error.message:error instanceof z.ZodError?'Please check the supplied fields.':'Unable to save. Your changes have not been confirmed; please retry.'},{status:error instanceof RequestError?error.status:400});}}
