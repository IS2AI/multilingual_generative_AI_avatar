# 🤖 Multilingual Generative AI Avatar: Edge and Cloud-based Real-Time Deployments

## 📖 About

This repository presents a lightweight, multilingual avatar system for real-time Human-AI interaction in **Kazakh, Russian, and English**. We present and evaluate two practical deployment configurations developed at ISSAI:

- **Edge-deployed:** Uses ISSAI's **Qolda**, a Small Vision-Language Model (VLM) with **4.3B parameters** built upon Qwen3-4B and integrated into the InternVL3.5 architecture, together with fine-tuned **Whisper Turbo ASR** and **Matcha-TTS** — all running on a single consumer laptop GPU.
- **Cloud-based:** Uses ISSAI's **Oylan** LLM API and the STT/TTS services of the **MangiSoz** platform.

Both configurations use a browser-based, 3D-stylized avatar rendered with **Ready Player Me**.

> The multilingual avatar system demo, implementation pipeline, model details and set of questions used in the user study are publicly available at this project's GitHub repository.

## 📦 Reproducing the Work

**For Edge (Local) Deployment:** Set up the three backend services and Avatar UI:

1. Deploy **Qolda** using llama.cpp by downloading the GGUF model from HuggingFace (`issai/Qolda` or `issai/Qolda_GGUF`) and running it in llama.cpp's server mode on port 8080 to provide an OpenAI-compatible API endpoint.
2. Deploy the **ASR** service using faster-whisper (<https://github.com/SYSTRAN/faster-whisper>), wrapping it in a FastAPI backend that mimics OpenAI's Whisper API format.
3. Deploy the **TTS** service using ISSAI's TTS (`issai/tts` on HF, accessible only by permission of ISSAI) wrapped in a custom FastAPI backend, which requires no optimization as it's already fast.
4. Clone the Avatar UI repository (<https://github.com/IS2AI/multilingual_generative_AI_avatar>), run `npm install`, and start the dev server with `npm run dev` — the Vite proxy will automatically route `/api`, `/tts-api`, and `/asr-api` requests to your local services.

**For Cloud Deployment:** Instead of running local services, click the **"API Settings"** button in the avatar UI, switch to **"Cloud Deployment"** mode, and configure the three API endpoints: for the LLM, use the Oylan API (or a cloud-hosted Qolda instance) with your API key; for ASR, use the MangiSoz API (faster-whisper as a service); for TTS, use the cloud-hosted MangiSoz TTS service or any OpenAI-compatible alternative. The configuration is saved to `localStorage` and persists across sessions, enabling seamless switching between edge and cloud deployments without code changes.

## 📈 Key Results

Evaluated on **96 queries** (32 Kazakh, 32 Russian, 32 English) covering conversational, factual, reasoning, and practical tasks. Hardware: ASUS ROG Zephyrus G16, NVIDIA RTX 4090 Mobile GPU (16 GB VRAM).

- **End-to-end latency: 45.5% lower on the edge** — 2.28 s (edge) vs. 4.18 s (cloud).
  - Consistent across languages: Kazakh **41.7%** (2.63 s vs. 4.51 s), Russian **44.7%** (2.23 s vs. 4.03 s), English **50.0%** (2.00 s vs. 4.00 s).
- **LLM inference: 60.6% faster on the edge** — 1.08 s vs. 2.74 s (the single largest performance driver).
- **TTS: 43.4% faster on the edge** — 0.60 s vs. 1.06 s, with lower variance.
- **STT: cloud is 39.7% faster** — 0.38 s (cloud) vs. 0.63 s (edge), thanks to dedicated server-side GPUs — but the edge still wins on total end-to-end latency.
- **Avatar rendering** consumes only **17.0 ± 2.5% GPU** at a stable **60 FPS** (<0.10 GB VRAM), leaving ~83% of compute for concurrent AI inference.
- **Memory footprint:** Qolda occupies **9.07 GB** in FP16 GGUF or **4.58 GB** in INT8 GGUF — the quantized model can run on an 8 GB GPU (e.g., RTX 4060 / 3060).
- On-device models enable **responsive, offline, privacy-preserving** multilingual interaction.

## 📊 User Study Materials

The [`user_study/`](user_study) folder contains the questionnaires used in the within-subjects user study evaluating the edge-deployed AI avatar across three language conditions: **Kazakh**, **Russian**, and **English**.

### Contents

- [`user_study/plain_questions.pdf`](user_study/plain_questions.pdf) — Full list of study questions administered to participants (N = 7).

### Study Design

- **Design:** Within-subjects, counterbalanced (3 groups)
- **Task:** Interaction with the AI avatar interface in each language (participants read 32 queries to the avatar and rated each response 1–5)
- **Measures:**
  - Raw NASA-TLX / RTLX (6 subscales, 0–100) — cognitive workload
  - SUS (10 items, scored 0–100) — perceived usability (English 90.71, Russian 88.93, Kazakh 86.79)

## ✨ Features

### Core Capabilities

- **Multilingual Support:** Kazakh, Russian, and English language processing
- **Dual Deployment Architectures:** Edge-deployed and cloud-based options
- **Real-time Human-AI Interaction:** Low-latency conversational interface
- **3D Avatar Interface:** Ready Player Me-based avatar rendering at 60 FPS
- **Speech Processing Pipeline:** End-to-end ASR, LLM inference, and TTS synthesis

## 🎬 Demo

**[▶️ Watch the video demonstration](https://youtu.be/bvcy_vNbb20?si=IY1tF9T-9_nJyx-Y)** to see the system in action.

## 🏗️ System Pipeline

The following diagram illustrates the complete system architecture comparing the **cloud-based** and **edge-deployed** configurations:

![System Pipeline](./figure_1_avatar.png)

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Modern browser** with microphone access support

### Installation

1. **Clone the repository:**

```
git clone https://github.com/IS2AI/multilingual_generative_AI_avatar
cd multilingual_generative_AI_avatar
```

2. **Install dependencies:**

```
npm install
```

3. **Configure API endpoints** (see Deployment sections above)

4. **Start development server:**

```
npm run dev
```

5. **Open in browser:** Navigate to `http://localhost:5173/`

**Note:** For full functionality, you need to set up the backend services (LLM, TTS, ASR) as described in the "Reproducing the Work" section above, or configure cloud API endpoints using the "API Settings" button in the UI.

## 🎮 Usage Guide

### 🎤 Voice Interaction

1. **Click the microphone button** to start voice recognition
2. **Speak your question** to the AI avatar
3. **Stop speaking** — automatic 2-second countdown begins
4. **Message sends automatically** — no button clicking needed
5. **AI responds** — microphone auto-pauses during response
6. **Auto-resumes** after the AI finishes for seamless conversation

## 📁 Project Structure

```
src/
├── components/
│   ├── LandingPage.jsx          # Landing page
│   ├── ApiConfigModal.jsx       # API configuration modal
│   ├── ClassroomPage.jsx        # Main classroom wrapper
│   ├── ClassroomUI.jsx          # Zoom-like interface
│   ├── ClassroomExperience.jsx  # 3D classroom environment
│   ├── VoiceRecognition.jsx     # Voice control component
│   ├── Avatar.jsx               # AI avatar 3D model
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

### Environments

Modify `src/components/ClassroomExperience.jsx` to add new environments — change lighting presets, add new 3D models, or customize the layout.

### Avatar Personality

Update `src/hooks/useChat.jsx` to modify the context, specialization, response style, and interaction level.

### Voice Settings

Adjust `src/hooks/useVoiceRecognition.jsx` for silence-detection timing (default: 2 seconds), language settings, and audio sensitivity.

## 🏭 Production Build

```
npm run build      # build for production (output in dist/)
npm run preview    # preview the production build
```

The production build can be deployed to any static hosting service (Vercel, Netlify, GitHub Pages, etc.).

## 📄 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

You are free to **Share** and **Adapt** the material under the following terms:

- **Attribution** — You must give appropriate credit to ISSAI.
- **NonCommercial** — You may not use the material for commercial purposes.

For more details, see the [CC BY-NC 4.0 License](https://creativecommons.org/licenses/by-nc/4.0/).
