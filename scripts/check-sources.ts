// Run explicitly against the local app to register and verify the requested watchlist.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
async function request(path:string,body?:object){const r=await fetch(base+path,body?{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)}:undefined);const d=await r.json();assert.ok(r.ok,d.error||`HTTP ${r.status}`);return d;}
async function main(){
 const wanted=[['Field Nation','https://jobs.lever.co/fieldnation'],['Tekarsh','https://tekarsh.com/career'],['Cefalo','https://career.cefalo.com/'],['Vivasoft','https://vivasoftltd.com/career/']];
 const current=await request('/api/data');
 for(const [company,url] of wanted){if(!current.sources.some((s:{url:string})=>s.url===url)){await request('/api/data',{action:'source',company,url,category:'Bangladesh',country:'Bangladesh',htmlAllowed:['Cefalo','Vivasoft'].includes(company)});console.log('Registered',company);}}
 const first=await request('/api/sync',{});assert.equal(first.errors,0,JSON.stringify(first.data.sources.map((s:{company:string;error?:string})=>({company:s.company,error:s.error}))));console.log('Collected',first.added,'new jobs');
 const second=await request('/api/sync',{});assert.equal(second.added,0,'Repeated sync should not add duplicates');console.log('Deduplication passed');
 for(const s of second.data.sources)console.log(s.company,s.provider,s.lastCount,'engineering roles');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
