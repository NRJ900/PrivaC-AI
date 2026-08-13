# PrivaC AI
> **Local-First, Privacy-Focused AI Chat, RAG & Web Intelligence Platform**

PrivaC AI is a high-performance, private-by-design AI workspace that runs entirely on your local machine. It connects a modern **React + Vite** frontend with a **Fastify TypeScript** backend proxy, utilizing local LLMs served via **Ollama**.

---

## ✨ Key Features

- **🔒 100% Local & Private**: Prompts, conversation histories, memory, and documents never leave your device.
- **⚡ Real-Time SSE Token Streaming**: Low-latency token streaming powered by Server-Sent Events (SSE).
- **🧠 Retrieval-Augmented Generation (RAG)**: Upload documents (PDFs) for context-aware Q&A and knowledge retrieval.
- **🛑 Smart Abort Controller**: Closing a chat tab or stopping response generation immediately kills the local Ollama inference process to prevent CPU/GPU lockup.
- **💾 Local Persistent Storage**: SQLite database (`better-sqlite3`) for fast, local chat history and session persistence.
- **🌐 Web Search Synthesis**: Live web search extraction via Cheerio & Axios to enrich AI responses with up-to-date information.
- **👁️ Multimodal & Code Execution**: Vision payload handling (50MB body limit) and local code execution capabilities.
- **🎨 Sleek Modern Interface**: Built with React 18, Zustand, Tailwind CSS, Radix UI primitives, Lucide Icons, and dynamic animations.

---

## 🏗️ Architecture Overview

```
 ┌────────────────┐          SSE / HTTP           ┌────────────────┐         HTTP          ┌────────────────┐
 │                │  ◄─────────────────────────►  │                │  ──────────────────►  │                │
 │ React Frontend │                               │ Fastify Proxy  │                       │ Ollama Engine  │
 │  (Vite + TS)   │  ────────── Abort Signal ───► │  (Node.js + TS)│  ◄── Cancel Stream ── │(http://127.0.0.1:11434)
 └────────────────┘                               └───────┬────────┘                       └────────────────┘
                                                          │
                                                  ┌───────▼────────┐
                                                  │ SQLite DB      │
                                                  │ (better-sqlite3│
                                                  └────────────────┘
```

---

## 📁 Repository Structure

```
PrivaC AI/
├── backend/            # Fastify server, Ollama proxy, RAG pipeline, SQLite & PDF processing
│   ├── server.ts       # Fastify server entry point
│   ├── src/            # Backend routes (chat, RAG, memory, files, models, tools)
│   ├── data/           # SQLite storage & persistent memory (ignored by git)
│   └── package.json
├── frontend/           # React frontend app
│   ├── src/            # UI components, Zustand stores, theme utilities
│   ├── index.html
│   └── package.json
├── .gitignore          # Root Git ignore configuration
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: Version 18.x or higher.
2. **Ollama**: Download and install from [ollama.com](https://ollama.com/).
   - Ensure Ollama is running (`http://localhost:11434`).
   - Pull your preferred model:
     ```bash
     ollama pull llama3
     # or
     ollama pull mistral
     ```

---

### 📥 Installation & Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/NRJ900/PrivaC-AI.git
cd PrivaC-AI
```

#### 2. Setup & Start Backend Server
```bash
cd backend
npm install
npm run dev
```
> The backend server starts at `http://localhost:3000`.

#### 3. Setup & Start Frontend Application
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
> The frontend application runs at `http://localhost:5173`.

---

## ⚙️ Configuration

### Backend Environment Variables (`/backend/.env`)

Create a `.env` file inside the `/backend` directory:

```env
PORT=3000
OLLAMA_URL=http://localhost:11434
DEBUG=false
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
