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
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

3. In Supabase SQL Editor, run:

```bash
supabase/schema.sql
supabase/seed.sql
```

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## CSV Import Format

The importer accepts headers such as:

```csv
companyName,contactPerson,jobTitle,email,phone,emirate,industry,projectType,projectSize,productsRequired,leadSource,status,notes,urgency,pastInquiry,nextFollowUp
ABC Contracting,Ali Khan,Procurement Manager,ali@example.com,+971 50 000 0000,Dubai,Construction,Warehouse frame,Large,"H-beams,Plates",Manual entry,New Lead,Needs quote,High,true,2026-05-12
```

## Notes

The current UI uses sample data and local browser state for a fast demo. The Supabase schema is included so the next step is replacing the local state reads/writes with Supabase queries and Supabase Auth sessions.
