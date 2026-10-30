import {notFound} from 'next/navigation';
import {getPublicContent} from '../content';
import Website from '../website';
export const dynamic='force-dynamic';
const pages=['about','products','applications','plant','process','quality','certificates','documents','packaging','responsibility','contact','enquiry','faq','privacy','terms','dehydrated-onions','quality-sourcing'];
export async function generateMetadata({params}:{params:Promise<{path:string[]}>}){const {path}=await params;const c=await getPublicContent();const product=path[0]==='products'&&path[1]?c.products.find(p=>p.slug===path[1]):null;const title=product?.name||path.map(x=>x.replaceAll('-',' ')).join(' · ').replace(/\b\w/g,c=>c.toUpperCase());const description=product?.description||c.pages[path[0]]?.intro||c.settings.seoDescription;return {title,description,alternates:{canonical:'/'+path.join('/')},openGraph:{title,description,images:[product?.image||'/images/hero.webp']}};}
export default async function Page({params}:{params:Promise<{path:string[]}>}){
const {path}=await params;const content=await getPublicContent();
if(path.length===2&&path[0]==='products'){const product=content.products.find(p=>p.slug===path[1]&&p.published);if(!product)notFound();return <Website content={content} page="product" slug={product.slug}/>;}
if(path.length!==1||!pages.includes(path[0]))notFound();
const page=path[0]==='dehydrated-onions'?'products':path[0]==='quality-sourcing'?'quality':path[0]==='contact'?'enquiry':path[0];
return <Website content={content} page={page}/>;}
