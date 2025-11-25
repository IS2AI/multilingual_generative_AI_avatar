# 🎓 ISSAI Avatar - Virtual Learning Platform

> **A cutting-edge virtual learning platform featuring AI-powered metahuman avatars, real-time voice recognition, and immersive 3D classrooms.**

![EduVerse Preview](https://img.shields.io/badge/Status-Active-brightgreen) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![Three.js](https://img.shields.io/badge/Three.js-R3F-orange) ![Voice Recognition](https://img.shields.io/badge/Voice-Recognition-purple)

## ✨ Features

### 🏠 **Beautiful Landing Page**
- Modern gradient animations with floating blob effects
- Professional branding and feature showcase
- Responsive design with smooth transitions
- Call-to-action navigation to virtual classroom

### 🎓 **Immersive 3D Classroom**
- **Realistic classroom environment** with desks, whiteboard, and proper lighting
- **AI educator avatar** with facial expressions and animations
- **Educational content display** on interactive whiteboard
- **Multiple camera angles** with zoom controls
- **Dynamic lighting system** optimized for learning

### 🎤 **Advanced Voice Recognition**
- **Hands-free interaction** with Web Speech API
- **Auto-send after 2 seconds of silence** - no clicking required!
- **Smart pause/resume** - automatically pauses during AI responses
- **Real-time voice visualization** with volume indicators
- **Live transcript preview** with countdown timer
- **Anti-feedback system** prevents picking up AI teacher's voice

### 💻 **Zoom-like Interface**
- **Professional conference controls** (mute, video, participants)
- **Participant management panel** with online status
- **Live chat system** for class discussions
- **Lesson progress tracking** with visual progress bar
- **Hand-raising feature** for student interaction
- **Screen sharing ready** interface

### 🤖 **AI Educator Integration**
- **Contextual conversations** with educational focus
- **Subject-specific responses** (Physics, Quantum Mechanics)
- **Adaptive learning experience** based on student level
- **Real-time lip-sync** and facial expressions
- **Multiple animation states** (idle, talking, gesturing)

## 📝 Recent Updates (v2.0.0)

### 🎤 **MangiSoz STT Integration**
- **Migrated from Web Speech API to MangiSoz STT API** for improved Kazakh and Russian speech recognition
- **Real-time STT performance tracking** - monitor speech-to-text conversion time
- **Smart audio processing** - automatically stops recording after 2 seconds of silence
- **Minimum recording duration** - ignores recordings shorter than 2 seconds to prevent false triggers
- **Enhanced noise filtering** - improved threshold (>30) for better speech detection

### ⚡ **Performance Improvements**
- **Comprehensive metrics dashboard** displaying:
  - **STT Time** - Speech-to-text conversion duration
  - **Oylan API Time** - AI response generation time
  - **TTS Time** - Text-to-speech synthesis time
  - **Total Time** - End-to-end latency tracking
- **Visual breakdown** - Progress bars showing time distribution across processing stages

### 🔧 **API Enhancements**
- **Oylan API optimization** with token limiting (max_tokens: 350)
- **Improved response cleaning** - better removal of `<think>` tags and formatting
- **Automatic language detection** - detects response language for proper TTS
- **Fallback responses** - handles empty or invalid API responses gracefully

### 🎨 **UI/UX Improvements**
- **Processing indicator** - visual "Processing..." status during STT conversion
- **Transcript preview** - shows recognized text before sending to AI
- **Auto-clear input** - input field clears automatically after AI response
- **Manual stop support** - prevents auto-resume when user manually stops voice recognition
- **Multilingual UI** - supports Kazakh, Russian, and English interface labels

### 🐛 **Bug Fixes**
- Fixed microphone language selection synchronization
- Prevented MediaRecorder conflicts during recording transitions
- Improved auto-pause/resume behavior during AI responses
- Enhanced error handling for STT API failures

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

## 🌐 Navigation

- **Landing Page:** `/` - Beautiful introduction to EduVerse
- **Virtual Classroom:** `/classroom` - Main learning environment

## 🎮 Usage Guide

### 🎤 Voice Interaction

1. **Click the microphone button** to start voice recognition
2. **Speak your question** to the AI educator
3. **Stop speaking** - automatic 2-second countdown begins
4. **Message sends automatically** - no button clicking needed!
5. **AI responds** - microphone auto-pauses during response
6. **Auto-resumes** after AI finishes for seamless conversation

### 🎛️ Classroom Controls

#### **Video Controls (Left Side):**
- 🔇 **Mute/Unmute** - Toggle microphone
- 📹 **Video On/Off** - Toggle camera
- 🎤 **Voice Recognition** - Smart voice control with visual feedback

#### **3D Environment (Right Side):**
- 🔍 **Zoom In/Out** - Focus on AI educator or full classroom view
- 🌍 **Change Environment** - Switch between different classroom themes
- ✋ **Raise Hand** - Interactive student participation

#### **Communication (Center):**
- 💬 **Text Input** - Type questions manually or use voice
- 🤖 **Ask Button** - Send text messages to AI educator
- 📊 **Progress Bar** - Track lesson completion

#### **Panels (Right Side):**
- 👥 **Participants** - View online students and instructors
- 💬 **Chat** - Class discussion and messages
- 🚪 **Leave Class** - Exit the virtual classroom

## 🛠️ Technology Stack

### **Frontend Framework:**
- **React 18.2.0** - Modern UI framework
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling

### **3D Graphics:**
- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **React Three Drei** - Useful helpers and abstractions

### **Voice & Audio:**
- **MangiSoz STT API** - Advanced speech-to-text for Kazakh and Russian languages
- **MangiSoz TTS API** - High-quality text-to-speech synthesis
- **Web Audio API** - Audio analysis and visualization
- **MediaDevices API** - Microphone access and audio recording

### **Animations:**
- **GLTF/GLB Models** - 3D avatar with animations
- **Facial Expressions** - Dynamic emotion mapping
- **Lip Sync** - Real-time mouth movement

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

## 🔧 Configuration

### **Environment Variables**
Create a `.env` file in the root directory:

```env
# Backend API URL (optional)
VITE_API_URL=http://localhost:3000

# Additional configuration options
VITE_ENVIRONMENT=development
```

### **Backend Integration**
The frontend expects a backend API at `http://localhost:3000` by default.

#### **Required API Endpoints:**
- `POST /chat` - Send educational queries to AI

#### **Request Format:**
```json
{
  "message": "User's question",
  "context": "virtual_classroom",
  "role": "ai_educator",
  "subject": "physics_quantum_mechanics",
  "lesson_progress": 34,
  "student_level": "intermediate"
}
```

#### **Response Format:**
```json
{
  "messages": [
    {
      "text": "AI educator response",
      "audio": "base64_audio_data",
      "lipsync": "lipsync_data",
      "facialExpression": "smile",
      "animation": "Talking_1"
    }
  ]
}
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

### **Deploy to Platforms:**
- **Vercel:** Connect GitHub repository for automatic deployments
- **Netlify:** Drag and drop `dist` folder
- **AWS S3:** Upload build files to S3 bucket
- **GitHub Pages:** Use `gh-pages` package

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Three Fiber** community for 3D web development
- **Web Speech API** for voice recognition capabilities
- **Three.js** for powerful 3D graphics
- **Tailwind CSS** for beautiful, responsive styling

## 📞 Support

For questions, issues, or contributions:
- **GitHub Issues:** Report bugs and request features
- **Discussions:** Share ideas and get help
- **Documentation:** Check the wiki for detailed guides
- **Email:** ergenadil280308@gmail.com

---

**🎓 EduVerse - Transforming education through immersive technology**

*Built with ❤️ using React, Three.js, and cutting-edge web technologies*
