# YamadaNihon AI — 阮阮

Responsive AI web app with private accounts, chat history, memory, settings and an OpenAI backend.

## Render
Build: `npm install`
Start: `npm start`
Environment:
- `OPENAI_API_KEY` — set in Render only
- `OPENAI_MODEL` — defaults to `gpt-5.6`
- `SESSION_SECRET` — generate a strong random value

## Storage note
This starter uses in-memory Maps for V1. Accounts, chats and memories reset when the service restarts. For persistent multi-user production use, replace the Maps with PostgreSQL.
