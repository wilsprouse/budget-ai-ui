# budget-ai-ui

A lightweight, framework-free chatbot UI (plain HTML/CSS/vanilla JS).

## Usage (no Node required)

1. Set your default endpoint in `config.js` (`llmEndpoint`) or leave it blank and type the endpoint in the UI.
2. Open `index.html` directly in your browser.
3. Send a message to stream responses from your configured LLM endpoint.

## Requirements

Your hosted LLM endpoint must allow cross-origin browser requests (CORS) for direct browser access.
At minimum, configure CORS headers like `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers` to permit browser `POST` requests with JSON.
If your CORS policy validates request headers, allow the client `Accept` value used by this UI: `text/event-stream, application/json, text/plain`.
