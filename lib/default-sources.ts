import {Source} from './model';

// Only used when creating a new workspace; removals and pauses remain saved.
export function defaultSources():Source[]{
 const rows:Source[]=[
  {id:'default-agoda',company:'Agoda',provider:'Greenhouse',board:'agoda',titleFilter:'frontend-fullstack',url:'https://careersatagoda.com/vacancies/',category:'Global'},
  {id:'default-remoteintegrity',company:'Remote Integrity',provider:'Custom API',board:'remoteintegrity-frontend-fullstack',url:'https://careers.remoteintegrity.com/',category:'Bangladesh'},
  {id:'default-fieldnation',company:'Field Nation',provider:'Lever',board:'fieldnation',url:'https://jobs.lever.co/fieldnation',category:'Bangladesh'},
  {id:'default-wsd',company:'WSD',provider:'Custom API',board:'wsd-development-dhaka',url:'https://www.wsd.com/company/careers',category:'Bangladesh'},
  {id:'default-tekarsh',company:'Tekarsh',provider:'Custom API',board:'tekarsh',url:'https://tekarsh.com/career',category:'Bangladesh'},
  {id:'default-optimizely',company:'Optimizely',provider:'HTML',board:'optimizely-senior-dhaka',url:'https://careers.optimizely.com/search/?q=Senior+Software+Engineer&locationsearch=Dhaka&title=Senior',htmlAllowed:true,category:'Bangladesh'},
  {id:'default-bracit',company:'BRAC IT',provider:'HTML',board:'bracit-engineering',url:'https://www.bracits.com/career/?job__category_spec=engineering',htmlAllowed:true,category:'Bangladesh'},
  {id:'default-cefalo',company:'Cefalo',provider:'HTML',board:'',url:'https://career.cefalo.com/',htmlAllowed:true,category:'Bangladesh'},
  {id:'default-vivasoft',company:'Vivasoft',provider:'HTML',board:'',url:'https://vivasoftltd.com/career/',htmlAllowed:true,category:'Bangladesh'},
 ];
 if(process.env.ADZUNA_APP_ID&&process.env.ADZUNA_APP_KEY)rows.push({id:'default-adzuna-gb',company:'Adzuna UK',provider:'Adzuna',board:'gb',category:'Global'});
 return rows.map(s=>({...s,enabled:true,country:s.category==='Bangladesh'?'Bangladesh':'Global'}));
}
