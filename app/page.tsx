import {getPublicContent} from './content';
import Website from './website';
export const dynamic='force-dynamic';
export async function generateMetadata(){const c=await getPublicContent();return {description:c.settings.seoDescription,openGraph:{title:c.settings.company,description:c.settings.seoDescription,images:['/images/hero.webp']}};}
export default async function Home(){return <Website content={await getPublicContent()} page="home"/>;}
