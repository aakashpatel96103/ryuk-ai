# rYuk.ai — Professional Multi-Model AI Intelligence Workspace

[![Deployment](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://ryuk-ai.vercel.app)
[![Framework](https://img.shields.io/badge/Framework-TanStack%20Start%20%2B%20Vite-blue)](https://tanstack.com/start)
[![Styling](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

**rYuk.ai** is an enterprise-grade AI intelligence workspace combining dynamic multi-model routing, high-accuracy vision analysis, photorealistic FLUX image creation, live web search synthesis, interactive code sandboxing, and human-friendly step-by-step mathematical reasoning.

---

## ✨ Key Capabilities & Features

### 🧠 1. Dynamic Multi-Model Compute & Key Pool Failover
- **Intelligent Routing**: Automatically analyzes task complexity (code, math, vision, creative, reasoning) and selects optimal models.
- **Multi-Key Pool**: Supports multiple OpenRouter API keys (`OPENROUTER_API_KEY`, `OPENROUTER_API_KEYS`) with automatic rate-limit and credit quota failover.
- **Top Models**: GPT-4o, Llama 3.3 70B, Qwen 2.5 72B, DeepSeek Chat, and free-tier fallback models.

### 🖼️ 2. Multimodal Vision & OCR
- **GPT-4o Vision Priority**: Uploaded images are automatically routed to OpenAI's GPT-4o vision engine for detailed analysis, OCR, and diagram comprehension.
- **Document & File Studio**: Upload PDFs, text files, and images for direct in-context Q&A.

### 🎨 3. Next-Gen Image Studio (FLUX-Realism Engine)
- **1024x1024 Photorealistic Generation**: Built with the FLUX.1 architecture (`flux-realism`, `flux-anime`, `flux-3d`, `turbo`).
- **AI Prompt Intelligence**: Automatically enriches short prompts into rich, multi-subject cinematic scenes ensuring all characters, objects, lighting, and textures are preserved.

### 🌐 4. Live Web Search Synthesis
- Type `@web` or toggle the Web plugin to trigger real-time web browsing, source citation, and live reference image retrieval.

### 💻 5. Code & Math Experience
- **KaTeX Mathematical Typesetting**: Clean, human-readable step-by-step mathematical solutions without cluttered raw LaTeX macros.
- **Live Code Runner & Sandboxes**: Integrated syntax-highlighted code blocks and interactive iframe sandboxes for HTML/JS/CSS.
- **Mermaid Diagrams**: Visual flowcharts, architecture diagrams, and sequence flows rendered natively.

### 📱 6. Mobile-Optimized & Fluid UI
- **Zero Auto-Zoom Composer**: Viewport and input configurations engineered to eliminate mobile keyboard zoom glitches.
- **Dual Visual Themes**: OLED Deep Dark Mode and Glass Transparency Mode.
- **Cloud Sync**: Firebase Authentication (Google Sign-In) with automated multi-device chat history synchronization.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/aakashpatel96103/ryuk-ai.git
cd ryuk-ai
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here,sk-or-v1-your-backup-key-here
OPENROUTER_API_KEYS=sk-or-v1-your-key-here,sk-or-v1-your-backup-key-here
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 📦 Production Deployment

Deploy directly to **Vercel**:
```bash
npx vercel --prod
```

Configure your environment variables (`OPENROUTER_API_KEY`, `OPENROUTER_API_KEYS`) in your **Vercel Project Settings > Environment Variables**.

---

## 🛠️ Technology Stack

- **Runtime & Meta-Framework**: [TanStack Start](https://tanstack.com/start) with [Nitro](https://nitro.unjs.io/) and [Vite](https://vitejs.dev/)
- **State & Routing**: TanStack Router & React Query
- **Styling**: Tailwind CSS v4 & Lucide Icons
- **Markdown & Math**: KaTeX, Streamdown, Remark, Shiki
- **Database & Auth**: Google Firebase Auth & Cloud Firestore
- **AI Compute**: OpenRouter Multi-Key API & FLUX Image Engine

---

## 📄 License
MIT © [rYuk.ai](https://ryuk-ai.vercel.app)
