import { useEffect, useRef } from 'react';

export const ChatHistory = ({ messages, userLanguage }) => {
    const messagesEndRef = useRef(null);

    const translations = {
        kk: {
            title: 'Әңгіме тарихы',
            you: 'Сіз',
            assistant: 'Айгерім',
            empty: 'Әлі ешқандай хабар жоқ. Сөйлесуді бастаңыз!'
        },
        ru: {
            title: 'История разговора',
            you: 'Вы',
            assistant: 'Айгерим',
            empty: 'Пока нет сообщений. Начните разговор!'
        },
        en: {
            title: 'Conversation History',
            you: 'You',
            assistant: 'Aigerim',
            empty: 'No messages yet. Start a conversation!'
        }
    };

    const t = translations[userLanguage] || translations.en;

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="w-96 h-full bg-gray-900/95 backdrop-blur-lg border-r border-gray-700 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 p-3 flex-shrink-0">
                <h2 className="text-sm font-bold text-white flex items-center">
                    <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t.title}
                </h2>
            </div>

            {/* Messages Container - with fixed height and scroll */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-6xl mb-4 opacity-20">💬</div>
                        <p className="text-gray-400 text-sm">
                            {t.empty}
                        </p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div
                                key={`${msg.timestamp}-${index}`}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[90%] ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600'
                                        : 'bg-gray-800'
                                } rounded-2xl px-4 py-2.5 shadow-lg`}>
                                    <p className="text-white text-sm leading-relaxed">
                                        {msg.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>
        </div>
    );
};
