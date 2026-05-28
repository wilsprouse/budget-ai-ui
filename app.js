/* ============================================================
   Budget AI UI — Application Logic
   ============================================================
   Requires:
     config.js  — must be loaded before this file (defines CONFIG)
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────
  // Fallback max height (px) for the textarea — mirrors --input-max-h in styles.css
  const INPUT_MAX_HEIGHT_FALLBACK = 200;
  // Max characters used when auto-generating a conversation title from user input
  const MAX_TITLE_LENGTH = 50;
  // Default system prompt fallback
  const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant';
  // Chat template tokens
  const CHAT_START_TOKEN = '<|im_start|>';
  const CHAT_END_TOKEN = '\n<|im_end|>';

  // ── Validate CONFIG ──────────────────────────────────────
  if (typeof CONFIG === 'undefined') {
    console.error('[Budget AI] config.js was not loaded. The app cannot start.');
    document.body.innerHTML =
      '<p style="font-family:sans-serif;padding:2rem;color:red">' +
      'Error: config.js is missing. Please ensure config.js is present ' +
      'and loaded before app.js in index.html.</p>';
    return;
  }

  // ── DOM references ────────────────────────────────────────
  const messagesEl   = document.getElementById('messages');
  const inputForm    = document.getElementById('inputForm');
  const userInput    = document.getElementById('userInput');
  const sendBtn      = document.getElementById('sendBtn');
  const errorBanner  = document.getElementById('errorBanner');
  const errorText    = document.getElementById('errorText');
  const errorClose   = document.getElementById('errorClose');
  const welcomeEl    = document.getElementById('welcome');
  const historyList  = document.getElementById('historyList');
  const newChatBtn   = document.getElementById('newChatBtn');
  const themeToggle  = document.getElementById('themeToggle');
  const sidebarToggle= document.getElementById('sidebarToggle');
  const sidebar      = document.getElementById('sidebar');
  const appNameEl    = document.getElementById('appName');
  const mobileTitleEl= document.getElementById('mobileTitle');
  const welcomeHeadingEl = document.getElementById('welcomeHeading');
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  const systemPromptInput = document.getElementById('systemPrompt');
  const maxTokensInput = document.getElementById('maxTokens');
  const maxTokensValue = document.getElementById('maxTokensValue');
  const temperatureInput = document.getElementById('temperature');
  const temperatureValue = document.getElementById('temperatureValue');

  // ── Apply app name from config ────────────────────────────
  const appName = (CONFIG.APP_NAME || 'Budget AI').trim();
  document.title = appName;
  if (appNameEl)       appNameEl.textContent       = appName;
  if (mobileTitleEl)   mobileTitleEl.textContent   = appName;
  if (welcomeHeadingEl) welcomeHeadingEl.textContent = `Welcome to ${appName}`;

  // ── Theme ─────────────────────────────────────────────────
  const savedTheme = localStorage.getItem('budgetai-theme') || 'light';
  applyTheme(savedTheme);

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('budgetai-theme', theme);
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // ── Settings panel ────────────────────────────────────────
  // Initialize settings from CONFIG
  if (systemPromptInput) {
    systemPromptInput.value = CONFIG.SYSTEM_PROMPT || '';
    systemPromptInput.placeholder = CONFIG.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT;
  }
  if (maxTokensInput) {
    maxTokensInput.value = CONFIG.MAX_TOKENS || 512;
    maxTokensValue.textContent = CONFIG.MAX_TOKENS || 512;
  }
  if (temperatureInput) {
    temperatureInput.value = CONFIG.TEMPERATURE || 0.7;
    temperatureValue.textContent = CONFIG.TEMPERATURE || 0.7;
  }

  // Settings toggle
  if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
      const isHidden = settingsPanel.hasAttribute('hidden');
      if (isHidden) {
        settingsPanel.removeAttribute('hidden');
      } else {
        settingsPanel.setAttribute('hidden', '');
      }
    });
  }

  // Update CONFIG when settings change
  if (systemPromptInput) {
    systemPromptInput.addEventListener('input', () => {
      CONFIG.SYSTEM_PROMPT = systemPromptInput.value;
    });
  }

  if (maxTokensInput) {
    maxTokensInput.addEventListener('input', () => {
      const value = parseInt(maxTokensInput.value);
      maxTokensValue.textContent = value;
      CONFIG.MAX_TOKENS = value;
    });
  }

  if (temperatureInput) {
    temperatureInput.addEventListener('input', () => {
      const value = parseFloat(temperatureInput.value);
      temperatureValue.textContent = value.toFixed(1);
      CONFIG.TEMPERATURE = value;
    });
  }

  // ── Sidebar toggle (mobile) ───────────────────────────────
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== sidebarToggle) {
      sidebar.classList.remove('open');
    }
  });

  // ── Conversation state ────────────────────────────────────
  // Each conversation: { id, title, messages: [{role, content}] }
  let conversations = loadConversations();
  let currentId = null;
  let isStreaming = false;
  let abortController = null;

  function loadConversations() {
    try {
      return JSON.parse(localStorage.getItem('budgetai-convos') || '[]');
    } catch {
      return [];
    }
  }

  function saveConversations() {
    try {
      localStorage.setItem('budgetai-convos', JSON.stringify(conversations));
    } catch {
      // Storage quota exceeded — trim oldest conversation
      if (conversations.length > 1) {
        conversations.shift();
        saveConversations();
      }
    }
  }

  function currentConversation() {
    return conversations.find(c => c.id === currentId) || null;
  }

  // ── History list rendering ────────────────────────────────
  function renderHistory() {
    historyList.innerHTML = '';
    if (conversations.length === 0) {
      historyList.innerHTML = '<p class="history-empty">No conversations yet.</p>';
      return;
    }
    // Most-recent first
    [...conversations].reverse().forEach(convo => {
      const item = document.createElement('div');
      item.className = 'history-item' + (convo.id === currentId ? ' active' : '');
      item.dataset.id = convo.id;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', convo.title || 'Conversation');

      const label = document.createElement('span');
      label.className = 'history-item-label';
      label.textContent = convo.title || 'New conversation';
      item.appendChild(label);

      item.addEventListener('click', () => switchConversation(convo.id));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') switchConversation(convo.id);
      });

      historyList.appendChild(item);
    });
  }

  function switchConversation(id) {
    if (isStreaming) return;
    currentId = id;
    renderHistory();
    renderMessages();
    sidebar.classList.remove('open');
    userInput.focus();
  }

  // ── Message rendering ─────────────────────────────────────
  function renderMessages() {
    messagesEl.innerHTML = '';
    const convo = currentConversation();

    if (!convo || convo.messages.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'welcome';
      welcome.id = 'welcome';
      welcome.innerHTML = `
        <div class="welcome-icon" aria-hidden="true">💬</div>
        <h1 class="welcome-heading">${escapeHtml(`Welcome to ${appName}`)}</h1>
        <p class="welcome-sub">Ask me anything — I'll do my best to help.</p>
      `;
      messagesEl.appendChild(welcome);
      return;
    }

    convo.messages.forEach(msg => {
      if (msg.role === 'system') return;
      appendMessageBubble(msg.role, msg.content);
    });

    scrollToBottom(false);
  }

  function appendMessageBubble(role, content, streaming = false) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${role === 'user' ? 'user-avatar' : 'ai-avatar'}`;
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = role === 'user' ? 'U' : 'AI';

    const bubble = document.createElement('div');
    bubble.className = `bubble ${role === 'user' ? 'user-bubble' : 'ai-bubble'}`;

    if (streaming && role === 'assistant') {
      // Typing indicator shown until first token arrives
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.id = 'typingIndicator';
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        dot.className = 'typing-dot';
        indicator.appendChild(dot);
      }
      bubble.appendChild(indicator);
      row.setAttribute('id', 'streamingRow');
    } else {
      bubble.innerHTML = formatContent(content);
    }

    if (role === 'user') {
      row.appendChild(bubble);
      row.appendChild(avatar);
    } else {
      row.appendChild(avatar);
      row.appendChild(bubble);
    }

    messagesEl.appendChild(row);
    return bubble;
  }

  /** Minimal Markdown: code fences, inline code, then HTML-escape the rest */
  function formatContent(text) {
    if (!text) return '';

    const parts = [];
    const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = fenceRegex.exec(text)) !== null) {
      // Text before the code block
      if (match.index > lastIndex) {
        parts.push(renderInline(text.slice(lastIndex, match.index)));
      }
      const lang = match[1] ? escapeHtml(match[1]) : '';
      const code = escapeHtml(match[2] || '');
      parts.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${code}</code></pre>`);
      lastIndex = fenceRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderInline(text.slice(lastIndex)));
    }

    return parts.join('');
  }

  function renderInline(text) {
    // Escape HTML then convert inline code (`...`)
    return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function scrollToBottom(smooth = true) {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }

  // ── Error banner ──────────────────────────────────────────
  function showError(message) {
    errorText.textContent = message;
    errorBanner.hidden = false;
  }

  function hideError() {
    errorBanner.hidden = true;
    errorText.textContent = '';
  }

  errorClose.addEventListener('click', hideError);

  // ── New chat ──────────────────────────────────────────────
  newChatBtn.addEventListener('click', startNewChat);

  function startNewChat() {
    if (isStreaming) stopStream();
    currentId = null;
    renderHistory();
    renderMessages();
    hideError();
    userInput.value = '';
    autoResize();
    userInput.focus();
  }

  // ── Auto-resize textarea ──────────────────────────────────
  function autoResize() {
    userInput.style.height = 'auto';
    const maxH = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--input-max-h'), 10) || INPUT_MAX_HEIGHT_FALLBACK;
    userInput.style.height = Math.min(userInput.scrollHeight, maxH) + 'px';
  }

  userInput.addEventListener('input', autoResize);

  // Send on Enter (Shift+Enter = newline)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) submitMessage();
    }
  });

  // ── Form submit ───────────────────────────────────────────
  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitMessage();
  });

  async function submitMessage() {
    const text = userInput.value.trim();
    if (!text || isStreaming) return;

    hideError();

    // Create conversation if needed
    if (!currentId) {
      const convo = {
        id: 'c_' + Date.now(),
        title: text.slice(0, MAX_TITLE_LENGTH),
        messages: [],
      };
      if (CONFIG.SYSTEM_PROMPT) {
        convo.messages.push({ role: 'system', content: CONFIG.SYSTEM_PROMPT });
      }
      conversations.push(convo);
      currentId = convo.id;
    }

    const convo = currentConversation();
    convo.messages.push({ role: 'user', content: text });
    saveConversations();

    // Clear & reset input
    userInput.value = '';
    autoResize();

    // Remove welcome screen if present
    const welcomeEl = messagesEl.querySelector('.welcome');
    if (welcomeEl) welcomeEl.remove();

    // Render user message
    appendMessageBubble('user', text);
    scrollToBottom();

    // Render AI streaming placeholder
    const aiBubble = appendMessageBubble('assistant', '', true);
    scrollToBottom();

    setStreaming(true);

    try {
      const fullResponse = await streamResponse(convo.messages, aiBubble);
      convo.messages.push({ role: 'assistant', content: fullResponse });
      // Update title if it was just the first user turn
      if (convo.messages.filter(m => m.role === 'user').length === 1) {
        convo.title = text.slice(0, MAX_TITLE_LENGTH);
      }
      saveConversations();
      renderHistory();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[Budget AI] Stream error:', err);
        showError('Could not reach the AI. Check your config.js settings and ensure the LLM server is running.');
        // Remove the empty AI bubble row
        const streamRow = document.getElementById('streamingRow');
        if (streamRow) streamRow.remove();
        // Roll back user message from history
        convo.messages.pop();
        saveConversations();
      }
    } finally {
      setStreaming(false);
    }
  }

  // ── Streaming fetch ───────────────────────────────────────
  async function streamResponse(messages, bubble) {
    abortController = new AbortController();

    //const endpoint = `${(CONFIG.LLM_BASE_URL || '').replace(/\/$/, '')}${CONFIG.LLM_API_PATH || '/generate'}`;
    const endpoint = `${CONFIG.LLM_BASE_URL}/generate`;

    const headers = { 'Content-Type': 'application/json' };
    if (CONFIG.API_KEY) {
      headers['Authorization'] = `Bearer ${CONFIG.API_KEY}`;
    }

    // Format prompt with chat template tokens
    const prompt = messages
      .map(m => `${CHAT_START_TOKEN}${m.role}\n${m.content}${CHAT_END_TOKEN}`)
      .join('\n') + `\n${CHAT_START_TOKEN}assistant\n`;

    console.log(prompt)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        max_tokens: CONFIG.MAX_TOKENS || 512,
        temperature: CONFIG.TEMPERATURE || 0.7,
      }),
      signal: abortController.signal,
    });

    /*const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: messages[messages.length - 1].content,
        stream: true
      }),
      signal: abortController.signal,
    });*/


    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let firstToken = true;
    let streamComplete = false;

    while (true) {
      const { done, value } = await reader.read();

      if (done || streamComplete) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');

      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) continue;

        // Handle Server-Sent Events format (lines starting with "data: ")
        let jsonStr = trimmed;
        if (trimmed.startsWith('data: ')) {
          jsonStr = trimmed.substring(6);
        }

        let parsed;

        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        // Extract content from the new streaming format
        const delta = parsed?.content;

        if (!delta) continue;

        if (firstToken) {
          bubble.innerHTML = '';
          firstToken = false;
        }

        fullText += delta;

        bubble.textContent = fullText;

        scrollToBottom();

        // Check if streaming is complete
        if (parsed?.stop === true) {
          streamComplete = true;
          break;
        }
      }
    }

    // Apply markdown formatting now that the full response is ready
    bubble.innerHTML = formatContent(fullText);

    // Remove streaming row id (no longer streaming)
    const streamRow = document.getElementById('streamingRow');
    if (streamRow) streamRow.removeAttribute('id');

    return fullText;
  }

  function stopStream() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  function setStreaming(active) {
    isStreaming = active;
    sendBtn.disabled = active;
    userInput.disabled = active;
    if (!active) userInput.focus();
  }

  // ── Initial render ────────────────────────────────────────
  renderHistory();
  renderMessages();
  userInput.focus();
})();
