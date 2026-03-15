# Job Apply Assistant – Chrome Extension

AI-powered Chrome Extension (Manifest V3) that analyzes job postings and generates professional cover letters in **Typst** format.

---

## Features

- 🔍 **Job Analysis** – Extracts position, company, requirements, tasks, and location using AI
- ✍️ **Cover Letter Generator** – Creates a professional cover letter as a Typst document
- 🤖 **Two AI Modes** – Gemini API (online) or Ollama (local, cloud)
- 👤 **Candidate Profile** – Editable JSON profile in settings
- 📋 **Application Tracker** – Table with status management and CSV export
- 🌙 **Dark Theme** – Modern, minimalist UI

---

## Installation

### 1. Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle at top right)
3. Click **"Load unpacked"**
4. Select the `job-apply-assistant/` folder
5. The extension appears in the toolbar

### 2. Configure AI Mode

**Mode A – Gemini (recommended):**
1. Get an API Key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Open the extension → **Settings** tab
3. Enter the API Key and click **"Save Settings"**

**Mode B – Ollama (local):**
1. Install [Ollama](https://ollama.ai) and start it: `ollama serve`
2. Pull a model: `ollama pull llama3`
3. In the extension: Toggle to **"Ollama"**
4. If you encounter CORS errors → see below

---

## Go Proxy for Ollama (CORS)

Chrome Extensions cannot directly access `localhost:11434` due to CORS restrictions. The included Go proxy solves this problem.

### Requirements
- [Go](https://go.dev/dl/) installed (≥ 1.21)

### Start

```bash
cd proxy
go run main.go
```

The proxy runs on `http://localhost:8080` and forwards requests to Ollama.

---

## Usage

1. Open a job posting in your browser (e.g., LinkedIn, StepStone, Indeed)
2. Click the extension icon in the toolbar
3. **Step 1:** Click **"Analyze Job Posting"** → AI extracts job information
4. **Step 2:** Click **"Generate Cover Letter"** → A Typst document is created
5. **Copy** the Typst code or **download** it as a `.typ` file
6. Compile the document with [Typst](https://typst.app): `typst compile cover_letter.typ`

---

## File Structure

```
job-apply-assistant/
├── manifest.json      # Manifest V3 configuration
├── popup.html         # Popup UI (Dark Theme)
├── popup.js           # Popup Logic (AI, Storage, Tabs)
├── content.js         # Content Script (Text Extraction)
├── background.js      # Service Worker
├── proxy/
│   └── main.go        # Go CORS proxy for Ollama
└── README.md
```

---

## Technology

| Component  | Technology                |
| ---------- | ------------------------- |
| Extension  | Chrome Manifest V3        |
| UI         | Vanilla HTML/CSS/JS       |
| AI (online)| Google Gemini 2.0 Flash   |
| AI (local) | Ollama (any model)        |
| Output     | Typst (.typ)              |
| Proxy      | Go net/http               |

---

## License

MIT
