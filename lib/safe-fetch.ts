import {resolve4} from 'node:dns/promises';
import {request} from 'node:https';
import {isIP} from 'node:net';
export function publicAddress(ip:string){const p=ip.split('.').map(Number);return p.length===4&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&![0,10,127].includes(p[0])&&!(p[0]===169&&p[1]===254)&&!(p[0]===172&&p[1]>=16&&p[1]<=31)&&!(p[0]===192&&(p[1]===168||p[1]===0||p[1]===2))&&!(p[0]===100&&p[1]>=64&&p[1]<=127)&&!(p[0]===198&&(p[1]===18||p[1]===19||p[1]===51))&&!(p[0]===203&&p[1]===0)&&p[0]<224;}
export function careerUrl(input:string){const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||isIP(u.hostname)||!u.hostname.includes('.')||/\.(localhost|local|internal|test|invalid)$/.test(u.hostname))throw Error('Use a public HTTPS career URL without credentials or a custom port');u.hash='';return u;}
// Resolve once, validate every answer, and pin the connection to prevent DNS rebinding.
export async function safeFetch(input:string,hops=0,followRedirects=true):Promise<{text:string;status:number;url:string;location?:string}>{
 const u=careerUrl(input);const ips=await resolve4(u.hostname);if(!ips.length||ips.some(ip=>!publicAddress(ip)))throw Error('Private or reserved network destinations are not allowed');
 const result=await new Promise<{text:string;status:number;location?:string}>((resolve,reject)=>{
 const req=request(u,{family:4,headers:{'User-Agent':'JobAssistantBot/1.0','Accept':'application/json,text/html,text/plain'},lookup:(_host,_options,cb)=>cb(null,ips[0],4)},res=>{const chunks:Buffer[]=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>5_000_000){res.destroy(Error('Source response exceeds 5 MB'));return;}chunks.push(chunk);});res.on('error',reject);res.on('end',()=>resolve({text:Buffer.concat(chunks).toString('utf8'),status:res.statusCode||500,location:res.headers.location}));});const timer=setTimeout(()=>req.destroy(Error('Source timed out after 20 seconds')),20000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
 });
 if(followRedirects&&result.status>=300&&result.status<400&&result.location){if(hops>=3)throw Error('Too many source redirects');return safeFetch(new URL(result.location,u).href,hops+1);}return {...result,url:u.href};
}
