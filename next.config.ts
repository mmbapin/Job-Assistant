import type {NextConfig} from 'next';
const config:NextConfig={outputFileTracingRoot:process.cwd(),distDir:process.env.NODE_ENV==='development'?'.next-dev':'.next'};
export default config;
