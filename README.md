# OM Food and Spices LLP

Industrial onion and garlic website with an integrated admin panel at `/admin`.

## Current live website

https://om-food-spices-industrial.workspace-204339.chatgpt.site/

The review deployment is private and requires ChatGPT sign-in. This GitHub repository contains the source code, not the live database, uploaded documents, credentials or customer records.

## Features

- Responsive midnight blue, ivory and gold design with Manrope and Source Sans 3 typography.
- Product catalogue, application pages, product details, quality and document pages.
- Products, pages, process stages and document approval controls in the admin panel.
- Role-based admin access and a manual sales CRM.
- One existing enquiry form for samples and quotations, retaining the original WhatsApp integration.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fuzzy_logan.sql
npm run dev -- --port 5173 --hostname 127.0.0.1
```

Apply the initial migration once to a new local database. Local preview uses the starter's loopback-only mock sign-in. Production authentication is provided by Sites.

## Hosting and Vercel status

This version uses Vinext and Cloudflare Workers, with D1 for database records, R2 for uploaded files and Sites-managed authentication. It is **not yet a Vercel-compatible deployment**. Importing this repository into Vercel without migrating these services will not produce a working full application.

A Vercel migration must replace the runtime/database/file bindings and admin identity provider, update build configuration, configure production secrets securely, and migrate any required live content. Do not trust incoming `oai-authenticated-user-*` headers outside the Sites deployment boundary. Do not enable the first-admin bootstrap on a public Vercel deployment.

The existing enquiry form runs at https://om-food-five.vercel.app/contact and remains unchanged. Its submissions do not automatically sync into the new manual CRM.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for content approval status, checks and remaining integrations. Do not commit `.env` files, `.dev.vars`, database files or upload storage.
