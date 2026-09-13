import test from 'node:test';
import assert from 'node:assert/strict';
import {collectWsd,isWsdMatch} from './wsd';
import {detectSource,validateSource} from './sources';
const opening={id:'257',jobOpeningName:'Senior Java Engineer',departmentLabel:'Development',location:{city:'Dhaka',addressCountry:'Bangladesh'},description:'Java and Spring Boot',jobOpeningStatus:'Open'};
test('WSD matches department and city, regardless of programming language or role title',()=>{
 assert.equal(isWsdMatch(opening),true);
 assert.equal(isWsdMatch({...opening,jobOpeningName:'QA Analyst'}),true);
 assert.equal(isWsdMatch({...opening,departmentLabel:'Platform Engineering'}),false);
 assert.equal(isWsdMatch({...opening,location:{city:'London'}}),false);
 assert.equal(isWsdMatch({...opening,location:{city:'Dhaka North'}}),false);
 assert.equal(isWsdMatch({...opening,departmentLabel:' development ',location:{city:' DHAKA '}}),true);
});
test('WSD source URL automatically applies Bangladesh scope',async()=>{
 const source=await detectSource(validateSource({company:'WSD',url:'https://www.wsd.com/company/careers#roles'}));
 assert.equal(source.board,'wsd-development-dhaka');assert.equal(source.category,'Bangladesh');
});
test('only matching WSD details are fetched and normalized with original link',async()=>{
 const calls:string[]=[];
 const jobs=await collectWsd(async url=>{calls.push(url);return JSON.stringify(url.endsWith('/list')?{meta:{totalCount:3},result:[opening,{...opening,id:'258',departmentLabel:'Platform Engineering'},{...opening,id:'252',location:{city:'London'}}]}:{result:{jobOpening:opening}});});
 assert.equal(calls.length,2);assert.equal(jobs.length,1);assert.equal(jobs[0].title,'Senior Java Engineer');assert.equal(jobs[0].url,'https://wsd.bamboohr.com/careers/257');assert.equal(jobs[0].description,'Java and Spring Boot');
});
test('closed or moved openings are excluded after detail verification',async()=>{
 for(const changed of [{...opening,jobOpeningStatus:'Closed'},{...opening,location:{city:'London'}}]){
 const jobs=await collectWsd(async url=>JSON.stringify(url.endsWith('/list')?{result:[opening]}:{result:{jobOpening:changed}}));assert.equal(jobs.length,0);
 }
});
test('empty WSD list is valid, malformed or partial lists fail visibly',async()=>{
 assert.deepEqual(await collectWsd(async()=>JSON.stringify({result:[]})),[]);
 await assert.rejects(()=>collectWsd(async()=>JSON.stringify({error:'Unavailable'})),/Unexpected/);
 await assert.rejects(()=>collectWsd(async()=>JSON.stringify({meta:{totalCount:10},result:[]})),/incomplete/);
});
