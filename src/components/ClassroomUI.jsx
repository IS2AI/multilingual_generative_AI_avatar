import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { VoiceRecognition } from "./VoiceRecognition";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { ChatHistory } from "./ChatHistory";

export const ClassroomUI = ({ hidden, userInfo, ...props }) => {
    const input = useRef();
    const { chat, loading, cameraZoomed, setCameraZoomed, message, setLanguage, voiceGender, setVoiceGender, stopSpeaking, setSttTime, showGreeting, chatHistory } = useChat();

    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const voiceRecognitionRef = useRef();
    const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());

    // Get user's selected language and voice
    const userLanguage = userInfo?.language || 'kk';
    const selectedAvatar = userInfo?.avatar || 'avatar1';

    // Kazakh greeting phrases for idle timeout
    const kazakhGreetings = [
        "Қалың қалай?",
        "Сәлеметсіз бе?",
        "Сізге қалай көмектесе аламын?",
        "Мені тыңдап тұрсыз ба?",
        "Сұрағыңыз бар ма?",
    ];

    // Set the language and voice in chat context when component loads
    useEffect(() => {
        setLanguage(userLanguage);
        if (userInfo?.voiceGender) {
            setVoiceGender(userInfo.voiceGender);
        }
    }, [userLanguage, userInfo?.voiceGender, setLanguage, setVoiceGender]);

    // Idle timeout: show greeting after 20 seconds of inactivity
    // TEMPORARILY DISABLED - можно включить позже
    /*
    useEffect(() => {
        const checkIdleTimeout = setInterval(() => {
            const now = Date.now();
            const timeSinceLastInteraction = now - lastInteractionTime;
            const IDLE_TIMEOUT = 20000; // 20 seconds

            if (timeSinceLastInteraction >= IDLE_TIMEOUT && !loading && !message) {
                // Pick a random greeting
                const randomGreeting = kazakhGreetings[Math.floor(Math.random() * kazakhGreetings.length)];
                console.log('Idle timeout reached, showing greeting:', randomGreeting);
                showGreeting(randomGreeting, 'kk');
                // Reset interaction time to prevent continuous greetings
                setLastInteractionTime(Date.now());
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(checkIdleTimeout);
    }, [lastInteractionTime, loading, message, showGreeting]);
    */

    const sendMessage = (text = null, voiceSttTime = null) => {
        const messageText = text || input.current.value;
        if (!loading && !message && messageText.trim()) {
            chat(messageText.trim(), userLanguage, voiceSttTime);
            // Reset idle timer
            setLastInteractionTime(Date.now());
            // Don't clear the input immediately - let it stay while AI is thinking
            // It will be cleared after the AI responds
        }
    };

    const handleVoiceTranscript = (transcript) => {
        if (transcript.trim()) {
            if (input.current) {
                input.current.value = transcript;
                input.current.focus();
            }
        }
    };

    const handleAutoSend = (transcript, sttTime) => {
        if (transcript.trim()) {
            const sttTimeValue = parseFloat(sttTime) || 0;
            console.log('handleAutoSend called with STT time:', sttTimeValue);

            // First show the transcript in the input field
            if (input.current) {
                input.current.value = transcript;
            }
            // Then send it after a brief delay so user can see what was recognized
            setTimeout(() => {
                sendMessage(transcript, sttTimeValue);
            }, 500); // 500ms delay to show the text
        }
    };

    const handleVoiceToggle = (isActive) => {
        setIsVoiceActive(isActive);
        // Reset idle timer when voice is activated
        if (isActive) {
            setLastInteractionTime(Date.now());
        }
    };

    const handleStopSpeaking = () => {
        // Stop audio playback
        stopSpeaking();

        // Force stop voice recognition completely
        if (voiceRecognitionRef.current) {
            voiceRecognitionRef.current.forceStop();
        }

        // Clear input field
        if (input.current) {
            input.current.value = "";
        }

        // Set voice as inactive
        setIsVoiceActive(false);
    };

    // Automatically pause voice recognition when AI is responding and clear input when done
    useEffect(() => {
        if (voiceRecognitionRef.current) {
            if (loading || message) {
                // Pause voice recognition while AI is processing or speaking
                voiceRecognitionRef.current.pauseListening();
            } else if (!loading && !message) {
                // Clear input field after AI is done responding
                if (input.current) {
                    input.current.value = "";
                }
                // DO NOT auto-resume - user must manually click microphone button
            }
        }
    }, [loading, message]);

    if (hidden) {
        return null;
    }

    const avatarNames = {
        avatar1: 'Aigerim',
        avatar2: 'Nurzhan',
        avatar3: 'Assel',
        avatar4: 'Daniyar'
    };

    // Translations for UI elements
    const translations = {
        kk: {
            talkingWith: 'Айгеріммен сөйлесу',
            connectedTo: 'Oylan-ға қосулы',
            placeholder: 'Жазбаңызды теріңіз...',
            send: 'Жіберу',
            thinking: 'Ойланып жатыр...',
            stop: 'Тоқтату'
        },
        ru: {
            talkingWith: 'Разговор с Айгерим',
            connectedTo: 'Подключено к Oylan',
            placeholder: 'Введите сообщение...',
            send: 'Отправить',
            thinking: 'Думаю...',
            stop: 'Остановить'
        },
        en: {
            talkingWith: 'Talking with Aigerim',
            connectedTo: 'Connected to Oylan',
            placeholder: 'Type your message...',
            send: 'Send',
            thinking: 'Thinking...',
            stop: 'Stop'
        }
    };

    const t = translations[userLanguage] || translations.en;

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex flex-col bg-gray-900 text-white">
            {/* Top Bar */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <Link to="/" className="flex items-center space-x-2 hover:text-blue-400 transition-colors">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                                </svg>
                            </div>
                            <span className="font-bold">ISSAI Avatar</span>
                        </Link>
                        <div className="text-gray-300 text-sm">
                            <span>{t.talkingWith}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-gray-300">{t.connectedTo}</span>
                        </div>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                            title="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Dropdown */}
            {showSettings && (
                <div className="absolute top-16 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-4 min-w-64">
                    <h3 className="text-sm font-bold mb-3 text-white">Settings</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Voice Gender</label>
                            <button
                                onClick={() => setVoiceGender(voiceGender === 'female' ? 'male' : 'female')}
                                className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm transition-colors"
                            >
                                {voiceGender === 'female' ? '♀ Female' : '♂ Male'}
                            </button>
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">Camera View</label>
                            <button
                                onClick={() => setCameraZoomed(!cameraZoomed)}
                                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
                            >
                                {cameraZoomed ? '🔍 Zoom Out' : '🔎 Zoom In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area - 3D Avatar and Metrics Panel */}
            <div className="flex-1 flex relative overflow-hidden">
                {/* Chat History Panel - Left */}
                <ChatHistory messages={chatHistory} userLanguage={userLanguage} />

                {/* Avatar Area */}
                <div className="flex-1 relative bg-black">
                    {props.children}

                    {/* Current Message Display */}
                    {message && message.text && (
                        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-2xl w-full px-4">
                            <div className="bg-black/70 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/50 shadow-2xl">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                            <span className="text-xl">🤖</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-semibold text-blue-300 text-sm">
                                                {avatarNames[selectedAvatar]}
                                            </div>
                                            <button
                                                onClick={handleStopSpeaking}
                                                className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                                                title={t.stop}
                                            >
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-white text-base leading-relaxed">
                                            {message.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Performance Metrics Panel */}
                <div className="w-80 bg-gray-900 border-l border-gray-700 p-4 overflow-y-auto">
                    <PerformanceMetrics />
                </div>
            </div>

            {/* Bottom Input Bar */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-t border-gray-700 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center space-x-4">
                        {/* Voice Recognition */}
                        <VoiceRecognition
                            ref={voiceRecognitionRef}
                            onTranscript={handleVoiceTranscript}
                            onAutoSend={handleAutoSend}
                            onToggle={handleVoiceToggle}
                            language={userLanguage}
                        />

                        {/* Text Input */}
                        <div className="relative flex-1">
                            <input
                                className={`w-full bg-gray-700 text-white placeholder-gray-400 px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 transition-all text-lg ${
                                    isVoiceActive
                                        ? 'focus:ring-red-500 border-2 border-red-500/50'
                                        : 'focus:ring-blue-500'
                                }`}
                                placeholder={isVoiceActive ? `🎤 ${t.placeholder}` : t.placeholder}
                                ref={input}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        sendMessage();
                                    }
                                }}
                            />
                            {isVoiceActive && (
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse"></div>
                                        <div className="w-1 h-6 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Send Button */}
                        <button
                            disabled={loading || message}
                            onClick={() => sendMessage()}
                            className={`px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 ${
                                loading || message ? "cursor-not-allowed opacity-50" : ""
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>{t.thinking}</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <span>{t.send}</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Info Text */}
                    <div className="mt-3 text-center text-xs text-gray-400">
                        Powered by Oylan LLM • Voice: {voiceGender === 'female' ? 'Female' : 'Male'} • Language: {userLanguage.toUpperCase()}
                    </div>
                </div>
            </div>
        </div>
    );
};
