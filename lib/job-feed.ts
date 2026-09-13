import {Job,Store} from './model';
export type FeedState = {mode:'live'|'demo'; reason:'success'|'partial'|'error'|'empty'|'no-sources'; message:string; jobIds:string[]};
export function resolveFeed(data:Store,jobIds:string[],errors:number):FeedState{
 const ids=jobIds.filter(id=>data.jobs.some(j=>j.id===id&&!j.demo));
 if(ids.length)return {mode:'live',reason:errors?'partial':'success',message:errors?`${errors} source${errors===1?'':'s'} could not be fetched. Showing real jobs from the sources that responded. Check Sources for details.`:'',jobIds:ids};
 if(!data.sources.some(s=>s.enabled!==false))return {mode:'demo',reason:'no-sources',message:'No active job sources are connected. Showing fictional demo jobs. Add or enable a source to fetch real opportunities.',jobIds:[]};
 if(errors)return failedFeed('One or more job sources failed and no real jobs were returned. Check Sources for details.');
 return {mode:'demo',reason:'empty',message:'The job sources responded successfully but returned no engineering jobs. Showing fictional demo jobs for now. Try again later or add another source.',jobIds:[]};
}
export function failedFeed(detail='The real-job API could not be reached. Please check your connection and try again.'):FeedState{return {mode:'demo',reason:'error',message:`${detail} Showing fictional demo jobs for now.`,jobIds:[]};}
export function feedJobs(data:Store,feed:FeedState,demoJobs:Job[]):Job[]{return feed.mode==='demo'?demoJobs:data.jobs.filter(j=>!j.demo&&feed.jobIds.includes(j.id));}

function isStore(value:unknown):value is Store{
 const d=value as Store|undefined;
 return !!d&&Array.isArray(d.jobs)&&Array.isArray(d.sources)&&!!d.profile&&typeof d.profile.name==='string'&&Array.isArray(d.profile.skills);
}
export async function fetchJobFeed(request:typeof fetch=fetch):Promise<{data?:Store;feed:FeedState}>{
 let data:Store|undefined;
 let failure='The real-job API could not be reached. Check your connection and retry.';
 try{
  const initial=await request('/api/data',{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!initial.ok){failure=`The real-job API returned HTTP ${initial.status}. Please retry.`;throw Error(failure);}
  failure='The real-job API returned an invalid response. Please retry.';
  const workspace:unknown=await initial.json();if(!isStore(workspace))throw Error(failure);data=workspace;
  if(!data.sources.some(s=>s.enabled!==false))return {data,feed:resolveFeed(data,[],0)};
  failure='The real-job collection request failed. Check your connection and retry.';
  const response=await request('/api/sync',{method:'POST',signal:AbortSignal.timeout(60000)});
  if(!response.ok){failure=`Real-job collection returned HTTP ${response.status}. Please retry.`;throw Error(failure);}
  failure='Real-job collection returned an invalid response. Please retry.';
  const result=await response.json();
  if(!isStore(result.data)||!Array.isArray(result.jobIds)||!result.jobIds.every((id:unknown)=>typeof id==='string')||!Number.isInteger(result.errors)||result.errors<0)throw Error(failure);
  return {data:result.data,feed:resolveFeed(result.data,result.jobIds,result.errors)};
 }catch(error){
  if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))failure='Fetching real jobs timed out. Please retry.';
  return {data,feed:failedFeed(failure)};
 }
}
