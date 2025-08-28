// app.js - Gemini AI Chat Agent

class GeminiChatApp {
    constructor() {
      this.apiKey = 'AIzaSyA5HbvPosJPK-E21qZ94uPtzdhbn9rcQIs'; // ← Replace with your actual Gemini API key
      this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
      
      this.conversations = JSON.parse(localStorage.getItem('geminiConversations')) || [];
      this.currentChatId = localStorage.getItem('currentChatId') || null;
      this.currentChatId = this.currentChatId && this.conversations.some(c => c.id === this.currentChatId)
        ? this.currentChatId
        : this.createNewChat();
  
      this.initializeElements();
      this.setupEventListeners();
      this.loadConversations();
      this.loadCurrentChat();
      this.autoResizeTextarea();
    }
  
    initializeElements() {
      this.sidebar = document.getElementById('sidebar');
      this.chatContainer = document.getElementById('chat-container');
      this.userInput = document.getElementById('user-input');
      this.chatForm = document.getElementById('chat-form');
      this.conversationList = document.getElementById('conversation-list');
      this.newChatBtn = document.getElementById('new-chat');
      this.themeToggle = document.getElementById('theme-toggle');
      this.welcomeScreen = document.getElementById('welcome-screen');
      this.enterHint = document.getElementById('enter-hint');
    }
  
