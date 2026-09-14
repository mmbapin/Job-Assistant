import { promises as fs } from 'node:fs';
import path from 'node:path';
import {Store} from './model';
import {seed} from './seed';
const file=path.join(process.cwd(),'data','store.json');
let queue:Promise<unknown>=Promise.resolve();
export async function readStore():Promise<Store>{try{const state:Store=JSON.parse(await fs.readFile(file,'utf8'));for(const source of state.sources){if(source.provider==='Greenhouse'&&source.board==='agoda'&&source.titleFilter==='frontend'){source.titleFilter='frontend-fullstack';source.detection='Agoda / Greenhouse · Front End + Full Stack titles · All locations';}}return state;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return seed();throw e;}}
export function updateStore(fn:(s:Store)=>void|Promise<void>):Promise<Store>{const task=queue.then(async()=>{const s=await readStore();await fn(s);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(s,null,2));await fs.rename(file+'.tmp',file);return s;});queue=task.catch(()=>{});return task;}
