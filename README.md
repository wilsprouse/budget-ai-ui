# budget-ai-ui

A lightweight, framework-free chatbot UI (plain HTML/CSS/vanilla JS) that can stream responses from a hosted LLM endpoint.

## Run locally

1. (Optional) Copy `.env.example` to `.env`.
2. Set `LLM_ENDPOINT` (and optionally `PORT`) in `.env` or as system environment variables.
3. Start the server:

```bash
npm start
```

Then open `http://localhost:3000`.

## Environment variables

- `LLM_ENDPOINT`: Default LLM endpoint used by the frontend.
- `PORT`: Local server port (default: `3000`).
