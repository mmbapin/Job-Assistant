// Next may use an internal hostname in request.url; compare the browser origin
// with the actual Host header so localhost and 127.0.0.1 both work correctly.
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{const u=new URL(origin);return ['http:','https:'].includes(u.protocol)&&u.host===req.headers.get('host');}catch{return false;}}
