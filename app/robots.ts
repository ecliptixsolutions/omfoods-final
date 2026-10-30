import {siteUrl} from './site-url';
export default function robots(){return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/api/']},sitemap:siteUrl+'/sitemap.xml'};}
