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
  SYSTEM_PROMPT: 'You are a helpful assistant',

  // Maximum number of tokens to generate in the response.
  MAX_TOKENS: 512,

  // Temperature for response generation (0.0 to 2.0).
  // Lower values make output more deterministic.
  TEMPERATURE: 0.7,

  // Name displayed in the browser tab and chat header.
  APP_NAME: 'Budget AI',

  // ── Context compression settings ──────────────────────────
  // Number of tokens to keep from recent conversation history.
  // The most recent N tokens will be sent to the LLM unchanged.
  CONTEXT_LAST_N_TOKENS: 2000,

  // Number of tokens to compress older context into.
  // Everything before CONTEXT_LAST_N_TOKENS will be summarized
  // into approximately this many tokens.
  CONTEXT_COMPRESS_TO_TOKENS: 500,
};
