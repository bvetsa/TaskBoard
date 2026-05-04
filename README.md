# TaskBoard

A Kanban-style task board for the Next Play Games software development assessment.

## Local Development

```bash
npm install
npm run dev
```

Create a `.env.local` file with your Supabase project values:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-key
```

Do not commit Supabase secret or service-role keys.
