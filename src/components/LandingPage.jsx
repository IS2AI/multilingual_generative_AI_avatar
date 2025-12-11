import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage = () => {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('kk');
    const [selectedAvatar, setSelectedAvatar] = useState('/models/64f1a714fe61576b46f27ca2.glb');
    const [selectedVoice, setSelectedVoice] = useState('female');
    const [selectedEnvironment, setSelectedEnvironment] = useState('classroom');

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const avatars = [
        {
            id: '/models/64f1a714fe61576b46f27ca2.glb',
            name: 'Aigerim',
            image: '👩‍🏫',
            description: 'Professional Teacher'
        }
    ];

    const languages = [
        { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'en', name: 'English', flag: '🇬🇧' }
    ];

    const environments = [
        { id: 'classroom', name: 'Classroom', icon: '🏫' },
        { id: 'classroom-lowpoly', name: 'Low Poly Class', icon: '📚' },
        { id: 'office', name: 'Modern Office (Simple)', icon: '🏢' },
        { id: 'office-glb', name: 'Modern Office (GLB)', icon: '🗂️' },
        { id: 'minimalistic_modern_office', name: 'Minimalistic Modern Office', icon: '🖥️' },
        { id: 'small_office', name: 'Small Office', icon: '🧾' },
        { id: 'forest', name: 'Forest', icon: '🌲' },
        { id: 'sunset-hdri', name: 'Soft Studio', icon: '🎛️' }
    ];

    const handleStartLearning = () => {
        // Save selections to localStorage or pass via navigation state
        const selections = {
            language: selectedLanguage,
            avatar: selectedAvatar,
            voiceGender: selectedVoice,
            environment: selectedEnvironment
        };
        navigate('/classroom', { state: selections });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
            {/* Background Animation */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 p-6">
                <nav className="flex justify-between items-center max-w-7xl mx-auto">
                    <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            ISSAI Avatar
                        </span>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-5xl mx-auto px-6 pt-12 pb-16">
                <div className={`transform transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

                    {/* Title Section */}
                    <div className="text-center mb-12">
                        <div className="mb-6">
                            <span className="inline-block px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 text-sm font-medium">
                                🤖 AI Avatar Demo
                            </span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                LLM Avatar Demo
                            </span>
                        </h1>

                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 max-w-3xl mx-auto">
                            <p className="text-lg text-gray-200 leading-relaxed">
                                This is a demonstration of an AI-powered avatar connected to the <span className="font-semibold text-blue-300">Oylan API</span>,
                                developed by <span className="font-semibold text-purple-300">ISSAI</span> at Nazarbayev University.
                                Interact with intelligent avatars in multiple languages using advanced language models.
                            </p>
                        </div>
                    </div>

                    {/* Configuration Section */}
                    <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 max-w-4xl mx-auto">

                        {/* Language Selection */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 flex items-center">
                                <span className="mr-2">🌍</span> Choose Your Language
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setSelectedLanguage(lang.code)}
                                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                                            selectedLanguage === lang.code
                                                ? 'border-blue-500 bg-blue-500/20 scale-105'
                                                : 'border-white/20 bg-white/5 hover:border-white/40'
                                        }`}
                                    >
                                        <div className="text-4xl mb-2">{lang.flag}</div>
                                        <div className="font-semibold">{lang.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Avatar Selection */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 flex items-center">
                                <span className="mr-2">👤</span> Select Your Avatar
                            </h2>
                            <div className="flex justify-center">
                                {avatars.map((avatar) => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.id)}
                                        className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                                            selectedAvatar === avatar.id
                                                ? 'border-purple-500 bg-purple-500/20 scale-105'
                                                : 'border-white/20 bg-white/5 hover:border-white/40'
                                        }`}
                                    >
                                        <div className="text-5xl mb-2">{avatar.image}</div>
                                        <div className="font-semibold text-sm">{avatar.name}</div>
                                        <div className="text-xs text-gray-400 mt-1">{avatar.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Environment Selection */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 flex items-center">
                                <span className="mr-2">🌍</span> Select Environment
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                {environments.map((env) => (
                                    <button
                                        key={env.id}
                                        onClick={() => setSelectedEnvironment(env.id)}
                                        className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                                            selectedEnvironment === env.id
                                                ? 'border-green-500 bg-green-500/20 scale-105'
                                                : 'border-white/20 bg-white/5 hover:border-white/40'
                                        }`}
                                    >
                                        <div className="text-4xl mb-2">{env.icon}</div>
                                        <div className="font-semibold">{env.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Voice Gender Selection */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-4 flex items-center">
                                <span className="mr-2">🎤</span> Choose Voice Type
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setSelectedVoice('female')}
                                    className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                                        selectedVoice === 'female'
                                            ? 'border-pink-500 bg-pink-500/20 scale-105'
                                            : 'border-white/20 bg-white/5 hover:border-white/40'
                                    }`}
                                >
                                    <div className="font-semibold">Female Voice</div>
                                </button>
                                <button
                                    onClick={() => setSelectedVoice('male')}
                                    className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                                        selectedVoice === 'male'
                                            ? 'border-blue-500 bg-blue-500/20 scale-105'
                                            : 'border-white/20 bg-white/5 hover:border-white/40'
                                    }`}
                                >
                                    <div className="font-semibold">Male Voice</div>
                                </button>
                            </div>
                        </div>

                        {/* Start Button */}
                        <div className="text-center">
                            <button
                                onClick={handleStartLearning}
                                className="group relative px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-bold text-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                            >
                                <span className="relative z-10">Start Conversation</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                            </button>
                            <p className="text-sm text-gray-400 mt-4">
                                Powered by Oylan LLM • ISSAI Research
                            </p>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 mt-12">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <img
                                src="/issai logo.png"
                                alt="ISSAI Logo"
                                className="h-12 w-auto mr-4"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-white">
                                    Institute of Smart Systems and Artificial Intelligence
                                </h3>
                                <p className="text-xs text-blue-300">Nazarbayev University</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm">
                            &copy; 2025 ISSAI Avatar Demo. Developed at ISSAI, Nazarbayev University.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
