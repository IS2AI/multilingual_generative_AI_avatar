# 🤖 Multilingual Generative AI Avatar: Local and Cloud-based Real-Time Deployments

## 📖 About

This repository presents a lightweight, multilingual avatar system for real-time Human-AI interaction in Kazakh, Russian, and English. We compare two deployment architectures developed at ISSAI:

**Local:** Uses quantized Qolda model (4.3B parameters), Whisper Turbo ASR, and Matcha-TTS
**Cloud-based:** Uses Oylan LLM and MangiSoz APIs

**Key Results:**
- Local deployment is 62% faster (2.20s vs 5.74s end-to-end latency)
- LLM inference: 76% faster locally (0.99s vs 4.11s)
- ASR: 38% faster locally
- Avatar rendering uses only 15-20% GPU at 60 FPS
- On-device models enable responsive, offline multilingual interaction


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
git clone https://github.com/IS2AI/lightweight_avatar
cd lightweight_avatar
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

## 🌐 Deployment Options

This avatar system supports **two deployment architectures**: local (on-device) and cloud-based. You can easily switch between them using the API Settings interface in the UI.

### 📍 Local Deployment (Recommended for Best Performance)

**For Local Deployment**, set up the three backend services and the Avatar UI:

1. **Deploy Qolda LLM using llama.cpp** (Port 8080)
   - Download the quantized GGUF model from HuggingFace: [issai/Qolda](https://huggingface.co/issai/Qolda) or [issai/Qolda_GGUF](https://huggingface.co/issai/Qolda_GGUF)
   - Install [llama.cpp](https://github.com/ggerganov/llama.cpp) and run the server:
   ```bash
   # Clone llama.cpp
   git clone https://github.com/ggerganov/llama.cpp
   cd llama.cpp
   make

   # Download Qolda GGUF model
   # Place model in llama.cpp/models/

   # Start server on port 8080 (OpenAI-compatible API)
   ./server -m models/qolda-4.3b-q4_k_m.gguf --port 8080 --host 0.0.0.0
   ```
   - **Why llama.cpp?** It provides fast inference with minimal memory footprint compared to vLLM (consumes all GPU VRAM) or lmdeploy (requires >10GB)

2. **Deploy ASR service using faster-whisper** (Port 8002)
   - Install [faster-whisper](https://github.com/SYSTRAN/faster-whisper):
   ```bash
   pip install faster-whisper fastapi uvicorn python-multipart
   ```
   - Create a FastAPI wrapper that mimics OpenAI's Whisper API format:
   ```python
   # asr_server.py
   from fastapi import FastAPI, File, UploadFile, Form
   from faster_whisper import WhisperModel
   import uvicorn

   app = FastAPI()
   model = WhisperModel("large-v2", device="cuda", compute_type="float16")

   @app.post("/v1/audio/transcriptions")
   async def transcribe(
       file: UploadFile = File(...),
       model: str = Form(...),
       language: str = Form(None)
   ):
       audio_bytes = await file.read()
       # Save temporarily and transcribe
       with open("temp.wav", "wb") as f:
           f.write(audio_bytes)

       segments, info = model.transcribe("temp.wav", language=language)
       text = " ".join([segment.text for segment in segments])

       return {"text": text}

   if __name__ == "__main__":
       uvicorn.run(app, host="0.0.0.0", port=8002)
   ```
   - Start the server:
   ```bash
   python asr_server.py
   ```

3. **Deploy TTS service** (Port 8001)
   - Use ISSAI's TTS model ([issai/tts](https://huggingface.co/issai/tts) on HuggingFace - accessible only with ISSAI permission)
   - Wrap it in a FastAPI backend:
   ```python
   # tts_server.py
   from fastapi import FastAPI
   from fastapi.responses import StreamingResponse
   import uvicorn
   # Import your TTS model here

   app = FastAPI()

   @app.post("/tts/v1/audio/speech")
   async def synthesize(request: dict):
       text = request["input"]
       voice = request["voice"]  # "male" or "female"
       lang = request["lang"]     # "kk", "ru", or "en"

       # Generate audio using your TTS model
       audio_bytes = your_tts_model.synthesize(text, voice, lang)

       return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")

   if __name__ == "__main__":
       uvicorn.run(app, host="0.0.0.0", port=8001)
   ```
   - Start the server:
   ```bash
   python tts_server.py
   ```
   - **Note:** No optimization needed as TTS is already fast

4. **Start Avatar UI**
   ```bash
   cd lightweight_avatar
   npm install
   npm run dev
   ```
   - The Vite proxy (configured in `vite.config.js`) will automatically route:
     - `/api` → `http://localhost:8080` (LLM)
     - `/tts-api` → `http://localhost:8001` (TTS)
     - `/asr-api` → `http://localhost:8002` (ASR)

**Performance:** Local deployment achieves 62% faster performance (2.20s vs 5.74s end-to-end latency) compared to cloud deployment.

### ☁️ Cloud Deployment (Flexible, No Local Setup)

**For Cloud Deployment**, instead of running local services, configure cloud API endpoints directly in the UI:

1. **Start the Avatar UI:**
   ```bash
   cd lightweight_avatar
   npm install
   npm run dev
   ```

2. **Configure API endpoints in the UI:**
   - Open http://localhost:5173/
   - Click the **"API Settings"** button in the top-right corner
   - Switch to **"Cloud Deployment"** mode
   - Configure the three services:

   **LLM Configuration:**
   - **Option A:** Use cloud-hosted Qolda instance
   - **Option B:** Use Oylan API (ISSAI's cloud LLM service)
   - **Option C:** Use alternatives like OpenAI GPT-4
     ```
     URL: https://api.openai.com/v1/chat/completions
     Model: gpt-4
     API Key: sk-your-openai-key
     ```

   **ASR Configuration:**
   - **Option A:** Use MangiSoz API (provides faster-whisper as a service)
   - **Option B:** Use OpenAI Whisper API
     ```
     URL: https://api.openai.com/v1/audio/transcriptions
     Model: whisper-1
     API Key: sk-your-openai-key
     ```

   **TTS Configuration:**
   - **Option A:** Use cloud-hosted MangiSoz TTS service
   - **Option B:** Use alternatives like ElevenLabs API
     ```
     URL: https://api.elevenlabs.io/v1/text-to-speech
     Model: eleven_multilingual_v2
     API Key: your-elevenlabs-key
     ```

3. **Save configuration:**
   - Click **"Save Configuration"**
   - Settings are saved to localStorage and persist across sessions
   - You can switch between local and cloud deployments anytime without code changes

**All cloud services must follow OpenAI-compatible API formats.**

### 🔄 Switching Between Deployments

The avatar system supports seamless switching between local and cloud deployments:
- Configuration is saved to browser localStorage
- No code changes required
- Simply update API endpoints in the settings modal
- Restart not required - changes apply immediately

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
