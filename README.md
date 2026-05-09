# budget-ai-ui

A lightweight, framework-free chatbot UI (plain HTML/CSS/vanilla JS) that can stream responses from a hosted LLM endpoint.

## Run locally

1. Copy `.env.example` to `.env`.
2. Set `LLM_ENDPOINT` to your hosted LLM URL/IP.
3. Start the server:

```bash
npm start
```

Then open `http://localhost:3000`.

## Environment variables

- `LLM_ENDPOINT`: Default LLM endpoint used by the frontend.
- `PORT`: Local server port (default: `3000`).
