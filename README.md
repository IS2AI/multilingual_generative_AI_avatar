# Multilingual Generative AI Avatar: Local and Cloud-based Real-Time Deployments

## About

This repository presents a lightweight, multilingual avatar system for real-time Human-AI interaction in Kazakh, Russian, and English. We compare two deployment architectures developed at ISSAI:

**Local:** Uses quantized Qolda model (4.3B parameters), Whisper Turbo ASR, and Matcha-TTS
**Cloud-based:** Uses Oylan LLM and MangiSoz APIs

**Key Results:**
- Local deployment is 62% faster (2.20s vs 5.74s end-to-end latency)
- LLM inference: 76% faster locally (0.99s vs 4.11s)
- ASR: 38% faster locally
- Avatar rendering uses only 15-20% GPU at 60 FPS
- On-device models enable responsive, offline multilingual interaction


## Features

### Core Capabilities
- **Multilingual Support:** Kazakh, Russian, and English language processing
- **Dual Deployment Architectures:** Cloud-based and local deployment options
- **Real-time Human-AI Interaction:** Low-latency conversational interface
- **3D Avatar Interface:** Ready Player Me-based avatar rendering at 60 FPS
- **Speech Processing Pipeline:** End-to-end ASR, LLM inference, and TTS synthesis

## Demo

[![Video Demo](https://img.youtube.com/vi/bvcy_vNbb20/0.jpg)](https://youtu.be/bvcy_vNbb20?si=IY1tF9T-9_nJyx-Y)

Watch the [video demonstration](https://youtu.be/bvcy_vNbb20?si=IY1tF9T-9_nJyx-Y) to see the system in action.

## System Pipeline

The following diagram illustrates the complete system architecture comparing cloud-based and local deployment approaches:

![System Pipeline](./Colored_merged_pipeline.drawio.svg)

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager
- **Modern browser** with microphone access support
- **MangiSoz API access** (STT and TTS services)

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd r3f-virtual-girlfriend-frontend
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Start development server:**
```bash
npm run dev
# or
yarn dev
```

4. **Open in browser:**
Navigate to `http://localhost:5173/`

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
│   ├── ClassroomPage.jsx        # Main classroom wrapper
│   ├── ClassroomUI.jsx          # Zoom-like interface
│   ├── ClassroomExperience.jsx  # 3D classroom environment
│   ├── VoiceRecognition.jsx     # Voice control component
│   ├── Avatar.jsx               # AI educator 3D model
│   ├── Experience.jsx           # Original 3D scene
│   └── UI.jsx                   # Original UI (legacy)
├── hooks/
│   ├── useChat.jsx              # AI conversation management
│   ├── useMangiSozSTT.jsx       # MangiSoz STT integration
│   └── useVoiceRecognition.jsx  # Legacy voice recognition (deprecated)
├── assets/
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

## 🚀 Deployment

### **Build for Production:**
```bash
npm run build
# or
yarn build
```

### **Preview Production Build:**
```bash
npm run preview
# or
yarn preview
```
