import {randomBytes,scryptSync} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const out='outputs/vercel-admin-access.txt';
if(existsSync(out))throw Error('Admin credentials already exist. Do not regenerate without a rotation plan.');
const password=randomBytes(24).toString('base64url');
const salt=randomBytes(16).toString('hex');
const values={ADMIN_OWNER_EMAIL:'Omfoodandspicesllp@gmail.com'.toLowerCase(),ADMIN_PASSWORD_HASH:salt+':'+scryptSync(password,salt,64).toString('hex'),SESSION_SECRET:randomBytes(48).toString('base64url')};
for(const [name,value] of Object.entries(values)){
 const result=spawnSync('vercel',['env','add',name,'production,preview','--sensitive','--yes','--scope','ecliptix-solutions-projects'],{shell:process.platform==='win32',input:value,encoding:'utf8'});
 if(result.status!==0){const error=(result.stderr||result.stdout||'Failed to configure '+name).split(value).join('[redacted]');throw Error(error);}
 console.log(name+': configured');
}
const local=readFileSync('.env.local','utf8');writeFileSync('.env.local',local+'\n'+Object.entries(values).map(([name,value])=>name+'='+JSON.stringify(value)).join('\n')+'\nSTORAGE_NAMESPACE="development/"\n');
mkdirSync('outputs',{recursive:true});writeFileSync(out,'OM Food and Spices LLP — Vercel admin access\n\nEmail: '+values.ADMIN_OWNER_EMAIL+'\nInitial password: '+password+'\n\nOpen /admin on the new Vercel website. Change this password in Admin → Settings after signing in.\nKeep this file private. It is excluded from GitHub.\n',{mode:0o600});
console.log('Initial login details saved in ignored outputs/vercel-admin-access.txt');
