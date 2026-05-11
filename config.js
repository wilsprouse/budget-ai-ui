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
  //   Custom server    : 'http://192.168.1.10:8000'
  LLM_BASE_URL: 'http://localhost:11434',

  // API path appended to LLM_BASE_URL.
  // Use '/v1/chat/completions' for OpenAI-compatible endpoints
  // (Ollama, LM Studio, llama.cpp, vLLM, etc.)
  // Use '/generate' (or the appropriate path) for simple prompt-based servers.
  LLM_API_PATH: '/v1/chat/completions',

  // Request format sent to the server.
  //
  //   'openai'  — OpenAI-compatible chat format (default):
  //               { model, messages: [{role, content}, …], stream: true }
  //               Use with Ollama, LM Studio, llama.cpp, vLLM, OpenAI, etc.
  //
  //   'simple'  — Simple prompt format:
  //               { prompt: "<user message>", stream: true }
  //               Use with custom servers that accept a plain prompt string,
  //               e.g. curl http://<ip>:8000/generate -d '{"prompt":"…","stream":true}'
  //               Set LLM_API_PATH to the correct path (e.g. '/generate').
  REQUEST_FORMAT: 'openai',

  // Name of the model to request from the server.
  // Only used when REQUEST_FORMAT is 'openai'.
  MODEL: 'llama3.2',

  // Optional API key — leave empty if your server does not
  // require authentication.
  API_KEY: '',

  // System prompt sent with every conversation.
  // When REQUEST_FORMAT is 'simple', this is prepended to the user message
  // separated by a newline (omitted when empty).
  SYSTEM_PROMPT: 'You are a helpful and friendly AI assistant.',

  // Name displayed in the browser tab and chat header.
  APP_NAME: 'Budget AI',
};
