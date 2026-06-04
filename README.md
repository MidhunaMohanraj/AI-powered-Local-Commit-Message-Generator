# ⬡ CommitCraft — AI Commit Message Generator

> Stop writing bad commits. Paste your `git diff` — get a perfect, conventional commit message instantly.

![CommitCraft](https://img.shields.io/badge/powered%20by-Claude%20Sonnet-E8FF47?style=flat&logo=anthropic&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What it does

CommitCraft analyzes your git diff using Claude and generates:

- ✅ A properly formatted **conventional commit** subject line
- ✅ An optional **body** explaining the *why* behind the change  
- ✅ **2 alternative** phrasings to choose from
- ✅ A **breakdown** of type, scope, and whether it's a breaking change

All in under 2 seconds.

---

## Getting Started

### 1. Clone or download

```bash
git clone https://github.com/yourusername/commitcraft
cd commitcraft
```

### 2. Open in browser

Just open `index.html` directly — no build step, no server needed.

```bash
open index.html
# or
npx serve .
```

### 3. Add your Anthropic API key

On first use, you'll be prompted for your API key (starts with `sk-ant-`).  
Get one at [console.anthropic.com](https://console.anthropic.com).

Your key is saved to `localStorage` — never sent anywhere except Anthropic's API.

---

## Usage

**Option A — Paste a diff:**
```bash
git diff HEAD          # unstaged changes
git diff --staged      # staged changes  
git diff main..feature # branch diff
```
Copy the output, paste into CommitCraft, hit **Generate Commit**.

**Option B — Use the example:**  
Click "Load example diff" to see it in action immediately.

**Keyboard shortcut:** `Ctrl/Cmd + Enter` to generate.

---

## Conventional Commits format

CommitCraft follows the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:** `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `chore` · `revert`

---

## Project Structure

```
commitcraft/
├── index.html   # App shell & markup
├── style.css    # Full styling (no framework)
├── app.js       # All logic + Anthropic API calls
└── README.md    # This file
```

Zero dependencies. Zero build tools. Zero frameworks.  
Pure HTML + CSS + JS. Runs anywhere.

---

## Customization

**Change the model** — edit `MODEL` in `app.js`:
```js
const MODEL = "claude-sonnet-4-20250514"; // or claude-haiku-4-5-20251001 for speed
```

**Change the prompt** — edit `SYSTEM_PROMPT` in `app.js` to enforce your team's conventions.

**Pre-load your API key** — replace the `getApiKey()` function to read from an env file or config.

---

## License

MIT — use it, fork it, ship it.
