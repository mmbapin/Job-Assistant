import {load} from 'cheerio';
import robotsParser from 'robots-parser';
import {Source} from './model';
import {careerUrl,safeFetch} from './safe-fetch';
export function detectATS(input:string):Pick<Source,'provider'|'board'|'region'>|null{
 let u:URL;try{u=careerUrl(input);}catch{return null;}const parts=u.pathname.split('/').filter(Boolean);let provider:Source['provider']|undefined;let board=parts[0];
 if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(u.hostname)){provider='Greenhouse';if(board==='embed')board=u.searchParams.get('for')||'';}
 if(['jobs.lever.co','jobs.eu.lever.co'].includes(u.hostname))provider='Lever';
 if(u.hostname==='jobs.ashbyhq.com')provider='Ashby';
 return provider&&/^[a-zA-Z0-9_-]{1,80}$/.test(board||'')?{provider,board,region:u.hostname==='jobs.eu.lever.co'?'eu':'global'}:null;
}
export async function readCareerPage(url:string,hops=0):Promise<string>{if(hops>3)throw Error('Too many career-page redirects');const u=careerUrl(url);const robots=await safeFetch(new URL('/robots.txt',u).href);if(robots.status!==404){if(robots.status!==200)throw Error(`Cannot verify robots.txt (HTTP ${robots.status})`);if(robotsParser(new URL('/robots.txt',u).href,robots.text).isAllowed(u.href,'JobAssistantBot')===false)throw Error('Collection is disallowed by robots.txt');}
 const page=await safeFetch(u.href,0,false);if(page.status>=300&&page.status<400&&page.location)return readCareerPage(new URL(page.location,u).href,hops+1);if(page.status!==200)throw Error(`Career page returned HTTP ${page.status}`);
 return page.text;
}
export function embeddedATS(html:string,base:string){const $=load(html);for(const el of $('a[href],iframe[src],script[src]').toArray()){const link=$(el).attr('href')||$(el).attr('src');if(link){try{const found=detectATS(new URL(link,base).href);if(found)return found;}catch{/* Ignore malformed embedded URLs. */}}}return null;}
export async function detectSource(source:Source):Promise<Source>{
 const career=new URL(source.url!);
 if(['bracits.com','www.bracits.com'].includes(career.hostname)&&/^\/career\/?$/.test(career.pathname))return {...source,url:'https://www.bracits.com/career/?job__category_spec=engineering',provider:'HTML',board:'bracit-engineering',htmlAllowed:true,category:'Bangladesh',country:'Bangladesh',detection:'BRAC IT · Engineering category · Unexpired openings'};
 if(career.hostname==='careers.optimizely.com'&&/^\/search\/?$/.test(career.pathname))return {...source,url:'https://careers.optimizely.com/search/?q=Senior+Software+Engineer&locationsearch=Dhaka&title=Senior',provider:'HTML',board:'optimizely-senior-dhaka',htmlAllowed:true,category:'Bangladesh',country:'Bangladesh',detection:'Optimizely · Senior Software Engineer titles · Dhaka only'};
 if(['www.wsd.com','wsd.com'].includes(career.hostname)&&/^\/company\/careers\/?$/.test(career.pathname))return {...source,url:'https://www.wsd.com/company/careers',provider:'Custom API',board:'wsd-development-dhaka',category:'Bangladesh',country:'Bangladesh',detection:'WSD / BambooHR · Development department · Dhaka only'};
 if(new URL(source.url!).hostname==='tekarsh.com'&&new URL(source.url!).pathname.startsWith('/career'))return {...source,provider:'Custom API',board:'tekarsh',detection:'Tekarsh public career-page jobs API'};
 const direct=detectATS(source.url!);if(direct)return {...source,...direct,detection:'Public ATS API detected'};
 try{const html=await readCareerPage(source.url!);const ats=embeddedATS(html,source.url!);if(ats)return {...source,...ats,detection:'Public ATS linked from career page'};
 if(source.htmlAllowed)return {...source,provider:'HTML',detection:'HTML fallback: structured JobPosting data or supported company parser'};
 return {...source,provider:'Unsupported',detection:'No supported ATS found. Enable permitted HTML collection to try structured job data.'};
 }catch(e){return {...source,provider:'Unsupported',detection:(e as Error).message};}
}
export function validateSource(b:Record<string,unknown>):Source{
 if(typeof b.company!=='string'||!b.company.trim())throw Error('Company name is required');
 const source:Source={id:crypto.randomUUID(),company:b.company.trim().slice(0,80),board:'',provider:'Unsupported',country:typeof b.country==='string'?b.country.slice(0,50):'Bangladesh',category:b.category==='Global'?'Global':'Bangladesh',enabled:true,htmlAllowed:b.htmlAllowed===true};
 if(typeof b.url==='string'&&b.url){const input=new URL(b.url);if(input.protocol==='http:'&&['bracits.com','www.bracits.com'].includes(input.hostname)&&/^\/career\/?$/.test(input.pathname))input.protocol='https:';source.url=careerUrl(input.href).href;return source;}
 if(!['Greenhouse','Lever','Ashby','Adzuna'].includes(String(b.provider))||typeof b.board!=='string'||! /^[a-zA-Z0-9_-]{1,80}$/.test(b.board))throw Error('Enter a career URL or a supported provider and board slug');
 source.provider=b.provider as Source['provider'];source.board=b.board;
 if(source.provider==='Adzuna'&&!['gb','us','au','at','br','ca','de','fr','in','it','nl','nz','pl','ru','sg','za','es','ch','be','mx'].includes(source.board))throw Error('Select a supported Adzuna country code; Bangladesh is not supported');
 return source;
}
