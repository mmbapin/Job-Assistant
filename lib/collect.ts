import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {allSkills,Job,Source} from './model';
import {safeFetch} from './safe-fetch';
import {readCareerPage} from './sources';
import {collectWsd} from './wsd';
export function plain(s:string){return load(s).text().replace(/\s+/g,' ').trim();}
function date(value:unknown){const d=new Date(typeof value==='number'||typeof value==='string'?value:NaN);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
export function normalize(source:Source,r:Record<string,any>):Job{
 const title=String(r.title||r.text||r.name||'');const description=plain(r.content||r.descriptionPlain||r.descriptionHtml||r.description||'')+(Array.isArray(r.lists)?' '+r.lists.map((l:Record<string,string>)=>plain(`${l.text} ${l.content}`)).join(' '):'');
 const combined=title+' '+description;const link=r.absolute_url||r.hostedUrl||r.jobUrl||r.redirect_url||r.url||'';
 const locations=Array.isArray(r.jobLocation)?r.jobLocation:[r.jobLocation];const schemaLocation=locations.filter(Boolean).map(l=>[l.address?.addressLocality,l.address?.addressRegion,typeof l.address?.addressCountry==='object'?l.address.addressCountry.name:l.address?.addressCountry].filter(Boolean).join(', ')).join(' / ');
 return {id:`${source.provider}-${source.board||source.id}-${r.id||createHash('sha256').update(link||title).digest('hex').slice(0,20)}`,title,company:r.company?.display_name||source.company,location:r.location?.name||r.location?.display_name||(typeof r.location==='string'?r.location:undefined)||r.categories?.location||schemaLocation||'Not specified',description,skills:allSkills.filter(s=>new RegExp(`(^|[^a-z])${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`,'i').test(combined)),level:/staff/i.test(title)?'Staff':/lead|architect/i.test(title)?'Lead':/senior/i.test(title)?'Senior':'Other',posted:date(r.first_published||r.publishedAt||r.datePosted||r.createdAt||r.created),url:/^https:\/\//.test(link)?link:'',salary:r.compensation?.scrapeableCompensationSalarySummary||'Not disclosed',source:source.id,status:'New'};
}
export function structuredJobs(html:string):Record<string,any>[] {const $=load(html);const jobs:Record<string,any>[]=[];function visit(v:unknown){if(Array.isArray(v)){v.forEach(visit);return;}if(!v||typeof v!=='object')return;const obj=v as Record<string,any>;if([obj['@type']].flat().includes('JobPosting'))jobs.push(obj);else Object.values(obj).forEach(visit);}$('script[type="application/ld+json"]').each((_i,el)=>{try{visit(JSON.parse($(el).html()||''));}catch{/* Other invalid metadata should not hide valid postings. */}});return jobs;}
export function companyLinks(html:string,url:string){const $=load(html);const u=new URL(url);const links=new Set<string>();if(u.hostname==='career.cefalo.com')$('a[href^="/job/"]').each((_i,el)=>{links.add(new URL($(el).attr('href')!,u).href);});if(['vivasoftltd.com','www.vivasoftltd.com'].includes(u.hostname))$('a[href]').each((_i,el)=>{try{const link=new URL($(el).attr('href')!,u);if(link.origin===u.origin&&/^\/career\/[^/]+\/?$/.test(link.pathname))links.add(link.href);}catch{}});return [...links];}
async function htmlJobs(source:Source){if(!source.htmlAllowed)throw Error('HTML collection has not been enabled for this source');const html=await readCareerPage(source.url!);const structured=structuredJobs(html);if(structured.length)return structured.map(r=>normalize(source,{...r,url:r.url||source.url}));
 const links=companyLinks(html,source.url!);if(!links.length)throw Error('No supported job data found. This page may need a site-specific API/parser or may have no openings.');
 const result:Job[]=[];for(const link of links.slice(0,25)){const detail=await readCareerPage(link);const schema=structuredJobs(detail);if(schema.length){result.push(...schema.map(r=>normalize(source,{...r,url:r.url||link})));continue;}const $=load(detail);$('script,style,nav,footer,header').remove();const title=$('h1').first().text().trim()||(['vivasoftltd.com','www.vivasoftltd.com'].includes(new URL(link).hostname)?$('h2,h3').first().text().trim():'');const description=$('main').text().trim()||$('body').text().trim();if(!title)throw Error('Company page layout changed: missing job title');const location=/Dhaka|Bangladesh/i.test(description)?'Dhaka, Bangladesh':'Not specified';result.push(normalize(source,{title,description,location,url:link}));}return result;}
export async function collect(source:Source):Promise<Job[]>{
 if(source.provider==='Unsupported')throw Error(source.detection||'No supported interface detected');
 if(source.provider==='Custom API'){
  if(source.board==='wsd-development-dhaka')return (await collectWsd()).map(row=>normalize(source,row));
  if(source.board!=='tekarsh')throw Error('Unknown custom API adapter');
  const body=JSON.parse(await readCareerPage('https://tekarsh.com/api/admin/jobs?limit=1000'));const rows=body.jobs||body;if(!Array.isArray(rows))throw Error('Unexpected Tekarsh API response');
  return rows.filter((r:Record<string,any>)=>r.status==='active'&&(!r.deadline||Date.parse(r.deadline)>=Date.now())&&/engineer|developer|architect|tech lead/i.test(r.title||'')).map((r:Record<string,any>)=>normalize(source,{id:r._id,title:r.title,description:[r.introduction,...(r.responsibilities||[]),...(r.qualifications||[]),...(r.technicalSkills||[]),...(r.benefits||[])].join(' '),location:r.workLocation,createdAt:r.postedDate||r.createdAt,url:r.slug?`https://tekarsh.com/career/job/${encodeURIComponent(r.slug)}`:source.url}));
 }
 if(source.provider==='HTML'&&source.board==='bracit-engineering')return collectEngineeringCareer(source);
 if(source.provider==='HTML'&&source.board==='optimizely-senior-dhaka')return collectCareerSearch(source);
 if(source.provider==='HTML')return (await htmlJobs(source)).filter(j=>/engineer|developer|tech lead|architect/i.test(j.title));
 let url:string;
 if(source.provider==='Greenhouse')url=`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.board)}/jobs?content=true`;
 else if(source.provider==='Lever')url=`https://${source.region==='eu'?'api.eu.lever.co':'api.lever.co'}/v0/postings/${encodeURIComponent(source.board)}?mode=json`;
 else if(source.provider==='Ashby')url=`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.board)}?includeCompensation=true`;
 else if(source.provider==='Adzuna'){if(!process.env.ADZUNA_APP_ID||!process.env.ADZUNA_APP_KEY)throw Error('Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.local, then restart the server');const params=new URLSearchParams({app_id:process.env.ADZUNA_APP_ID,app_key:process.env.ADZUNA_APP_KEY,what:'software engineer',results_per_page:'50','content-type':'application/json'});url=`https://api.adzuna.com/v1/api/jobs/${source.board}/search/1?${params}`;}
 else throw Error('Unsupported provider');
 let res:Awaited<ReturnType<typeof safeFetch>>;try{res=await safeFetch(url);}catch{throw Error('Could not reach the source API. Check network access and retry.');}if(res.status!==200)throw Error(`Board returned HTTP ${res.status}`);
 let body;try{body=JSON.parse(res.text);}catch{throw Error('Source did not return valid JSON');}const rows=source.provider==='Lever'?body:source.provider==='Adzuna'?body.results:body.jobs;if(!Array.isArray(rows))throw Error('Unexpected board response');
 return rows.filter(r=>r&&typeof r==='object'&&r.isListed!==false&&/engineer|developer|tech lead|architect/i.test(r.title||r.text||'')).map(r=>normalize(source,r));
}


// SuccessFactors-style career search pages: scope matching to result rows,
// never to incidental keywords elsewhere in the page or description.
export function parseCareerSearch(html:string,base:string){
 const $=load(html);
 if(!$('#searchresults').length)throw Error('Career search layout changed: search results table is missing');
 const rows=$('#searchresults tr.data-row');
 const totalText=$('.paginationLabel').first().find('b').last().text().replaceAll(',','').trim();
 const total=totalText?Number(totalText):rows.length;
 if(!Number.isFinite(total)||total<rows.length)throw Error('Invalid career-search result count');
 const jobs=rows.toArray().map(el=>{
  const row=$(el);const anchor=row.find('a.jobTitle-link').first();
  const title=anchor.text().trim();const href=anchor.attr('href');
  const location=row.find('.colLocation .jobLocation').first().text().replace(/\s+/g,' ').trim();
  if(!title||!href||!location)throw Error('Career search layout changed: missing title, link, or location');
  const url=new URL(href,base);
  if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/job/'))throw Error('Unexpected career job URL');
  return {title,location,url:url.href,datePosted:row.find('.jobDate').first().text().trim()};
 });
 return {total,jobs};
}
export function matchesSeniorDhaka(job:{title:string;location:string}){
 return /\bsenior\s+software\s+engineer\b/i.test(job.title)&&/^Dhaka(?:\s*,|$)/i.test(job.location.trim());
}
export async function collectCareerSearch(source:Source,read:typeof readCareerPage=readCareerPage):Promise<Job[]>{
 if(!source.htmlAllowed)throw Error('HTML collection is not enabled for this source');
 const base='https://careers.optimizely.com/search/?q=Senior+Software+Engineer&locationsearch=Dhaka&title=Senior';
 const found=new Map<string,Job>();const seen=new Set<string>();let offset=0;
 for(let page=0;page<10;page++){
  const url=new URL(base);if(offset)url.searchParams.set('startrow',String(offset));
  const result=parseCareerSearch(await read(url.href),base);
  for(const row of result.jobs){if(seen.has(row.url))throw Error('Career search pagination repeated a result');seen.add(row.url);}
  for(const row of result.jobs.filter(matchesSeniorDhaka)){
   if(found.has(row.url))continue;
   const detail=load(await read(row.url));
   const title=detail('[itemprop="title"]').first().text().trim()||detail('h1').first().text().trim();
   const description=detail('[itemprop="description"]').first().html()||detail('.jobdescription').first().html();
   if(!description||!title)throw Error('Career job detail layout changed or the opening is no longer available');
   const location=detail('.jobGeoLocation').first().text().trim()||detail('[itemprop="streetAddress"]').attr('content')||row.location;
   if(!matchesSeniorDhaka({title,location}))continue;
   found.set(row.url,normalize(source,{...row,title,location,description}));
  }
  offset+=result.jobs.length;
  if(offset>=result.total)return [...found.values()];
  if(!result.jobs.length)throw Error('Career search pagination returned an incomplete result');
 }
 throw Error('Career search exceeded the 10-page collection limit');
}


export function careerDeadline(value:string):number{
 const parts=value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 if(!parts)throw Error('Unrecognized career deadline');
 const month=months.indexOf(parts[2].slice(0,3).toLowerCase());const day=Number(parts[1]);const year=Number(parts[3]);
 const date=new Date(Date.UTC(year,month,day));
 if(month<0||day<1||date.getUTCMonth()!==month||date.getUTCDate()!==day)throw Error('Invalid career deadline');
 // Application dates remain open through the end of that day in Bangladesh.
 return date.getTime()+18*3600000-1;
}
export function parseEngineeringCareer(html:string,now=Date.now()){
 const $=load(html);const selected=$('.awsm-job-category-filter-option option[selected]').attr('data-slug');
 if(selected!=='engineering'||!$('.awsm-job-listings').length)throw Error('Engineering career layout changed or the category filter was not applied');
 if($('.awsm-jobs-pagination,.awsm-job-pagination,.awsm-load-more').length)throw Error('Engineering career page requires pagination support before all jobs can be collected');
 return $('.awsm-job-listing-item').toArray().flatMap(el=>{
  const row=$(el);const title=row.find('.awsm-job-post-title').text().trim();const href=row.find('a.awsm-job-item').attr('href');
  const location=row.find('.awsm-job-specification-job-location .awsm-job-specification-term').text().trim();
  const deadline=row.find('.awsm-job-specification-deadline .awsm-job-specification-term').text().trim();
  if(!title||!href||!location||!deadline)throw Error('Engineering job card is missing required fields');
  if(careerDeadline(deadline)<now)return [];
  const url=new URL(href,'https://www.bracits.com');
  if(url.protocol!=='https:'||!['bracits.com','www.bracits.com'].includes(url.hostname)||!/^\/jobs\/[^/]+\/?$/.test(url.pathname))throw Error('Unexpected engineering job URL');
  return [{title,location,url:url.href}];
 });
}
export async function collectEngineeringCareer(source:Source,read:typeof readCareerPage=readCareerPage,now=Date.now()):Promise<Job[]>{
 if(!source.htmlAllowed)throw Error('HTML collection is not enabled for this source');
 const rows=parseEngineeringCareer(await read('https://www.bracits.com/career/?job__category_spec=engineering'),now);
 const jobs:Job[]=[];
 for(const row of rows){
  const html=await read(row.url);const schema=structuredJobs(html)[0];
  if(!schema||typeof schema.description!=='string'||!schema.title)throw Error('Engineering job detail is missing JobPosting data');
  const headings=load(schema.description)('h2').toArray();const values=headings.map(el=>load(el).text().trim());
  const departments=values.flatMap((value,i)=>/^Department:$/i.test(value)?[values[i+1]]:[]);
  const deadlines=values.flatMap((value,i)=>/^Deadline:$/i.test(value)?[values[i+1]]:[]);
  if(!departments.length||!deadlines.length)throw Error('Engineering job detail is missing department or deadline');
  if(departments.some(d=>d?.toLowerCase()!=='engineering')||deadlines.some(d=>careerDeadline(d)<now))continue;
  const location=typeof schema.jobLocation?.address==='string'?schema.jobLocation.address:row.location;
  jobs.push(normalize(source,{...schema,location,url:row.url}));
 }
 return jobs;
}
