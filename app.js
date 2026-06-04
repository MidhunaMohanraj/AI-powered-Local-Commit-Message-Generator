// ============================================
// CommitCraft — AI Commit Message Generator
// Powered by Anthropic API
// ============================================

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are an expert software engineer who writes perfect, conventional commit messages.

Given a git diff, analyze the changes and respond with a JSON object ONLY (no markdown, no extra text):

{
  "subject": "type(scope): concise description in imperative mood, max 72 chars",
  "body": "Optional multi-line body explaining WHY, not what. Leave empty string if not needed.",
  "breaking": false,
  "type": "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert",
  "scope": "the affected module/area or empty string",
  "alternatives": [
    "alt type(scope): alternative phrasing 1",
    "alt type(scope): alternative phrasing 2"
  ]
}

Conventional commit types:
- feat: new feature
- fix: bug fix
- docs: documentation only
- style: formatting, no logic change
- refactor: neither fixes bug nor adds feature
- perf: performance improvement
- test: adding or fixing tests
- build: build system or deps
- ci: CI configuration
- chore: maintenance
- revert: reverts a previous commit

Rules:
- Subject line is imperative mood ("add feature" not "added feature")
- Subject line max 72 chars
- No period at end of subject
- If breaking change, add ! after type/scope and set breaking: true
- Body explains motivation and context, not what the diff shows
- Provide exactly 2 alternatives
- Be specific and meaningful, not generic`;

const EXAMPLE_DIFF = `diff --git a/src/auth/middleware.js b/src/auth/middleware.js
index a3f4b2c..8d91e0f 100644
--- a/src/auth/middleware.js
+++ b/src/auth/middleware.js
@@ -12,8 +12,15 @@ const jwt = require('jsonwebtoken');
 
 module.exports = function authMiddleware(req, res, next) {
   const token = req.headers.authorization?.split(' ')[1];
-  
-  if (!token) return res.status(401).json({ error: 'No token' });
+
+  if (!token) {
+    return res.status(401).json({
+      error: 'Authentication required',
+      code: 'MISSING_TOKEN'
+    });
+  }
 
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
@@ -21,7 +28,15 @@ module.exports = function authMiddleware(req, res, next) {
     next();
   } catch (err) {
-    return res.status(401).json({ error: 'Invalid token' });
+    if (err.name === 'TokenExpiredError') {
+      return res.status(401).json({
+        error: 'Token has expired',
+        code: 'TOKEN_EXPIRED',
+        expiredAt: err.expiredAt
+      });
+    }
+    return res.status(401).json({
+      error: 'Invalid authentication token',
+      code: 'INVALID_TOKEN'
+    });
   }
 };`;

// ============ STATE ============
let sessionCount = 0;
let currentCommit = null;

// ============ DOM REFS ============
const diffInput    = document.getElementById('diffInput');
const generateBtn  = document.getElementById('generateBtn');
const outputArea   = document.getElementById('outputArea');
const copyBtn      = document.getElementById('copyBtn');
const charCount    = document.getElementById('charCount');
const breakdown    = document.getElementById('breakdown');
const alternatives = document.getElementById('alternatives');
const altList      = document.getElementById('altList');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText  = document.getElementById('loadingText');
const toast        = document.getElementById('toast');
const statGenerated = document.getElementById('statGenerated');

// ============ EVENTS ============
diffInput.addEventListener('input', updateCharCount);
generateBtn.addEventListener('click', handleGenerate);
copyBtn.addEventListener('click', handleCopy);
document.getElementById('loadExample').addEventListener('click', loadExample);

function updateCharCount() {
  const lines = diffInput.value.split('\n').length;
  charCount.textContent = diffInput.value.length === 0 ? '0 lines' : `${lines} lines`;
}

function loadExample() {
  diffInput.value = EXAMPLE_DIFF;
  updateCharCount();
  diffInput.focus();
}

// ============ GENERATE ============
async function handleGenerate() {
  const diff = diffInput.value.trim();

  if (!diff) {
    showToast('Paste a git diff first!', 'error');
    diffInput.focus();
    return;
  }

  if (diff.length < 20) {
    showToast('Diff looks too short — try a real one', 'error');
    return;
  }

  setLoading(true, 'Analyzing diff...');
  generateBtn.classList.add('loading');
  resetOutput();

  try {
    const result = await callClaude(diff);
    currentCommit = result;
    renderOutput(result);
    sessionCount++;
    statGenerated.textContent = sessionCount;
    showToast('Commit message generated!');
  } catch (err) {
    renderError(err.message || 'Something went wrong');
  } finally {
    setLoading(false);
    generateBtn.classList.remove('loading');
  }
}

// ============ API CALL ============
async function callClaude(diff) {
  const loadingMessages = [
    'Analyzing diff...',
    'Understanding changes...',
    'Crafting message...',
    'Checking conventions...'
  ];

  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    loadingText.textContent = loadingMessages[msgIndex];
  }, 900);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Here is the git diff to analyze:\n\n\`\`\`diff\n${diff}\n\`\`\``
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Invalid API key. Check your key and try again.');
      if (response.status === 429) throw new Error('Rate limit hit. Wait a moment and try again.');
      throw new Error(errData.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Parse JSON — strip any accidental markdown fences
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(clean);

    // Validate required fields
    if (!parsed.subject) throw new Error('Invalid response from AI — missing subject field');

    return parsed;

  } finally {
    clearInterval(msgInterval);
  }
}