    setupEventListeners() {
      this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
      this.userInput.addEventListener('input', () => this.autoResizeTextarea());
      this.userInput.addEventListener('keydown', (e) => this.handleKeydown(e));
      
      this.newChatBtn.addEventListener('click', () => this.startNewChat());
      this.themeToggle.addEventListener('click', () => this.toggleTheme());
  
      // Mobile: Open sidebar via swipe or button (optional enhancement)
      document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && !this.sidebar.contains(e.target) && e.target.tagName !== 'TEXTAREA') {
          this.sidebar.classList.remove('open');
        }
      });
  
      // Show hint on focus
      this.userInput.addEventListener('focus', () => {
        this.enterHint.classList.remove('hidden');
      });
      this.userInput.addEventListener('blur', () => {
        setTimeout(() => this.enterHint.classList.add('hidden'), 200);
      });
    }
  
    async handleSubmit(e) {
      e.preventDefault();
      const message = this.userInput.value.trim();
      if (!message) return;
  
      this.appendUserMessage(message);
      this.userInput.value = '';
      this.autoResizeTextarea();
  
      this.showTypingIndicator();
      await this.fetchGeminiResponse(message);
    }
  
    handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.chatForm.requestSubmit();
      }
    }
  
    autoResizeTextarea() {
      this.userInput.style.height = 'auto';
      this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
    }
  
    appendUserMessage(text) {
      this.hideWelcomeScreen();
      const messageEl = this.createMessageElement(text, 'user');
      this.chatContainer.appendChild(messageEl);
      this.saveCurrentChat();
      this.scrollToBottom();
    }
  
    showTypingIndicator() {
      const typingEl = document.createElement('div');
      typingEl.className = 'typing self-start px-4 py-2';
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      typingEl.id = 'typing-indicator';
      this.chatContainer.appendChild(typingEl);
      this.scrollToBottom();
    }
  
    removeTypingIndicator() {
      const el = document.getElementById('typing-indicator');
      if (el) el.remove();
    }
  
    async fetchGeminiResponse(prompt) {
      try {
        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        });
  
        this.removeTypingIndicator();
  
        if (!response.ok) {
          if (response.status === 429) {
            this.appendAIMessage("⚠️ Rate limit reached. Please try again later.");
            return;
          }
          const error = await response.json();
          throw new Error(error.error.message || 'API error');
        }
  
        const data = await response.json();
        const aiResponse = data.candidates[0]?.content?.parts[0]?.text || "No response generated.";
  
        this.appendAIMessage(aiResponse);
      } catch (error) {
        this.removeTypingIndicator();
        console.error('Gemini API Error:', error);
        this.appendAIMessage(
          `❌ Unable to reach Gemini AI. ${error.message.includes('API') ? 'Check your API key and billing.' : error.message}`
        );
      }
    }
  
    appendAIMessage(text) {
      this.hideWelcomeScreen();
      const messageEl = this.createMessageElement(text, 'ai');
      this.chatContainer.appendChild(messageEl);
  
      // Render markdown and syntax highlighting
      this.renderMarkdown(messageEl);
  
      // Add copy button
      this.addCopyButton(messageEl);
  
      this.saveCurrentChat();
      this.scrollToBottom();
    }
  
    createMessageElement(text, sender) {
      const div = document.createElement('div');
      div.className = `message ${sender}-message flex`;
      div.innerHTML = `<div class="markdown-content">${this.escapeHtml(text)}</div>`;
      return div;
    }
  
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
    renderMarkdown(element) {
      const mdContent = element.querySelector('.markdown-content');
      if (!mdContent) return;
  
      const rawText = mdContent.textContent;
      mdContent.innerHTML = marked.parse(rawText);
  
      // Re-highlight code blocks
      Prism.highlightAllUnder(mdContent);
    }
  
    addCopyButton(messageEl) {
      if (messageEl.querySelector('.copy-btn')) return;
  
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-btn absolute top-1 right-1 bg-gray-700 dark:bg-gray-600 text-white p-1 rounded opacity-0 hover:opacity-100 transition-opacity text-xs';
      copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyBtn.title = 'Copy to clipboard';
  
      copyBtn.addEventListener('click', async () => {
        const code = messageEl.querySelector('code');
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code.textContent);
          copyBtn.innerHTML = '<i class="fas fa-check"></i>';
          setTimeout(() => (copyBtn.innerHTML = '<i class="fas fa-copy"></i>'), 2000);
        } catch (err) {
          alert('Failed to copy!');
        }
      });
  
      messageEl.classList.add('relative');
      messageEl.appendChild(copyBtn);
  
      // Show copy button on hover
      messageEl.addEventListener('mouseenter', () => {
        copyBtn.style.opacity = '1';
      });
      messageEl.addEventListener('mouseleave', () => {
        copyBtn.style.opacity = '0';
      });
    }
  
    hideWelcomeScreen() {
      if (this.welcomeScreen) this.welcomeScreen.classList.add('hidden');
    }
  
    showWelcomeScreen() {
      if (this.welcomeScreen) this.welcomeScreen.classList.remove('hidden');
    }
  
    scrollToBottom() {
      this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
  
    // Conversations
    createNewChat() {
      const id = Date.now().toString();
      const newChat = {
        id,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
      };
      this.conversations.unshift(newChat);
      this.currentChatId = id;
      this.saveConversations();
      this.loadConversations();
      return id;
    }
  
    startNewChat() {
      this.currentChatId = this.createNewChat();
      this.loadCurrentChat();
      this.clearChatContainer();
      this.showWelcomeScreen();
    }
  
    saveConversations() {
      localStorage.setItem('geminiConversations', JSON.stringify(this.conversations));
    }
  
    loadConversations() {
      this.conversationList.innerHTML = '';
      this.conversations.forEach(chat => {
        const li = document.createElement('li');
        const isActive = chat.id === this.currentChatId;
        li.className = `p-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center ${isActive ? 'bg-gray-200 dark:bg-gray-700 font-medium' : ''}`;
        li.innerHTML = `
          <span class="truncate">${chat.title}</span>
          <i class="fas fa-trash text-gray-500 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100"></i>
        `;
        li.addEventListener('click', (e) => {
          if (e.target.closest('.fa-trash')) {
            this.deleteConversation(chat.id);
          } else {
            this.currentChatId = chat.id;
            this.loadCurrentChat();
          }
        });
        this.conversationList.appendChild(li);
      });
    }
  
    loadCurrentChat() {
      const chat = this.conversations.find(c => c.id === this.currentChatId);
      if (!chat || chat.messages.length === 0) {
        this.clearChatContainer();
        this.showWelcomeScreen();
        return;
      }
  
      this.clearChatContainer();
      chat.messages.forEach(msg => {
        const isUser = msg.sender === 'user';
        const messageEl = this.createMessageElement(msg.text, isUser ? 'user' : 'ai');
        this.chatContainer.appendChild(messageEl);
  
        if (!isUser) {
          this.renderMarkdown(messageEl);
          this.addCopyButton(messageEl);
        }
      });
      this.hideWelcomeScreen();
      this.scrollToBottom();
      localStorage.setItem('currentChatId', this.currentChatId);
    }
  
    saveCurrentChat() {
      const chat = this.conversations.find(c => c.id === this.currentChatId);
      if (!chat) return;
  
      // Extract messages from DOM or maintain in memory
      const messages = [];
      document.querySelectorAll('.message').forEach(el => {
        const isUser = el.classList.contains('user-message');
        const text = el.querySelector('.markdown-content')?.textContent || el.textContent;
        messages.push({ sender: isUser ? 'user' : 'ai', text });
      });
  
      chat.messages = messages;
      chat.title = chat.messages.length > 0 
        ? chat.messages[0].text.substring(0, 30) + (chat.messages[0].text.length > 30 ? '...' : '')
        : 'New Conversation';
  
      this.saveConversations();
      this.loadConversations();
    }
  
    deleteConversation(id) {
      this.conversations = this.conversations.filter(c => c.id !== id);
      this.saveConversations();
      if (this.currentChatId === id) {
        if (this.conversations.length > 0) {
          this.currentChatId = this.conversations[0].id;
          this.loadCurrentChat();
        } else {
          this.startNewChat();
        }
      }
      this.loadConversations();
    }
  
    clearChatContainer() {
      Array.from(this.chatContainer.children).forEach(child => {
        if (!child.id || child.id !== 'welcome-screen') {
          child.remove();
        }
      });
    }
  
    toggleTheme() {
      document.documentElement.classList.toggle('dark');
      localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
  
    initTheme() {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
  
  // Initialize App
  document.addEventListener('DOMContentLoaded', () => {
    new GeminiChatApp();
  });