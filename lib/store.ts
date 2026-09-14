import { promises as fs } from 'node:fs';
import path from 'node:path';
import {Store} from './model';
import {seed} from './seed';
import {defaultSources} from './default-sources';
const file=path.join(process.cwd(),'data','store.json');
let queue:Promise<unknown>=Promise.resolve();
let memory:Store|undefined;
function initialStore():Store{return {...seed(),jobs:[],sources:defaultSources()};}
function migrate(state:Store):Store{
 for(const source of state.sources){if(source.provider==='Greenhouse'&&source.board==='agoda'&&source.titleFilter==='frontend'){source.titleFilter='frontend-fullstack';source.detection='Agoda / Greenhouse · Front End + Full Stack titles · All locations';}}
 return state;
}
export async function readStore():Promise<Store>{
 if(process.env.VERCEL){memory??={...initialStore(),temporary:true};return structuredClone(memory);}
 try{return migrate(JSON.parse(await fs.readFile(file,'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return initialStore();throw e;}
}
export async function updateStore(fn:(s:Store)=>void|Promise<void>):Promise<Store>{
 const task=queue.then(async()=>{const s=await readStore();await fn(s);if(process.env.VERCEL){memory=structuredClone(s);return s;}await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(s,null,2));await fs.rename(file+'.tmp',file);return s;});queue=task.catch(()=>{});return task;
}
