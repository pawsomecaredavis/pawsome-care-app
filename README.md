# Pawsome Care App

Client-facing pet care site with:
- marketing pages
- pet parent portal
- admin dashboard
- booking management
- daily updates with photo uploads

## Local development

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase values
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

## Environment variables

This project currently needs:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Deploying to Vercel

1. Push this project to GitHub.
2. Go to [Vercel](https://vercel.com/new).
3. Import the GitHub repository.
4. Keep the framework as `Next.js`.
5. Add the environment variables from `.env.local`.
6. Deploy.

After the first deploy, update Supabase:

1. Open your Supabase project.
2. Go to `Authentication > URL Configuration`.
3. Set `Site URL` to your Vercel production URL.
4. Add your preview and local redirect URLs.

Recommended redirect URLs:

```text
http://localhost:3000/**
https://*.vercel.app/**
```

If you connect a custom domain later, add that domain there too.

## Before going live

Check these flows on the deployed URL:
- home page loads
- register
- login
- pet parent portal
- admin dashboard
- booking creation
- daily update photo upload

## Notes

- Pet photos and daily update photos are compressed in the browser before upload.
- Uploaded images are currently stored in Supabase Storage.
- Vercel deploys the latest pushed commit from the connected GitHub repository.
