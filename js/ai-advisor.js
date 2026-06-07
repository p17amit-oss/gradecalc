/**
 * ai-advisor.js — AI Advisor chat widget (client-side).
 * Floating button → slide-up panel with streaming SSE responses.
 * Conversation history in sessionStorage.
 * Never touches the Anthropic API key — all requests go through /api/ai-advisor.
 */

'use strict';

const AiAdvisor = {
  // ── State ─────────────────────────────────────────────────
  isOpen: false,
  isLoading: false,
  currentInput: null,  // current calculator inputData (set by page)
  pageContext: document.documentElement.dataset.page || window.location.pathname,
  SESSION_KEY: 'ai_advisor_history',
  MAX_HISTORY: 20,     // max messages to retain in sessionStorage
  CHAR_LIMIT: 300,

  // ── Init ─────────────────────────────────────────────────
  init() {
    this._injectWidget();
    this._restoreHistory();
    this._bindEvents();
  },

  // ── Public: update inputData from calculator page ─────────
  setInputData(data) {
    this.currentInput = data;
    this._updateChips();
  },

  // ── Widget HTML ──────────────────────────────────────────
  _injectWidget() {
    const html = `
      <!-- AI Advisor Floating Button -->
      <button
        id="ai-fab"
        class="ai-fab"
        aria-label="Open AI Grade Advisor"
        aria-expanded="false"
        aria-controls="ai-panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
        </svg>
        <span class="ai-fab__label">AI Advisor</span>
      </button>

      <!-- AI Advisor Panel -->
      <div
        id="ai-panel"
        class="ai-panel"
        role="dialog"
        aria-label="AI Grade Advisor"
        aria-modal="true"
        hidden
      >
        <div class="ai-panel__header">
          <div class="ai-panel__header-left">
            <div class="ai-panel__avatar" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
              </svg>
            </div>
            <div>
              <div class="ai-panel__title">AI Grade Advisor</div>
              <div class="ai-panel__subtitle">Powered by Claude</div>
            </div>
          </div>
          <button id="ai-close" class="ai-panel__close" aria-label="Close AI Advisor">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div id="ai-messages" class="ai-messages" role="log" aria-live="polite" aria-label="Conversation">
          <div class="ai-welcome">
            <p>Ask me anything about your grade conversion — what it means for grad school applications, whether it's competitive, and what to do next.</p>
          </div>
        </div>

        <div id="ai-chips" class="ai-chips" aria-label="Suggested questions">
          <!-- Dynamically populated -->
        </div>

        <div class="ai-input-area">
          <div class="ai-input-wrap">
            <textarea
              id="ai-input"
              class="ai-textarea"
              placeholder="Ask about your grade conversion…"
              rows="3"
              maxlength="300"
              aria-label="Your message"
            ></textarea>
            <div id="ai-char-count" class="ai-char-count" aria-live="polite" hidden>0/300</div>
          </div>
          <button id="ai-send" class="ai-send-btn" aria-label="Send message" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
            </svg>
          </button>
        </div>

        <div class="ai-panel__footer">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
          </svg>
          <span>Powered by Claude · For informational purposes only</span>
        </div>
      </div>

      <!-- Panel overlay (mobile) -->
      <div id="ai-overlay" class="ai-overlay" aria-hidden="true"></div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    this._injectStyles();
  },

  _injectStyles() {
    if (document.getElementById('ai-advisor-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-advisor-styles';
    style.textContent = `
      /* Ensure hidden attribute works even when display:flex is set */
      .ai-panel[hidden] { display: none !important; }

      .ai-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 56px;
        padding: 0 20px 0 16px;
        background: var(--color-accent, #7C3AED);
        color: #fff;
        border: none;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
        font-family: var(--font-sans);
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(124,58,237,0.35);
        transition: background 200ms, transform 150ms, box-shadow 200ms;
      }
      .ai-fab:hover { background: var(--color-accent-hover, #6d28d9); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(124,58,237,0.45); }
      .ai-fab:active { transform: scale(0.97); }
      .ai-fab__label { white-space: nowrap; }
      @media (max-width: 479px) { .ai-fab__label { display: none; } .ai-fab { padding: 0; width: 56px; justify-content: center; } }

      .ai-panel {
        position: fixed;
        z-index: 600;
        background: var(--color-bg-card, #fff);
        border: 1px solid var(--color-border, #e5e5e5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      @media (min-width: 768px) {
        .ai-panel {
          bottom: 92px; right: 24px;
          width: 380px; height: 520px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }
      }
      @media (max-width: 767px) {
        .ai-panel {
          inset: 0; width: 100%; height: 100%;
          border-radius: 0; border: none;
        }
      }

      .ai-panel__header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 16px 14px;
        border-bottom: 1px solid var(--color-border, #e5e5e5);
        flex-shrink: 0;
      }
      .ai-panel__header-left { display: flex; align-items: center; gap: 10px; }
      .ai-panel__avatar {
        width: 36px; height: 36px;
        background: var(--color-accent-subtle, #f5f3ff);
        color: var(--color-accent, #7C3AED);
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .ai-panel__title { font-size: 0.9375rem; font-weight: 600; color: var(--color-text-primary, #0a0a0a); }
      .ai-panel__subtitle { font-size: 0.75rem; color: var(--color-text-tertiary, #a3a3a3); }
      .ai-panel__close {
        background: none; border: none; cursor: pointer;
        color: var(--color-text-tertiary, #a3a3a3);
        padding: 6px; border-radius: 8px;
        transition: background 150ms, color 150ms;
        display: flex; align-items: center; justify-content: center;
      }
      .ai-panel__close:hover { background: var(--color-bg-secondary, #f8f8f8); color: var(--color-text-primary, #0a0a0a); }

      .ai-messages {
        flex: 1; overflow-y: auto; padding: 16px;
        display: flex; flex-direction: column; gap: 12px;
        scroll-behavior: smooth;
      }
      .ai-welcome { font-size: 0.875rem; color: var(--color-text-secondary, #525252); line-height: 1.6; }

      .ai-msg { display: flex; gap: 8px; }
      .ai-msg--user { flex-direction: row-reverse; }
      .ai-msg__bubble {
        max-width: 85%; padding: 10px 14px;
        border-radius: 16px; font-size: 0.875rem; line-height: 1.55;
      }
      .ai-msg--user .ai-msg__bubble {
        background: var(--color-accent, #7C3AED); color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ai-msg--assistant .ai-msg__bubble {
        background: var(--color-bg-secondary, #f8f8f8);
        color: var(--color-text-primary, #0a0a0a);
        border-bottom-left-radius: 4px;
        border: 1px solid var(--color-border-subtle, #f0f0f0);
      }
      .ai-msg--error .ai-msg__bubble {
        background: var(--color-error-subtle, #fef2f2);
        color: var(--color-error, #dc2626);
        border: 1px solid rgba(220,38,38,0.2);
        font-size: 0.8125rem;
      }

      .ai-typing { display: flex; align-items: center; gap: 4px; padding: 10px 14px; }
      .ai-typing-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--color-text-tertiary, #a3a3a3);
        animation: aiBounce 1.2s infinite ease-in-out;
      }
      .ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes aiBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

      .ai-chips {
        display: flex; flex-wrap: wrap; gap: 6px;
        padding: 0 12px 10px; flex-shrink: 0;
      }
      .ai-chip {
        padding: 6px 12px;
        background: var(--color-bg-secondary, #f8f8f8);
        border: 1px solid var(--color-border, #e5e5e5);
        border-radius: 9999px; font-size: 0.8125rem;
        color: var(--color-text-secondary, #525252);
        cursor: pointer; white-space: nowrap;
        transition: background 150ms, border-color 150ms, color 150ms;
        font-family: var(--font-sans);
      }
      .ai-chip:hover { background: var(--color-accent-subtle, #f5f3ff); border-color: var(--color-accent, #7C3AED); color: var(--color-accent, #7C3AED); }

      .ai-input-area {
        display: flex; align-items: flex-end; gap: 8px;
        padding: 10px 12px 12px;
        border-top: 1px solid var(--color-border, #e5e5e5);
        flex-shrink: 0;
      }
      .ai-input-wrap { flex: 1; position: relative; }
      .ai-textarea {
        width: 100%; resize: none;
        border: 1.5px solid var(--color-border, #e5e5e5);
        border-radius: 12px;
        padding: 10px 12px; padding-bottom: 20px;
        font-size: 0.875rem; font-family: var(--font-sans);
        color: var(--color-text-primary, #0a0a0a);
        background: var(--color-bg-primary, #fff);
        outline: none; transition: border-color 150ms;
        line-height: 1.5;
      }
      .ai-textarea:focus { border-color: var(--color-accent, #7C3AED); }
      .ai-char-count {
        position: absolute; bottom: 6px; right: 10px;
        font-size: 0.6875rem; color: var(--color-text-tertiary, #a3a3a3);
      }
      .ai-char-count--warn { color: var(--color-warning, #d97706); }
      .ai-send-btn {
        width: 40px; height: 40px; flex-shrink: 0;
        background: var(--color-accent, #7C3AED); color: #fff;
        border: none; border-radius: 10px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 150ms, opacity 150ms;
      }
      .ai-send-btn:hover:not(:disabled) { background: var(--color-accent-hover, #6d28d9); }
      .ai-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

      .ai-panel__footer {
        padding: 6px 16px 10px;
        font-size: 0.6875rem; color: var(--color-text-tertiary, #a3a3a3);
        display: flex; align-items: center; gap: 4px;
        flex-shrink: 0;
      }

      .ai-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(0,0,0,0.4); z-index: 590;
        backdrop-filter: blur(2px);
      }
      .ai-overlay.open { display: block; }

      @media (prefers-reduced-motion: no-preference) {
        .ai-panel.opening-mobile  { animation: aiSlideUp 280ms cubic-bezier(0.32,0.72,0,1) both; }
        .ai-panel.opening-desktop { animation: aiFadeIn 200ms ease-out both; }
        @keyframes aiSlideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes aiFadeIn  { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
      }
    `;
    document.head.appendChild(style);
  },

  // ── Events ───────────────────────────────────────────────
  _bindEvents() {
    const fab     = document.getElementById('ai-fab');
    const closeBtn= document.getElementById('ai-close');
    const overlay = document.getElementById('ai-overlay');
    const sendBtn = document.getElementById('ai-send');
    const input   = document.getElementById('ai-input');

    fab?.addEventListener('click', () => this.open());
    closeBtn?.addEventListener('click', () => this.close());
    overlay?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });

    input?.addEventListener('input', () => this._onInputChange());
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });

    sendBtn?.addEventListener('click', () => this._send());
  },

  _onInputChange() {
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send');
    const counter = document.getElementById('ai-char-count');
    if (!input) return;

    const len = input.value.length;
    sendBtn && (sendBtn.disabled = len === 0 || this.isLoading);

    if (counter) {
      if (len >= 200) {
        counter.hidden = false;
        counter.textContent = `${len}/300`;
        counter.className = `ai-char-count${len >= 270 ? ' ai-char-count--warn' : ''}`;
      } else {
        counter.hidden = true;
      }
    }
  },

  // ── Open / Close ─────────────────────────────────────────
  open() {
    const panel = document.getElementById('ai-panel');
    const overlay = document.getElementById('ai-overlay');
    const fab = document.getElementById('ai-fab');
    if (!panel || this.isOpen) return;

    panel.hidden = false;
    this.isOpen = true;
    fab?.setAttribute('aria-expanded', 'true');

    const isMobile = window.innerWidth < 768;
    panel.classList.add(isMobile ? 'opening-mobile' : 'opening-desktop');
    if (isMobile) {
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    this._updateChips();
    document.getElementById('ai-input')?.focus();

    setTimeout(() => panel.classList.remove('opening-mobile', 'opening-desktop'), 400);
  },

  close() {
    const panel = document.getElementById('ai-panel');
    const overlay = document.getElementById('ai-overlay');
    const fab = document.getElementById('ai-fab');
    if (!panel) return;

    panel.hidden = true;
    this.isOpen = false;
    fab?.setAttribute('aria-expanded', 'false');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  },

  // ── Chips ────────────────────────────────────────────────
  _updateChips() {
    const container = document.getElementById('ai-chips');
    if (!container) return;

    const chips = this._generateChips();
    container.innerHTML = chips.map(c =>
      `<button class="ai-chip" type="button">${this._esc(c)}</button>`
    ).join('');

    container.querySelectorAll('.ai-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('ai-input');
        if (input) {
          input.value = btn.textContent;
          this._onInputChange();
          this._send();
        }
      });
    });
  },

  _generateChips() {
    const path = window.location.pathname;
    const inp = this.currentInput || {};
    const chips = [];

    if (path.includes('cgpa-to-percentage') || path.includes('vtu') || path.includes('anna') || path.includes('mumbai')) {
      const cgpa = inp.cgpa || inp.value;
      if (cgpa) chips.push(`Is ${cgpa} CGPA competitive for US MS programs?`);
      chips.push('Which US programs can I target with my CGPA?');
      chips.push('Do I need a WES evaluation for US applications?');
    } else if (path.includes('percentage-to-gpa') || path.includes('wes')) {
      const pct = inp.percentage || inp.value;
      if (pct) chips.push(`Is ${pct}% competitive for US grad admissions?`);
      chips.push('How will US schools view my percentage?');
      chips.push('Do I need a WES evaluation for applications?');
    } else if (path.includes('uk-')) {
      chips.push('Is a 2:1 enough for US grad school?');
      chips.push('How do UK grades compare to US GPA for admissions?');
    } else if (path.includes('ib-')) {
      chips.push('What IB score do I need for top US universities?');
      chips.push('How do US colleges evaluate IB scores?');
    } else if (path.includes('grade-needed')) {
      chips.push('What grade do I need to stay competitive for grad school?');
    }

    if (chips.length === 0 || chips.length < 2) {
      chips.push('What does my grade mean for grad school?');
    }

    return chips.slice(0, 3);
  },

  // ── Send & Stream ─────────────────────────────────────────
  async _send() {
    const input = document.getElementById('ai-input');
    const text = input?.value?.trim();
    if (!text || this.isLoading) return;

    input.value = '';
    this._onInputChange();

    this._appendMessage('user', text);
    const history = this._getHistory();

    history.push({ role: 'user', content: text });

    const startTime = Date.now();
    this.isLoading = true;
    document.getElementById('ai-send').disabled = true;

    if (window.Analytics) window.Analytics.aiQuerySent(this.pageContext);

    // Show typing indicator
    const typingId = this._appendTyping();

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          pageContext: this.pageContext,
          inputData: this.currentInput || {},
        }),
      });

      if (!response.ok) throw new Error('Request failed');

      this._removeTyping(typingId);
      const msgEl = this._appendMessage('assistant', '');

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                this._updateMessageText(msgEl, fullText);
                this._scrollMessages();
              }
              if (parsed.error) {
                this._updateMessageText(msgEl, parsed.error, 'error');
              }
            } catch { /* partial JSON — skip */ }
          }
        }
      }

      if (fullText) {
        history.push({ role: 'assistant', content: fullText });
        this._saveHistory(history);
        if (window.Analytics) window.Analytics.aiResponseReceived(Date.now() - startTime);
      }

    } catch (err) {
      this._removeTyping(typingId);
      this._appendMessage('error', 'AI advisor is temporarily unavailable — use the calculator above for your conversion.');
    } finally {
      this.isLoading = false;
      this._onInputChange();
    }
  },

  // ── Message DOM helpers ──────────────────────────────────
  _appendMessage(role, text) {
    const container = document.getElementById('ai-messages');
    if (!container) return null;

    const cls = role === 'user' ? 'ai-msg--user' : role === 'error' ? 'ai-msg--error' : 'ai-msg--assistant';
    const div = document.createElement('div');
    div.className = `ai-msg ${cls}`;
    div.innerHTML = `<div class="ai-msg__bubble">${this._esc(text)}</div>`;
    container.appendChild(div);
    this._scrollMessages();

    // Hide welcome message after first message
    const welcome = container.querySelector('.ai-welcome');
    if (welcome) welcome.style.display = 'none';

    return div;
  },

  _appendTyping() {
    const container = document.getElementById('ai-messages');
    if (!container) return null;

    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg--assistant';
    div.setAttribute('data-typing', 'true');
    div.innerHTML = `<div class="ai-msg__bubble ai-typing"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div>`;
    container.appendChild(div);
    this._scrollMessages();
    return div;
  },

  _removeTyping(el) {
    el?.remove();
  },

  _updateMessageText(el, text, type) {
    if (!el) return;
    const bubble = el.querySelector('.ai-msg__bubble');
    if (!bubble) return;
    if (type === 'error') {
      el.className = 'ai-msg ai-msg--error';
    }
    // Render newlines as <br>
    bubble.innerHTML = this._esc(text).replace(/\n/g, '<br>');
  },

  _scrollMessages() {
    const container = document.getElementById('ai-messages');
    if (container) container.scrollTop = container.scrollHeight;
  },

  // ── Session history ──────────────────────────────────────
  _getHistory() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  _saveHistory(history) {
    try {
      const trimmed = history.slice(-this.MAX_HISTORY);
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(trimmed));
    } catch { /* sessionStorage full — ignore */ }
  },

  _restoreHistory() {
    const history = this._getHistory();
    const container = document.getElementById('ai-messages');
    if (!container || history.length === 0) return;

    // Hide welcome if we have history
    const welcome = container.querySelector('.ai-welcome');
    if (welcome) welcome.style.display = 'none';

    history.forEach(msg => {
      this._appendMessage(msg.role === 'user' ? 'user' : 'assistant', msg.content);
    });
  },

  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },
};

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AiAdvisor.init());
} else {
  AiAdvisor.init();
}

window.AiAdvisor = AiAdvisor;
