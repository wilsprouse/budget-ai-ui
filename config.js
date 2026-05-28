// ============================================================
// Budget AI UI — Configuration
// ============================================================
// This file is the equivalent of a .env for this static site.
// Edit the values below to point to your LLM endpoint before
// opening index.html.
// ============================================================

const CONFIG = {
  // Base URL of your LLM server.
  // Examples:
  //   Ollama (local)   : 'http://localhost:11434'
  //   LM Studio (local): 'http://localhost:1234'
  //   llama.cpp server : 'http://localhost:8080'
  //   OpenAI           : 'https://api.openai.com'
  LLM_BASE_URL: 'http://localhost:11434',

  // API path appended to LLM_BASE_URL.
  // Use '/v1/chat/completions' for OpenAI-compatible endpoints
  // (Ollama, LM Studio, llama.cpp, vLLM, etc.)
  LLM_API_PATH: '/v1/chat/completions',

  // Name of the model to request from the server.
  MODEL: 'llama3.2',

  // Optional API key — leave empty if your server does not
  // require authentication.
  API_KEY: '',

  // System prompt sent with every conversation.
  SYSTEM_PROMPT: 'You are a helpful and friendly AI assistant.',

  // Name displayed in the browser tab and chat header.
  APP_NAME: 'Budget AI',

  // ── Context Management ──────────────────────────────────────
  // Maximum number of recent tokens to keep in full context.
  // The last N tokens of the conversation history will be sent
  // to the LLM without compression.
  // Set to 0 to compress all context, or a large number to disable compression.
  CONTEXT_LAST_N_TOKENS: 2000,

  // Maximum number of tokens to compress older context into.
  // All messages before the last N tokens will be summarized
  // into a compressed summary of approximately this token count.
  // Set to 0 to discard older context entirely.
  CONTEXT_COMPRESS_TO_TOKENS: 500,
};
