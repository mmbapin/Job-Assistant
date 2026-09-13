import {sameOrigin} from '@/lib/request-origin';
import {NextRequest,NextResponse} from 'next/server';
import {readStore,updateStore} from '@/lib/store';
import {Status} from '@/lib/model';
import {validateSource,detectSource} from '@/lib/sources';
export const dynamic='force-dynamic';
export async function GET(){return NextResponse.json(await readStore());}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin'},{status:403});
 try {const b=await req.json();let candidate=b.action==='source'?validateSource(b):null;if(candidate?.url)candidate=await detectSource(candidate);
 const state=await updateStore(s=>{
 if(b.action==='status'){if(!['New','Saved','Applied','Interview','Rejected','Offer','Hidden'].includes(b.status))throw Error('Invalid status');const j=s.jobs.find(j=>j.id===b.id);if(!j)throw Error('Job not found');j.status=b.status as Status;}
 else if(b.action==='profile'){if(typeof b.name!=='string'||!Array.isArray(b.skills)||b.skills.length>30||!b.skills.every((v:unknown)=>typeof v==='string'&&v.length<50)||!Number.isFinite(b.experience)||b.experience<0||b.experience>60)throw Error('Invalid profile');s.profile={name:b.name.slice(0,80),experience:b.experience,skills:b.skills};}
 else if(b.action==='source'&&candidate){if(s.sources.length>=30)throw Error('Maximum 30 sources');if(s.sources.some(x=>candidate!.url?x.url===candidate!.url:x.provider===candidate!.provider&&x.board===candidate!.board))throw Error('Source already exists');s.sources.push(candidate);}
 else if(b.action==='toggleSource'){const source=s.sources.find(x=>x.id===b.id);if(!source)throw Error('Source not found');source.enabled=source.enabled===false;}
 else if(b.action==='deleteSource')s.sources=s.sources.filter(x=>x.id!==b.id);
 else throw Error('Unknown action');});return NextResponse.json(state);
 }catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
}
