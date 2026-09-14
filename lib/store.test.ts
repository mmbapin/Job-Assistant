import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {defaultSources} from './default-sources';

test('workspace persists updates, serializes concurrent mutations, and preserves removals',async()=>{
 const cwd=process.cwd();const env={...process.env};const dir=await mkdtemp(path.join(tmpdir(),'job-assistant-store-'));
 try{
  delete process.env.VERCEL;
  delete process.env.ADZUNA_APP_ID;delete process.env.ADZUNA_APP_KEY;
  process.chdir(dir);
  const {readStore,updateStore}=await import('./store');
  const initial=await readStore();assert.ok(initial.sources.length>=9);assert.equal(initial.jobs.length,0);
  await updateStore(s=>{s.sources=[];s.profile.experience=0;});
  await Promise.all(Array.from({length:8},()=>updateStore(async s=>{await new Promise(r=>setTimeout(r,2));s.profile.experience++;})));
  assert.equal((await readStore()).profile.experience,8);assert.deepEqual((await readStore()).sources,[]);
  await assert.rejects(updateStore(s=>{s.profile.experience=99;throw Error('rollback');}),/rollback/);
  assert.equal((await readStore()).profile.experience,8);
  process.env.VERCEL='1';
  assert.equal((await readStore()).temporary,true);assert.ok((await readStore()).sources.length>=9);
  await updateStore(s=>{s.profile.name='Temporary';});
  assert.equal((await readStore()).profile.name,'Temporary');
  const snapshot=await readStore();snapshot.profile.name='Detached';
  assert.equal((await readStore()).profile.name,'Temporary');
  await assert.rejects(updateStore(s=>{s.profile.name='Failed';throw Error('rollback');}),/rollback/);
  assert.equal((await readStore()).profile.name,'Temporary');
  delete process.env.VERCEL;assert.notEqual((await readStore()).profile.name,'Temporary');
 }finally{process.chdir(cwd);process.env=env;await rm(dir,{recursive:true,force:true});}
});

test('Adzuna defaults require both credentials and contain no secrets',()=>{
 const id=process.env.ADZUNA_APP_ID,key=process.env.ADZUNA_APP_KEY;
 try{
  delete process.env.ADZUNA_APP_ID;delete process.env.ADZUNA_APP_KEY;
  assert.equal(defaultSources().some(s=>s.provider==='Adzuna'),false);
  process.env.ADZUNA_APP_ID='test-id';process.env.ADZUNA_APP_KEY='test-secret';
  const sources=defaultSources();assert.equal(sources.find(s=>s.provider==='Adzuna')?.board,'gb');
  assert.equal(JSON.stringify(sources).includes('test-secret'),false);
  assert.equal(new Set(sources.map(s=>s.id)).size,sources.length);
 }finally{if(id===undefined)delete process.env.ADZUNA_APP_ID;else process.env.ADZUNA_APP_ID=id;if(key===undefined)delete process.env.ADZUNA_APP_KEY;else process.env.ADZUNA_APP_KEY=key;}
});
