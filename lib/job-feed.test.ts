import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from './seed';
import {failedFeed,feedJobs,resolveFeed} from './job-feed';
const demo=seed();const live={...demo.jobs[0],id:'real-1',demo:false};
const data={...demo,jobs:[...demo.jobs,live],sources:[{id:'source',company:'Company',provider:'Lever' as const,board:'company',enabled:true}]};
test('successful real results exclude persisted demo jobs',()=>{const f=resolveFeed(data,[live.id],0);assert.equal(f.mode,'live');assert.equal(f.message,'');assert.deepEqual(feedJobs(data,f,demo.jobs),[live]);});
test('zero fresh jobs falls back even if old real jobs are stored',()=>{const f=resolveFeed(data,[],0);assert.equal(f.reason,'empty');assert.deepEqual(feedJobs(data,f,demo.jobs),demo.jobs);assert.ok(data.jobs.includes(live));});
test('source failures with no results explain demo fallback',()=>{const f=resolveFeed(data,[],1);assert.equal(f.reason,'error');assert.match(f.message,/failed/);assert.ok(feedJobs(data,f,demo.jobs).every(j=>j.demo));});
test('partial source failure keeps useful real jobs and reports warning',()=>{const f=resolveFeed(data,[live.id],1);assert.equal(f.reason,'partial');assert.equal(f.mode,'live');assert.match(f.message,/1 source could not/);});
test('no active sources gets actionable setup feedback',()=>{const f=resolveFeed({...data,sources:data.sources.map(s=>({...s,enabled:false}))},[],0);assert.equal(f.reason,'no-sources');assert.match(f.message,/Add or enable/);});
test('network error produces a demo state and a successful retry clears it',()=>{assert.equal(failedFeed().mode,'demo');assert.match(failedFeed().message,/API could not be reached/);assert.equal(resolveFeed(data,[live.id],0).message,'');});
test('hiding or filtering real jobs does not activate demos',()=>{const hidden={...data,jobs:[{...live,status:'Hidden' as const}]};assert.equal(resolveFeed(hidden,[live.id],0).mode,'live');});

test('loader calls workspace API then collection and returns only fresh IDs',async()=>{const {fetchJobFeed}=await import('./job-feed');const calls:string[]=[];const result=await fetchJobFeed(async(input)=>{calls.push(String(input));return Response.json(calls.length===1?data:{data,jobIds:[live.id],errors:0});});assert.deepEqual(calls,['/api/data','/api/sync']);assert.equal(result.feed.mode,'live');});
test('HTTP failure exits loading into demos with the HTTP status',async()=>{const {fetchJobFeed}=await import('./job-feed');const result=await fetchJobFeed(async()=>new Response('Service unavailable',{status:503}));assert.equal(result.feed.mode,'demo');assert.match(result.feed.message,/503/);assert.equal(result.data,undefined);});
test('collection failure preserves the loaded workspace',async()=>{const {fetchJobFeed}=await import('./job-feed');let calls=0;const result=await fetchJobFeed(async()=>++calls===1?Response.json(data):new Response('Error',{status:500}));assert.equal(result.feed.reason,'error');assert.equal(result.data?.profile.name,data.profile.name);assert.equal(result.data?.jobs.length,data.jobs.length);});
test('timeout and invalid JSON have explicit feedback',async()=>{const {fetchJobFeed}=await import('./job-feed');const timeout=await fetchJobFeed(async()=>{throw new DOMException('Timed out','TimeoutError');});assert.match(timeout.feed.message,/timed out/);const invalid=await fetchJobFeed(async()=>new Response('<html>error</html>'));assert.match(invalid.feed.message,/invalid response/);});
test('empty API results lead to demos without a false error message',async()=>{const {fetchJobFeed}=await import('./job-feed');let calls=0;const result=await fetchJobFeed(async()=>Response.json(++calls===1?data:{data,jobIds:[],errors:0}));assert.equal(result.feed.reason,'empty');assert.match(result.feed.message,/responded successfully/);});
