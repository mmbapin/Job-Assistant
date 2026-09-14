import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectRemoteIntegrity} from './collect';
import {classify,Source} from './model';
import {detectSource} from './sources';
const source:Source={id:'ri',company:'Remote Integrity',provider:'Custom API',board:'remoteintegrity-frontend-fullstack',url:'https://careers.remoteintegrity.com/'};
const row={_id:'6aa0658c45e1e5ca67267dad',title:'Full-Stack Developer',company:{name:'Client company'},description:'### Location: Remote, Bangladesh\nBuild React applications.',location:'',allowedCountries:['BD'],status:'Open',isDeleted:false,createdAt:'2026-09-08T19:44:12.520Z',salary:{min:20000,max:30000,currency:'BDT',hideSalary:false}};
const read=(data:unknown,status=200)=>async()=>({text:JSON.stringify(data),status,url:source.url!});
test('Remote Integrity URL detects public API without HTML permission',async()=>{const s=await detectSource(source);assert.equal(s.board,source.board);assert.equal(s.provider,'Custom API');});
test('imports frontend and fullstack titles, excludes closed/deleted and incidental matches',async()=>{
 const jobs=await collectRemoteIntegrity(source,read({success:true,data:[row,{...row,title:'Frontend Engineer'},{...row,title:'Fullstack Engineer'},{...row,status:'Closed'},{...row,isDeleted:true},{...row,title:'Designer',description:'Frontend team'}]}));
 assert.equal(jobs.length,3);const j=jobs[0];assert.equal(j.company,'Client company');assert.equal(j.location,'Remote, Bangladesh');assert.deepEqual(j.allowedCountries,['BD']);assert.equal(j.salary,'BDT 20,000 – 30,000');assert.equal(j.url,source.url+'?job='+row._id);assert.equal(classify(j).group,'Bangladesh');
});
test('respects hidden salary and country restrictions even with worldwide text',async()=>{
 const [job]=await collectRemoteIntegrity(source,read({success:true,data:[{...row,location:'Remote worldwide',allowedCountries:['US'],salary:{...row.salary,hideSalary:true}}]}));
 assert.equal(job.salary,'Not disclosed');assert.equal(classify(job).eligible,false);
});
test('does not invent a location, handles empty listings and reports source errors',async()=>{
 const [job]=await collectRemoteIntegrity(source,read({success:true,data:[{...row,description:'Build software'}]}));assert.equal(job.location,'Not specified');
 assert.deepEqual(await collectRemoteIntegrity(source,read({success:true,data:[]})),[]);
 await assert.rejects(collectRemoteIntegrity(source,read({},503)),/HTTP 503/);
 await assert.rejects(collectRemoteIntegrity(source,read({success:true,data:{}})),/Unexpected/);
 await assert.rejects(collectRemoteIntegrity(source,async()=>({text:'invalid',status:200,url:source.url!})),/valid JSON/);
});
