import {sameOrigin} from '@/lib/request-origin';
import {NextRequest,NextResponse} from 'next/server';
import {readStore,updateStore} from '@/lib/store';
import {collect} from '@/lib/collect';
import {detectSource} from '@/lib/sources';
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 const state=await readStore();const results=await Promise.all(state.sources.filter(s=>s.enabled!==false).map(async source=>{try{if(source.provider==='Unsupported'&&source.url)source=await detectSource(source);return {source,jobs:await collect(source),error:undefined};}catch(e){return {source,jobs:[],error:(e as Error).message};}}));
 let added=0;const jobIds=new Set<string>();const data=await updateStore(s=>{for(const result of results){const source=s.sources.find(x=>x.id===result.source.id);if(!source||source.enabled===false)continue;Object.assign(source,{provider:result.source.provider,board:result.source.board,region:result.source.region,detection:result.source.detection});source.error=result.error;if(result.error)continue;source.lastSync=new Date().toISOString();source.lastCount=result.jobs.length;for(const job of result.jobs){const existing=s.jobs.find(j=>j.id===job.id||j.url&&j.url===job.url);if(existing)Object.assign(existing,job,{status:existing.status,posted:existing.posted});else{s.jobs.push(job);added++;}jobIds.add(existing?.id||job.id);}}});return NextResponse.json({data,added,jobIds:[...jobIds],errors:results.filter(r=>r.error).length});
}