// ============ API KEY ============
function getApiKey() {
  // Check localStorage for saved key
  let key = localStorage.getItem('commitcraft_api_key');
  if (key) return key;

  // Prompt user
  key = prompt(
    'Enter your Anthropic API key:\n(Starts with "sk-ant-")\n\nIt will be saved locally in your browser.',
    ''
  );

  if (!key || !key.startsWith('sk-ant-')) {
    throw new Error('No valid API key provided. Get one at console.anthropic.com');
  }

  localStorage.setItem('commitcraft_api_key', key);
  return key;
}

// ============ RENDER ============
function renderOutput(commit) {
  copyBtn.disabled = false;

  // Format subject with syntax highlighting
  const subjectHighlighted = formatSubjectHTML(commit.subject);

  let html = `<div class="commit-output">
    <div class="commit-subject">${subjectHighlighted}</div>`;

  if (commit.body && commit.body.trim()) {
    html += `<div class="commit-body">${escapeHtml(commit.body.trim())}</div>`;
  }

  html += `</div>`;

  outputArea.innerHTML = html;

  // Breakdown
  document.getElementById('bType').textContent = commit.type || '—';
  document.getElementById('bScope').textContent = commit.scope || 'none';
  document.getElementById('bBreaking').textContent = commit.breaking ? '⚠ Yes' : 'No';
  document.getElementById('bBreaking').style.color = commit.breaking ? 'var(--red)' : 'var(--green)';
  breakdown.style.display = 'grid';

  // Alternatives
  if (commit.alternatives && commit.alternatives.length > 0) {
    altList.innerHTML = commit.alternatives.map(alt =>
      `<div class="alt-item" onclick="selectAlternative(this, '${escapeAttr(alt)}')">${escapeHtml(alt)}</div>`
    ).join('');
    alternatives.style.display = 'block';
  }
}

function formatSubjectHTML(subject) {
  // Highlight type(scope): prefix
  const match = subject.match(/^([a-z]+)(\([^)]+\))?(!)?(: .+)$/);
  if (!match) return escapeHtml(subject);

  const type = `<span class="commit-type-tag">${escapeHtml(match[1])}</span>`;
  const scope = match[2] ? `<span class="commit-scope-tag">${escapeHtml(match[2])}</span>` : '';
  const bang = match[3] ? `<span style="color:var(--red)">!</span>` : '';
  const rest = escapeHtml(match[4]);

  return `${type}${scope}${bang}${rest}`;
}

function renderError(message) {
  outputArea.innerHTML = `
    <div class="error-state">
      <div class="error-title">⚠ Generation failed</div>
      <div class="error-msg">${escapeHtml(message)}</div>
    </div>`;
  breakdown.style.display = 'none';
  alternatives.style.display = 'none';
  copyBtn.disabled = true;
}

function resetOutput() {
  outputArea.innerHTML = `
    <div class="placeholder-state">
      <div class="placeholder-icon streaming-cursor">✦</div>
      <p>Generating...</p>
    </div>`;
  breakdown.style.display = 'none';
  alternatives.style.display = 'none';
  copyBtn.disabled = true;
}

// ============ ACTIONS ============
function handleCopy() {
  if (!currentCommit) return;

  let text = currentCommit.subject;
  if (currentCommit.body && currentCommit.body.trim()) {
    text += '\n\n' + currentCommit.body.trim();
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
    copyBtn.textContent = 'Copied ✓';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copied!');
  });
}

function selectAlternative(el, subject) {
  if (!currentCommit) return;
  currentCommit.subject = subject;

  // Update displayed subject
  const subjectEl = outputArea.querySelector('.commit-subject');
  if (subjectEl) subjectEl.innerHTML = formatSubjectHTML(subject);

  // Highlight selected alternative
  document.querySelectorAll('.alt-item').forEach(a => a.style.borderColor = '');
  el.style.borderColor = 'var(--accent)';
  el.style.color = 'var(--text)';

  showToast('Alternative selected');
}

// ============ LOADING ============
function setLoading(on, message = '') {
  loadingOverlay.style.display = on ? 'flex' : 'none';
  if (message) loadingText.textContent = message;
}

// ============ TOAST ============
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.background = type === 'error' ? 'var(--red)' : 'var(--accent)';
  toast.style.color = 'var(--bg)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============ UTILS ============
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/\n/g, ' ');
}

// ============ INIT ============
function init() {
  updateCharCount();

  // Keyboard shortcut: Ctrl/Cmd + Enter to generate
  diffInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  });

  // Show keyboard hint
  const hint = document.querySelector('.panel-footer .char-count');
  if (hint) {
    setTimeout(() => {
      hint.textContent = '⌘↩ to generate';
      setTimeout(updateCharCount, 3000);
    }, 1500);
  }
}

init();
