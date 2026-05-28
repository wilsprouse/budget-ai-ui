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

  // ── Context Management ───────────────────────────────────
  /**
   * Estimate token count for text.
   * Rough approximation: 1 token ≈ 4 characters for English text.
   * This is a simple heuristic; actual tokenization varies by model.
   */
  function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Compress context to fit within token limits.
   * Keeps the last N tokens of recent conversation and compresses
   * older messages into a summary.
   */
  function compressContext(messages) {
    const lastNTokens = CONFIG.CONTEXT_LAST_N_TOKENS || 2000;
    const compressToTokens = CONFIG.CONTEXT_COMPRESS_TO_TOKENS || 500;

    // If compression is disabled (very large lastNTokens), return all messages
    if (lastNTokens >= 1000000) {
      return messages;
    }

    // Calculate token count for each message
    const messageTokens = messages.map(msg => ({
      message: msg,
      tokens: estimateTokens(`${msg.role}: ${msg.content}`)
    }));

    // Find the split point: keep messages from the end until we exceed lastNTokens
    let recentTokenCount = 0;
    let splitIndex = messageTokens.length;

    for (let i = messageTokens.length - 1; i >= 0; i--) {
      recentTokenCount += messageTokens[i].tokens;
      if (recentTokenCount > lastNTokens) {
        splitIndex = i + 1;
        break;
      }
    }

    // If all messages fit within the limit, return them all
    if (splitIndex === 0) {
      return messages;
    }

    // Split into old and recent messages
    const oldMessages = messages.slice(0, splitIndex);
    const recentMessages = messages.slice(splitIndex);

    // If there are no old messages, just return recent ones
    if (oldMessages.length === 0) {
      return recentMessages;
    }

    // If compression is disabled (compressToTokens is 0), discard old messages
    if (compressToTokens === 0) {
      // Keep system prompt if it exists
      const systemPrompt = messages.find(m => m.role === 'system');
      return systemPrompt 
        ? [systemPrompt, ...recentMessages.filter(m => m.role !== 'system')]
        : recentMessages;
    }

    // Compress old messages into a summary
    const systemPrompt = oldMessages.find(m => m.role === 'system');
    const oldNonSystemMessages = oldMessages.filter(m => m.role !== 'system');

    // Create a compressed summary of old messages
    const summaryContent = `[Previous conversation summary - ${oldNonSystemMessages.length} messages compressed]:\n` +
      oldNonSystemMessages.map(m => `${m.role}: ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`).join('\n');

    // Trim summary to approximate token limit
    const targetLength = compressToTokens * 4; // Convert tokens to characters
    const trimmedSummary = summaryContent.length > targetLength 
      ? summaryContent.slice(0, targetLength) + '...'
      : summaryContent;

    const compressedMessage = {
      role: 'system',
      content: trimmedSummary
    };

    // Build final message list
    const result = [];
    
    // Add original system prompt first if it exists
    if (systemPrompt) {
      result.push(systemPrompt);
    }
    
    // Add compressed summary
    result.push(compressedMessage);
    
    // Add recent messages (excluding system prompt if it was already added)
    result.push(...recentMessages.filter(m => m.role !== 'system' || !systemPrompt));

    return result;
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

    const prompt = compressContext(messages)
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: CONFIG.MODEL,
        prompt,
        stream: true,
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

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');

      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) continue;

        let parsed;

        try {
          parsed = JSON.parse(trimmed);
        } catch {
          continue;
        }

        const delta = parsed?.response;

        if (!delta) continue;

        if (firstToken) {
          bubble.innerHTML = '';
          firstToken = false;
        }

        fullText += delta;

        bubble.textContent = fullText;

        scrollToBottom();
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
