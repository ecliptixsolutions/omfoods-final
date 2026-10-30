# OM Food and Spices LLP

Industrial onion and garlic website with an integrated admin panel at `/admin`.

## Vercel deployment

The app is configured for the `omfoods-final` project in the `ecliptix-solutions-projects` Vercel team and connected to https://github.com/ecliptixsolutions/omfoods-final.

- Next.js serves the website and API routes on one domain.
- A private Vercel Blob store holds content, role records, manual sales leads, audit history and uploaded files.
- Conditional writes prevent concurrent updates from silently overwriting each other. Content revisions reject stale saves. Reads bypass the Blob CDN cache.
- Admins sign in with email and password. Passwords are salted and scrypt-hashed; signed HTTP-only cookies expire after eight hours. Role checks run server-side. Logout, password changes and role changes invalidate sessions.
- There is no public account-registration or first-admin bootstrap endpoint. The owner is provisioned from server-only environment variables.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Private Vercel Blob store access; set by the Vercel storage integration |
| `ADMIN_OWNER_EMAIL` | Initial administrator email |
| `ADMIN_PASSWORD_HASH` | Initial scrypt hash, in salt:hash format |
| `SESSION_SECRET` | Random server-only signing key of at least 32 characters |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL override; otherwise uses Vercel's production domain |
| `STORAGE_NAMESPACE` | Optional isolated development namespace; leave unset in production |

Initial credentials are saved locally in ignored `outputs/vercel-admin-access.txt`. They are never committed. Change the initial password through Admin → Settings. Team accounts get a temporary password displayed once to the administrator; share it securely. Role revocation is immediate.

Never publish `.env.local`, `.vercel`, storage records or the access file. The application ignores old Sites identity headers.

## Local development

Requires Node.js 22.13 or newer.

```sh
npm ci
# Configure the server-only variables in .env.local.
# Set STORAGE_NAMESPACE=development/ to isolate local tests from production data.
npm run dev -- --port 3000 --hostname 127.0.0.1
```

```sh
npx tsc --noEmit
npm run build
node scripts/check-site.mjs
```

The integration check runs against localhost only and reads the initial access file. It checks authentication, CSRF, storage persistence, stale-save rejection, draft privacy, file access, team roles and logout. QA files stay under the development storage namespace. It restores website content afterward.

## Existing enquiry and WhatsApp

The original enquiry service remains at https://om-food-five.vercel.app/contact. Get Sample and Get Quotation use that same unchanged form. Its submissions do not automatically sync into the manual CRM. The existing verified WhatsApp number and message are preserved.

## Content approvals and limits

Eight source products are public; 20 family/form records and 18 process stages remain drafts pending verification. No certificates, capacities, treatment claims or technical limits are invented. Private, pending, withdrawn and expired PDFs cannot be downloaded publicly. Image/PDF uploads are capped at 3 MB to fit Vercel request limits; file signatures are checked, but malware scanning is not enabled.

The compact private JSON datastore is intended for this small content/sales workspace, not high-volume transaction processing. Audit history retains the latest 2,000 content-save events. For substantially larger teams or workloads, migrate records to a transactional database.

The earlier Sites deployment remains separate and unchanged. Its database/uploads are not automatically copied into Vercel. This deployment starts from the source catalogue and content. Historical Sites runtime helpers remain in source for reference; production uses `next build` and the `vercel.json` configuration.
