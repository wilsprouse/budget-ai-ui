# budget-ai-ui

A pure HTML / CSS / JavaScript chat UI for any OpenAI-compatible LLM endpoint.
**No build step. No Node.js. No TypeScript.** Just open `index.html` in a browser.

---

## Quick start

### 1. Configure the LLM endpoint

Open **`config.js`** and set the values for your LLM server:

```js
const CONFIG = {
  LLM_BASE_URL: 'http://localhost:11434',  // base URL of your LLM server
  LLM_API_PATH: '/v1/chat/completions',    // OpenAI-compatible path
  MODEL:        'llama3.2',               // model name
  API_KEY:      '',                        // leave empty if not required
  SYSTEM_PROMPT:'You are a helpful and friendly AI assistant.',
  APP_NAME:     'Budget AI',
};
```

`config.js` is the `.env` equivalent for this static site — you edit it once
before opening the app.

#### Compatible LLM servers

| Server | LLM_BASE_URL example | LLM_API_PATH |
|---|---|---|
| [Ollama](https://ollama.com) | `http://localhost:11434` | `/v1/chat/completions` |
| [LM Studio](https://lmstudio.ai) | `http://localhost:1234` | `/v1/chat/completions` |
| [llama.cpp](https://github.com/ggerganov/llama.cpp) | `http://localhost:8080` | `/v1/chat/completions` |
| OpenAI | `https://api.openai.com` | `/v1/chat/completions` |
| [vLLM](https://github.com/vllm-project/vllm) | `http://localhost:8000` | `/v1/chat/completions` |

> **CORS note:** if the browser blocks cross-origin requests to your LLM
> server, start the server with CORS enabled or serve both files from the same
> origin (e.g. `python3 -m http.server 8080` from the project directory).

### 2. Open the app

```bash
# Option A — open directly (works if LLM_BASE_URL is the same origin)
open index.html

# Option B — serve locally to avoid CORS issues
python3 -m http.server 8080
# then visit http://localhost:8080
```

---

## Features

- **Streaming** — responses appear token-by-token as they are generated
- **Conversation history** — multiple chats stored in `localStorage`
- **Dark / light mode** — toggle in the sidebar; preference is remembered
- **Minimal Markdown** — code fences and inline code are rendered
- **Responsive** — works on desktop and mobile
- **Keyboard shortcuts** — `Enter` to send, `Shift+Enter` for a newline

## Project structure

```
index.html   — markup
styles.css   — all styling (light + dark themes)
app.js       — chat logic and streaming
config.js    — ⚙️  your .env equivalent — edit this
```

## License

MIT
