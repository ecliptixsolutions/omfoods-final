import {z} from 'zod';
import {readState,mutateState} from '../../../lib/storage';
import {allowLogin,clearSession,createSession,currentUser,hashPassword,validOrigin,verifyPassword} from '../../../lib/admin-auth';
export const runtime='nodejs';
export async function POST(request:Request){
 if(!validOrigin(request))return Response.json({error:'Invalid request origin'},{status:403});
 try{
 const raw=await request.text();if(raw.length>4096)return Response.json({error:'Request too large'},{status:413});const data=JSON.parse(raw) as Record<string,unknown>;
 if(data.action==='logout'){const user=await currentUser();if(user)await mutateState(state=>{const record=state.users.find(u=>u.email===user.email);if(record)record.sessionVersion++;});await clearSession();return Response.json({ok:true});}
 if(data.action==='password'){
  const user=await currentUser();if(!user)return Response.json({error:'Sign in required'},{status:401});const input=z.object({currentPassword:z.string().max(200),newPassword:z.string().min(14).max(200)}).parse(data);const state=await readState();const account=state.users.find(u=>u.email===user.email)!;if(!verifyPassword(input.currentPassword,account.passwordHash))return Response.json({error:'Current password is incorrect.'},{status:400});
  const version=await mutateState(state=>{const record=state.users.find(u=>u.email===user.email)!;if(record.passwordHash!==account.passwordHash)throw Error('Account changed. Please sign in again.');record.passwordHash=hashPassword(input.newPassword);record.sessionVersion++;return record.sessionVersion;});await createSession(user.email,version);return Response.json({ok:true});
 }
 if(!(await allowLogin(request)))return Response.json({error:'Too many login attempts. Try again in 15 minutes.'},{status:429});
 const input=z.object({email:z.string().email().max(250),password:z.string().min(1).max(200)}).parse(data);const state=await readState();const account=state.users.find(u=>u.email===input.email.toLowerCase());const fallback=state.users[0].passwordHash;const valid=verifyPassword(input.password,account?.passwordHash||fallback);if(!account||!valid)return Response.json({error:'Email or password is incorrect.'},{status:401});await createSession(account.email,account.sessionVersion);return Response.json({ok:true});
 }catch{return Response.json({error:'Unable to sign in. Please check your details or try again.'},{status:400});}
}
