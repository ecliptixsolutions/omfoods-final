import {getPublicContent} from './content';
export const dynamic='force-dynamic';
export default async function sitemap(){const c=await getPublicContent();const base='https://om-food-spices-industrial.workspace-204339.chatgpt.site';return ['', '/about','/products','/applications','/plant','/process','/quality','/certificates','/documents','/packaging','/responsibility','/enquiry','/faq',...c.products.map(p=>'/products/'+p.slug)].map(path=>({url:base+path}));}
