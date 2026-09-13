import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Job Assistant — Your next chapter',description:'A personal job search workspace for senior engineers.'};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en">
  {/* Browser extensions can add body attributes before hydration. Keep suppression scoped here. */}
  <body suppressHydrationWarning>{children}</body>
 </html>;
}
