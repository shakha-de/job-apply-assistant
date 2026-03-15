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

## Local Proxy for Ollama (CORS)

Chrome Extensions cannot directly access `localhost:11434` due to CORS restrictions. This project includes local proxy options for that.

### Endpoints
- `POST /ollama` -> `http://localhost:11434/api/generate`
- `GET /models` -> `http://localhost:11434/api/tags`

### Option A: Auto-detect runtime (recommended)

```bash
cd proxy
./start-proxy.sh
```

Runtime priority:
- Go first (if installed)
- Python fallback (`python3`, then `python`)

### Option B: Run Go proxy directly

Requirements:
- [Go](https://go.dev/dl/) installed (>= 1.21)

```bash
cd proxy
go run main.go
```

### Option C: Run Python proxy directly

Requirements:
- Python 3.x

```bash
cd proxy
python3 main.py
```

### One-command launcher (curl)

After publishing this repository, users can launch with one command:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/job-apply-assistant/main/proxy/bootstrap-proxy.sh | bash
```

Custom port:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/job-apply-assistant/main/proxy/bootstrap-proxy.sh | PORT=9090 bash
```

The proxy listens on `http://localhost:8080` by default.

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
│   ├── main.go            # Go CORS proxy for Ollama
│   ├── main.py            # Python CORS proxy for Ollama
│   ├── start-proxy.sh     # Auto-detect launcher (Go priority)
│   └── bootstrap-proxy.sh # One-command curl launcher
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
| Proxy      | Go net/http + Python stdlib |

---

## License

MIT
