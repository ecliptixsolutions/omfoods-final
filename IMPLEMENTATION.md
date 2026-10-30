> Vercel migration completed: see README.md for the current runtime, storage, login and upload limit. The notes below describe the earlier Sites review implementation and its original requirements. The existing Sites deployment remains unchanged.

# OM Food and Spices LLP

Midnight blue, warm ivory and champagne gold industrial ingredient website, with a protected content workspace.

## Existing integrations

The source of company details, eight public products and images is https://om-food-five.vercel.app/. `source-provenance.json` records the imported URLs. No code or deployment at that origin was changed.

Get Sample and Get Quotation use the same existing `/contact` enquiry form. Sample buyers select `Sample / Trial Order`. Product links pass the original product **name**, as required by the existing form. Products added later use its `Other product` option. The `/enquiry` page embeds that same form and provides a new-tab fallback. WhatsApp retains the existing verified number and default message.

The original form's database save and WhatsApp submission run at its original origin. They are not duplicated or reimplemented. Original submissions and emails do not automatically sync into the new CRM. Source/backend access is needed for that connection.

## Content workspace

Open `/admin` with ChatGPT sign-in. On the first hosted visit, the owner activates the workspace inside the owner-private Site access boundary. Administrators can manage content, manual sales leads and team roles. Content Editors cannot access the sales CRM or team management. Site viewing access is separate from these application roles.

Eight source listings are public. Twenty family/form records (four families × five forms) are separate unpublished drafts, including garlic records that will replace the imported garlic listings when verified. Unpublish a superseded imported listing when publishing its approved replacement. Published products require a description and image. Draft products and unapproved process stages are removed from data sent to public pages.

Eighteen proposed process stages are prepared for review. Actual process descriptions, quality checkpoints, plant photographs, capacities, technical limits, treatment availability, loading figures and certifications were not available in the source. These remain unclaimed or unpublished. Only verified stages should be approved. No other manufacturer's certification, sustainability statistics, machinery or test limits were copied as company facts.

PDF and image uploads persist in R2. Content, roles, audit events and manual sales records persist in D1. Approved, unexpired PDF documents support view and download. Private, pending, withdrawn and expired documents cannot be downloaded through the public endpoint. Files are limited to 8 MB and signatures are checked; this is format validation, not malware scanning. No public buyer-upload endpoint is enabled.

Manual sales CRM supports stage, priority, owner, next action, separate buyer milestone, follow-up and last-contact dates, notes and filtered CSV export. It does not send email notifications or reminders. CSV exports escape formula-leading values.

## Local development and verification

Run `npm run dev -- --port 5173 --hostname 127.0.0.1` after dependency installation. Local preview uses the starter's loopback-only mock sign-in; hosted identity is managed by Sites.

Generate migrations with `npm run db:generate`. Build with the Sites build helper and apply pending local migrations using the generated `dist/server/wrangler.json`, per the starter workflow. Local data is not uploaded to production.

Checks:

- `npx tsc --noEmit`
- `node scripts/check-site.mjs` against the local development server only. Checks authentication/origin enforcement, persistent edits, draft privacy, invalid URL and duplicate slug rejection, PDF access states, routes and preserved destinations. Restores website content after testing. Test uploads remain only in local R2.
- Browser QA: desktop homepage, mobile homepage/catalogue, product filtering, embedded original form, admin dashboard and original product-name preselection. No real enquiry was submitted or WhatsApp message sent.

## Before a public business launch

This initial publication is owner-private for design review. Keep access private until the owner activates the admin workspace. Verify source product photos and data, upload actual credentials and technical documents, approve plant/process information, connect source lead/email systems if required, and review privacy/terms for the final operating setup. The original Vercel policies remain linked for the original enquiry service. Public launch and replacing the Vercel deployment are separate actions.

Original attachment items retained as later data/integration work include batch-level COA access, buyer uploads and scanning, live email delivery, original-enquiry CRM synchronisation, events/meeting context, export map and verified port/loading/HS information, guide drafts, full page-level SEO overrides, product photo variants and approval dates. The single existing enquiry form supersedes the proposed nine-step quote and seven-step sample forms.
