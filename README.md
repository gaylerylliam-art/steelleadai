# SteelLead AI

Lead generation assistant for structural steel trading sales teams in Dubai and the UAE.

## Features

- Lead database with contact details, emirate, industry, project type, products, status, notes, and follow-up date.
- 0-100 lead scoring based on industry match, project size, urgency, location, past inquiry, and product fit.
- Sales pipeline statuses: New Lead, Contacted, Quotation Sent, Negotiation, Won, Lost.
- Dashboard metrics plus leads by emirate and industry.
- Search and filters for emirate, industry, status, score, and product requirement.
- CSV import and manual lead entry.
- AI outreach generator for cold email, LinkedIn, WhatsApp, and follow-up messages.
- Supabase Auth with sign up, login, logout, and protected dashboard access.
- Per-user lead storage enforced by Supabase row level security.
- Supabase schema and seed data.

## Compliance

This app does not scrape websites. It supports manual entry, CSV import, and optional public-source enrichment only when source terms, privacy requirements, and UAE/local regulations permit it.

## Tech Stack

- Next.js App Router
- React
- Tailwind CSS
- Supabase
- OpenAI API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

3. In Supabase SQL Editor, run:

```bash
supabase/schema.sql
```

For an existing database created from the earlier SteelLead AI schema, run `supabase/auth-migration.sql` to replace the old broad RLS policies with per-user policies.

4. In Supabase Authentication settings:

- Enable Google as an Auth provider and add your Google OAuth client ID and secret.
- Add `http://localhost:3000` to Site URL or Redirect URLs for local development.
- Add your Vercel production URL after deployment, for example `https://your-app.vercel.app`.

5. Optional sample data:

The app stores leads per authenticated user. To seed sample rows for a real user, first sign up in the app, find that user's `auth.users.id` in Supabase, then adapt `supabase/seed.sql` to include that UUID in the `created_by` column.

6. Start the development server:

```bash
npm run dev
```

7. Open `http://localhost:3000`.

## Vercel Environment Variables

Set these in Vercel under Project Settings -> Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SITE_URL=https://your-vercel-app.vercel.app
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

After deployment, update Supabase Authentication URL settings:

- Site URL: your Vercel app URL, such as `https://steelleadai.vercel.app`
- Redirect URLs: include the same production URL and any preview URLs you want to support

For Google login, also add the Supabase Google callback URL shown in Supabase Auth provider settings to your Google Cloud OAuth client authorized redirect URIs.

## Google Login Checklist

If Google login shows `Unsupported provider: provider is not enabled`, the app is reaching Supabase but the Google provider is not enabled/configured in the Supabase project connected by `NEXT_PUBLIC_SUPABASE_URL`.

Supabase dashboard:

- Go to Authentication -> Providers -> Google.
- Turn Google provider on.
- Paste the Google OAuth Web Client ID.
- Paste the Google OAuth Web Client Secret.
- Save the provider.
- Go to Authentication -> URL Configuration.
- Site URL local: `http://localhost:3000`
- Site URL production: `https://your-vercel-app.vercel.app`
- Redirect URLs: add `http://localhost:3000`, `http://localhost:3000/`, `https://your-vercel-app.vercel.app`, and `https://your-vercel-app.vercel.app/`.
- For Vercel preview deploys, also add `https://*.vercel.app/**` or the exact preview URLs you use.

Google Cloud dashboard:

- Go to Google Auth Platform -> Clients.
- Create or edit an OAuth Client ID.
- Application type: Web application.
- Authorized JavaScript origins: add `http://localhost:3000` and `https://your-vercel-app.vercel.app`.
- Authorized redirect URIs: add the Supabase callback URL from Supabase Authentication -> Providers -> Google. It should look like `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`.
- Make sure the OAuth consent screen has scopes `openid`, user email, and user profile.

Vercel:

- `NEXT_PUBLIC_SUPABASE_URL` must be the same Supabase project where Google provider is enabled.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the anon public key from that same project.
- `NEXT_PUBLIC_SITE_URL` should be your production app URL with `https://`.
- Redeploy after changing environment variables.

## CSV Import Format

The importer accepts headers such as:

```csv
companyName,contactPerson,jobTitle,email,phone,emirate,industry,projectType,projectSize,productsRequired,leadSource,status,notes,urgency,pastInquiry,nextFollowUp
ABC Contracting,Ali Khan,Procurement Manager,ali@example.com,+971 50 000 0000,Dubai,Construction,Warehouse frame,Large,"H-beams,Plates",Manual entry,New Lead,Needs quote,High,true,2026-05-12
```

## Notes

The dashboard is protected client-side with Supabase Auth and server-side at the database layer with row level security. Users can only read and modify rows where `created_by` matches their authenticated user ID.
