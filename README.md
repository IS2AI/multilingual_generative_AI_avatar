# 🤖 Multilingual Generative AI Avatar: Local and Cloud-based Real-Time Deployments

## 📖 About

This repository presents a lightweight, multilingual avatar system for real-time Human-AI interaction in Kazakh, Russian, and English. We compare two deployment architectures developed at ISSAI:

**Local:** Uses quantized Qolda model (4.3B parameters), Whisper Turbo ASR, and Matcha-TTS
**Cloud-based:** Uses Oylan LLM and MangiSoz APIs

## 📦 Reproducing the Work

**For Local Deployment:** Set up the three backend services and Avatar UI: 1. Deploy Qolda LLM using llama.cpp by downloading the quantized GGUF model from HuggingFace (issai/Qolda or issai/Qolda_GGUF) and running it with llama.cpp's server mode on port 8080 to provide an OpenAI-compatible API endpoint 2. Deploy the ASR service using faster-whisper (https://github.com/SYSTRAN/faster-whisper) conversion, wrapping it in a FastAPI backend that mimics OpenAI's Whisper API format; 3. Deploy the TTS service using ISSAI's TTS(issai/tts in HF, it is accessible with only by permission of ISSAI) wrapped in a custom FastAPI backend, which requires no optimization as it's already fast. 4. Clone the Avatar UI repository(https://github.com/IS2AI/multilingual_generative_AI_avatar), run npm install to install dependencies, and start the development server with npm run dev - the Vite proxy will automatically route /api, /tts-api, and /asr-api requests to your local services.

**For Cloud Deployment:** Instead of running local services, click the "API Settings" button in the avatar UI, switch to "Cloud Deployment" mode, and configure the three API endpoints: for LLM, use either a cloud-hosted Qolda instance or alternatives like Oylan API with your API key; for ASR, use MangiSoz API which provides faster-whisper as a service; for TTS, use cloud-hosted MangiSoz API TTS service or alternatives that are OpenAI-compatible API formats. The configuration is saved to localStorage and persists across sessions, enabling seamless switching between local and cloud deployments without code changes.

**Key Results:**
- Local deployment is 62% faster (2.20s vs 5.74s end-to-end latency)
- LLM inference: 76% faster locally (0.99s vs 4.11s)
- ASR: 38% faster locally
- Avatar rendering uses only 15-20% GPU at 60 FPS
- On-device models enable responsive, offline multilingual interaction

## 📊 User Study Materials

This folder contains the questionnaires used in the within-subjects user study evaluating an AI avatar typing interface across three language conditions: **Kazakh**, **Russian**, and **English**.

### Contents

- [`plain_questions.pdf`](plain_questions.pdf) — Full list of study questions administered to participants (N=7).

### Study Design

- **Design:** Within-subjects, counterbalanced (3 groups)
- **Task:** Typing interaction with an AI avatar interface in each language
- **Measures:**
  - Raw NASA-TLX (6 subscales, 0–100) — cognitive workload
  - SUS (10 items, scored 0–100) — perceived usability

## ✨ Features

### Core Capabilities
- **Multilingual Support:** Kazakh, Russian, and English language processing
- **Dual Deployment Architectures:** Cloud-based and local deployment options
- **Real-time Human-AI Interaction:** Low-latency conversational interface
- **3D Avatar Interface:** Ready Player Me-based avatar rendering at 60 FPS
- **Speech Processing Pipeline:** End-to-end ASR, LLM inference, and TTS synthesis

## 🎬 Demo

**[▶️ Watch the video demonstration](https://youtu.be/bvcy_vNbb20?si=IY1tF9T-9_nJyx-Y)** to see the system in action.

## 🏗️ System Pipeline

The following diagram illustrates the complete system architecture comparing cloud-based and local deployment approaches:

![System Pipeline](./Colored_merged_pipeline.drawio.svg)

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Modern browser** with microphone access support

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/IS2AI/multilingual_generative_AI_avatar
cd multilingual_generative_AI_avatar
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure API endpoints** (see Deployment sections below)

4. **Start development server:**
```bash
npm run dev
```

5. **Open in browser:**
Navigate to `http://localhost:5173/`

**Note:** For full functionality, you need to set up backend services (LLM, TTS, ASR) as described in the "Reproducing the Work" section above, or configure cloud API endpoints using the "API Settings" button in the UI.

## 🎮 Usage Guide

### 🎤 Voice Interaction

1. **Click the microphone button** to start voice recognition
2. **Speak your question** to the AI educator
3. **Stop speaking** - automatic 2-second countdown begins
4. **Message sends automatically** - no button clicking needed!
5. **AI responds** - microphone auto-pauses during response
6. **Auto-resumes** after AI finishes for seamless conversation

## 📁 Project Structure

```
src/
├── components/
│   ├── LandingPage.jsx          # Beautiful landing page
│   ├── ApiConfigModal.jsx       # API configuration modal
│   ├── ClassroomPage.jsx        # Main classroom wrapper
│   ├── ClassroomUI.jsx          # Zoom-like interface
│   ├── ClassroomExperience.jsx  # 3D classroom environment
│   ├── VoiceRecognition.jsx     # Voice control component
│   ├── Avatar.jsx               # AI educator 3D model
│   ├── Experience.jsx           # Original 3D scene
│   └── UI.jsx                   # Original UI (legacy)
├── contexts/
│   └── ApiConfigContext.jsx     # API configuration state management
├── hooks/
│   ├── useChat.jsx              # AI conversation management (LLM + TTS)
│   ├── useMangiSozSTT.jsx       # ASR integration
│   └── useVoiceRecognition.jsx  # Legacy voice recognition (deprecated)
├── utils/
│   └── audioConverter.js        # Audio format conversion utilities
├── assets/                      # 3D models, textures, environments
├── App.jsx                      # Main app with routing
├── main.jsx                     # App entry point
└── index.css                    # Global styles + animations
```

## 🎨 Customization

### **Classroom Themes**
Modify `src/components/ClassroomExperience.jsx` to add new environments:
- Change lighting presets
- Add new 3D models
- Customize classroom layout

### **AI Educator Personality**
Update `src/hooks/useChat.jsx` to modify:
- Educational context
- Subject specialization
- Response style
- Learning level

### **Voice Settings**
Adjust `src/hooks/useVoiceRecognition.jsx` for:
- Silence detection timing (default: 2 seconds)
- Language settings
- Audio sensitivity

## 🏭 Production Build

### **Build for Production:**
```bash
npm run build
```

### **Preview Production Build:**
```bash
npm run preview
```

The production build will be generated in the `dist/` directory and can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:
- **Attribution** — You must give appropriate credit to ISSAI
- **NonCommercial** — You may not use the material for commercial purposes

For more details, see the [CC BY-NC 4.0 License](https://creativecommons.org/licenses/by-nc/4.0/).
