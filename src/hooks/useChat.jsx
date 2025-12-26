import { createContext, useContext, useEffect, useState } from "react";

// Oylan API configuration
const OYLAN_ASSISTANT_ID = "793"; // Your assistant ID
const OYLAN_API_URL = `/api/v1/assistant/${OYLAN_ASSISTANT_ID}/interactions/`;
const OYLAN_API_KEY = "4zQPa23y.SXlAsiDq6CVPk0rDBM2ZXLsH3ClG04rf";

// MangiSoz TTS API configuration (NEW API)
const MANGISOZ_TTS_API_URL = "https://mangisoz.nu.edu.kz/backend/api/v1/tts/audio";
const MANGISOZ_TTS_API_KEY = "ak_EaHGSZ_6oCV2DzAVET455FuHHIDSDpKvaCrmwm6REAw";

// MangiSoz STT API configuration (NEW API)
const MANGISOZ_STT_API_KEY = "ak_vQ8znAxC0AITAbrlCWWqDEzciePmMDYKt2J0Ut4pdNk";

const ChatContext = createContext();

// Language detection function
const detectLanguage = (text) => {
  // Check for Cyrillic characters (Kazakh/Russian)
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);

  if (!hasCyrillic) return 'en';

  // Kazakh-specific characters: ә, ғ, қ, ң, ө, ұ, ү, һ, і
  const hasKazakh = /[әғқңөұүһі]/i.test(text);

  return hasKazakh ? 'kk' : 'ru';
};

// Generate simple lipsync data based on text length
const generateLipsync = (text, duration) => {
  const words = text.split(/\s+/);
  const visemes = ['A', 'B', 'C', 'D', 'E', 'F'];
  const mouthCues = [];

  const timePerWord = duration / words.length;

  words.forEach((word, index) => {
    const start = index * timePerWord;
    const end = start + timePerWord;
    const viseme = visemes[index % visemes.length];

    mouthCues.push({
      start: parseFloat(start.toFixed(2)),
      end: parseFloat(end.toFixed(2)),
      value: viseme
    });
  });

  return { mouthCues };
};

export const ChatProvider = ({ children }) => {
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('kk'); // Default to Kazakh
  const [voiceGender, setVoiceGender] = useState('female'); // 'male' or 'female'
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [sttTime, setSttTime] = useState(0); // Store STT time
  const [chatHistory, setChatHistory] = useState([]); // Store conversation history

  const chat = async (message, userLanguage = language, voiceSttTime = null) => {
    setLoading(true);
    setError(null);
    console.log('Chat called with message:', message, 'language:', userLanguage);
    console.log('Voice STT time passed:', voiceSttTime);
    console.log('Current STT time state:', sttTime);

    // Add user message to chat history
    const userMessage = {
      role: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    const startTime = performance.now();
    const currentSttTime = voiceSttTime !== null ? voiceSttTime : sttTime; // Use passed STT time or fallback to state

    const metrics = {
      totalTime: 0,
      oylanTime: 0,
      mangiSozTime: 0,
      sttTime: parseFloat(currentSttTime) || 0, // Include STT time from voice recognition
      audioDuration: 0
    };

    console.log('Metrics initialized with STT time:', metrics.sttTime);

    try {
      // Call Oylan API using FormData (multipart/form-data)
      console.log('Calling Oylan API...');
      console.log('URL:', OYLAN_API_URL);

      const oylanStartTime = performance.now();
      const formData = new FormData();

      // Prepend instructions directly to user message since model ignores context parameter
      const instructions = userLanguage === 'kk'
        ? 'Маңызды нұсқау: <think> тегтерінде ағылшын тілінде ойлана аласыз, бірақ жауапты МІНДЕТТІ ТҮРДЕ қазақ тілінде, <think> тегтерінен ТЫС жазыңыз. Жауап қысқа болсын (2-3 сөйлем).\n\nСұрақ: '
        : userLanguage === 'ru'
        ? 'Важная инструкция: можете размышлять на английском в тегах <think>, но ответ ОБЯЗАТЕЛЬНО пишите на русском языке ВНЕ тегов <think>. Ответ должен быть кратким (2-3 предложения).\n\nВопрос: '
        : 'Important instruction: you can think in <think> tags, but write your answer in English OUTSIDE <think> tags. Keep answer brief (2-3 sentences).\n\nQuestion: ';

      formData.append('content', instructions + message);

      // Remove token limits - let model think and respond fully
      formData.append('max_tokens', '2048');
      formData.append('max_length', '2048');
      formData.append('max_response_length', '2048');

      console.log('Sending to Oylan with token limit: 2048 (unlimited), instructions in message');

      const response = await fetch(OYLAN_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Api-Key ${OYLAN_API_KEY}`
        },
        body: formData
      });

      const oylanEndTime = performance.now();
      metrics.oylanTime = ((oylanEndTime - oylanStartTime) / 1000).toFixed(2);

      console.log('Oylan API response status:', response.status);
      console.log('Oylan API time:', metrics.oylanTime, 's');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Oylan API error response:', errorText);
        throw new Error(`Oylan API error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      console.log('Oylan API response:', data);

      // Extract text from response
      let responseText = data.response?.content || "No response";
      const rawResponseText = responseText;

      console.log('Raw response text:', responseText);
      console.log('Raw response length:', responseText.length);

      // IMPROVED CLEANING: Extract only user-facing content (outside <think> tags)
      console.log('🧹 Starting to clean thinking tags...');

      // 1. Remove all complete <think>...</think> blocks (with their content)
      const beforeRemoval = responseText;
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');
      if (beforeRemoval !== responseText) {
        console.log('✂️ Removed complete <think>...</think> blocks');
      }

      // 2. Handle orphaned closing </think> tag - remove everything BEFORE it
      if (responseText.includes('</think>')) {
        console.log('⚠️ Found orphaned </think> tag - keeping only content after it');
        const parts = responseText.split('</think>');
        responseText = parts[parts.length - 1]; // Keep only what's after the last </think>
      }

      // 3. Handle orphaned opening <think> tag - remove everything FROM it onwards
      if (responseText.includes('<think>')) {
        console.log('⚠️ Found orphaned <think> tag - removing everything after it');
        responseText = responseText.split('<think>')[0]; // Keep only what's BEFORE <think>
      }

      // 4. Remove any remaining stray tags
      responseText = responseText.replace(/<\/?think[^>]*>/gi, '');
      responseText = responseText.replace(/\[?\/?думаю\]?/gi, '');

      // 3. Remove common thinking patterns (English) - more aggressive
      // Remove entire thinking paragraphs that start with thinking indicators
      responseText = responseText.replace(/^(Okay|Alright|Let me|I need to|First|So|Well|The user wrote|It translates to|I should),?\s+[\s\S]*?(\n\n[А-ЯӘҒҚҢӨҰҮҺІа-яәғқңөұүһі]|\n\n[A-Z][a-z]|$)/gi, '$2');
      responseText = responseText.replace(/^.*?(Let me think|I should|I need to|The user|It translates).*?\n/gim, '');
      // Remove paragraphs explaining what the user said
      responseText = responseText.replace(/^.*?which is in (Kazakh|Russian|English).*?\n/gim, '');

      // 4. Remove lines that start with thinking indicators
      responseText = responseText.replace(/^(Thinking:|Analysis:|Plan:|Step \d+:).*$/gim, '');

      // 5. Remove common AI artifacts at the start
      responseText = responseText.replace(/^(continuation|answer|response|reply|result)\.?\s*/i, '');
      responseText = responseText.replace(/^(Continuation|Answer|Response|Reply|Result):\s*/gim, '');

      // 5.5. Remove language markers at the start (e.g., "қазақша", "english", "русский")
      responseText = responseText.replace(/^(қазақша|english|русский|kazakh|russian)\s*\n*/gi, '');

      // 6. Clean up multiple newlines and extra spaces
      responseText = responseText.replace(/\n\s*\n\s*\n+/g, '\n\n');
      responseText = responseText.replace(/^\s+|\s+$/g, ''); // trim
      responseText = responseText.trim();

      // 7. Remove incomplete final sentence if no sentence-ending punctuation at end
      // If we already have Cyrillic content, avoid over-trimming; otherwise trim incomplete short endings
      const hasCyrillic = /[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/.test(responseText);
      if (!hasCyrillic && !responseText.match(/[.!?]$/) && responseText.length <= 200) {
        console.log('⚠️ Response has incomplete final sentence, removing it (short text, non-Cyrillic)');
        // Find last sentence-ending punctuation
        const lastPeriod = responseText.lastIndexOf('.');
        const lastExclamation = responseText.lastIndexOf('!');
        const lastQuestion = responseText.lastIndexOf('?');
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

        if (lastSentenceEnd > 0) {
          // Cut off everything after the last complete sentence
          responseText = responseText.substring(0, lastSentenceEnd + 1).trim();
          console.log('✂️ Removed incomplete sentence, ending at position', lastSentenceEnd);
        }
      }

      // Prefer only the user-facing sentences in target script (avoid English reasoning leakage)
      const sentences = responseText.split(/(?<=[.!?])\s+/).filter(Boolean);
      console.log('📝 Total sentences found:', sentences.length);
      console.log('📝 Sentences:', sentences);

      // For Kazakh/Russian, filter for sentences that are PRIMARILY Cyrillic (>50% of letters are Cyrillic)
      if (userLanguage === 'kk' || userLanguage === 'ru') {
        const cyrillicSentences = sentences.filter(s => {
          const cyrillicLetters = (s.match(/[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/g) || []).length;
          const latinLetters = (s.match(/[A-Za-z]/g) || []).length;
          console.log(`  - Sentence: "${s.substring(0, 50)}..." | Cyrillic: ${cyrillicLetters}, Latin: ${latinLetters}`);
          return cyrillicLetters > latinLetters; // More Cyrillic than Latin
        });

        console.log('✅ Cyrillic sentences after filter:', cyrillicSentences.length);

        if (cyrillicSentences.length > 0) {
          responseText = cyrillicSentences.join(' ').trim();
          console.log('✂️ Using Cyrillic sentences only to avoid English reasoning');

          // Check if response contains Chinese characters - model sometimes responds in Chinese
          const hasChinese = /[\u4e00-\u9fa5]/.test(responseText);
          if (hasChinese) {
            console.warn('⚠️ Model responded in Chinese instead of Kazakh/Russian! Using fallback.');
            responseText = userLanguage === 'kk'
              ? 'Кешіріңіз, мен сұрағыңызды түсінбедім. Басқаша қойып көріңіз.'
              : userLanguage === 'ru'
              ? 'Извините, я не понял ваш вопрос. Попробуйте переформулировать.'
              : 'Sorry, I did not understand your question. Please try rephrasing.';
          }
        } else {
          // No valid Cyrillic sentences found - use greeting fallback
          console.warn('⚠️ No valid Cyrillic sentences found, using greeting fallback');
          console.warn('⚠️ This means model generated only English thinking or empty response');
          responseText = userLanguage === 'kk'
            ? 'Кешіріңіз, мен сұрағыңызды түсінбедім. Басқаша қойып көріңіз.'
            : userLanguage === 'ru'
            ? 'Извините, я не понял ваш вопрос. Попробуйте переформулировать.'
            : 'Sorry, I did not understand your question. Please try rephrasing.';
        }
      }

      console.log('Cleaned response text:', responseText);
      console.log('Cleaned response length:', responseText.length);

      // Detect language of response
      let detectedLang = detectLanguage(responseText) || userLanguage;
      console.log('Detected language:', detectedLang);
      console.log('Expected language:', userLanguage);

      // Check if response is still thinking content (contains English thinking phrases)
      const thinkingIndicators = /\b(then|first|next|after|but wait|maybe|should i|perhaps|also|finally|wait|oh)\b.*\b(the|a|an|to|for|with|from)\b/i;
      const isStillThinking = detectedLang === 'en' && userLanguage !== 'en' && thinkingIndicators.test(responseText);

      // If response is empty, too short, wrong language, or still thinking content, provide fallback
      const hasOrphanThink = rawResponseText.includes('<think>') && !rawResponseText.includes('</think>');
      const looksTruncated = responseText.trim().startsWith('*') || responseText.trim().length < 15;
      const languageMismatch = detectedLang !== userLanguage && userLanguage !== 'en';

      if (!responseText || responseText.length < 5 || isStillThinking || looksTruncated || languageMismatch) {
        if (isStillThinking) {
          console.warn('⚠️ Response is still thinking content in English! Using fallback.');
        } else if (looksTruncated) {
          console.warn('⚠️ Response too short or truncated after cleaning, using fallback');
        } else if (languageMismatch) {
          console.warn('⚠️ Language mismatch, using friendly or math fallback');
        } else {
          console.warn('Response too short after cleaning, using fallback');
        }

        const friendlyFallback = userLanguage === 'kk'
          ? 'Сәлем! Сізге қалай көмектесе аламын?'
          : userLanguage === 'ru'
          ? 'Привет! Чем могу помочь?'
          : 'Hi! How can I help you?';
        const errorFallback = userLanguage === 'kk'
          ? 'Кешіріңіз, жауап беру мүмкін болмады. Сұрағыңызды қайталап көріңіз.'
          : userLanguage === 'ru'
          ? 'Извините, не смог ответить. Попробуйте переформулировать вопрос.'
          : 'Sorry, could not respond. Please try rephrasing your question.';

        // Simple numeric root detector to salvage math answers when language mismatches
        const mentionsRoot = /(түбір|root|sqrt)/i.test(message || '');
        const numMatch = (message || '').match(/-?\d+(\.\d+)?/);
        let mathFallback = null;
        if ((languageMismatch || isStillThinking) && mentionsRoot && numMatch) {
          const num = parseFloat(numMatch[0]);
          const root = Math.sqrt(Math.abs(num));
          mathFallback = userLanguage === 'kk'
            ? `${num} санының түбірі ${root}.`
            : userLanguage === 'ru'
            ? `Квадратный корень из ${num} равен ${root}.`
            : `The square root of ${num} is ${root}.`;
        }

        responseText = mathFallback || (hasOrphanThink ? friendlyFallback : errorFallback);
        // Align TTS language with synthesized text
        detectedLang = userLanguage;
      }

      // Truncate response to ~300 tokens (approximately 150 words for safety)
      // This ensures the response is not too long for TTS and user reading
      const maxWords = 150; // Reduced from 200 to ensure shorter responses
      const words = responseText.split(/\s+/).filter(word => word.length > 0); // Remove empty strings

      console.log(`=== WORD COUNT CHECK ===`);
      console.log(`Total words before truncation: ${words.length}`);
      console.log(`Max words allowed: ${maxWords}`);

      if (words.length > maxWords) {
        console.log(`⚠️ Response too long! Truncating from ${words.length} to ${maxWords} words`);

        // Take first maxWords words
        const truncatedWords = words.slice(0, maxWords);
        let truncatedText = truncatedWords.join(' ');

        // Find last sentence-ending punctuation (. ! ?)
        const lastPeriod = truncatedText.lastIndexOf('.');
        const lastExclamation = truncatedText.lastIndexOf('!');
        const lastQuestion = truncatedText.lastIndexOf('?');
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

        // If found a sentence end, cut there to keep complete sentences
        if (lastSentenceEnd > 0 && lastSentenceEnd > truncatedText.length * 0.5) {
          // Only cut at sentence if it's past 50% of truncated text (avoid cutting too early)
          responseText = truncatedText.substring(0, lastSentenceEnd + 1);
          console.log(`✂️ Truncated at sentence boundary (position ${lastSentenceEnd})`);
        } else {
          // No good sentence break found, keep all maxWords and add ellipsis
          responseText = truncatedText;
          if (!responseText.match(/[.!?]$/)) {
            responseText += '...';
          }
          console.log(`✂️ No sentence boundary found, added ellipsis`);
        }

        console.log(`✂️ Truncated response:`, responseText.substring(0, 100) + '...');
      } else {
        console.log(`✅ Response length OK (${words.length} words)`);
      }

      console.log(`Final response word count: ${responseText.split(/\s+/).filter(w => w.length > 0).length}`);

      // Call MangiSoz TTS API (NEW API format)
      console.log('=== MANGISOZ TTS API CALL ===');
      const ttsStartTime = performance.now();

      console.log('TTS URL:', MANGISOZ_TTS_API_URL);
      console.log('TTS Language:', detectedLang);
      console.log('TTS Voice Gender:', voiceGender);
      console.log('TTS Text (first 100 chars):', responseText.substring(0, 100));

      // Prepare form data (application/x-www-form-urlencoded)
      const ttsParams = new URLSearchParams();
      ttsParams.append('text', responseText);
      ttsParams.append('lang', detectedLang); // 'kk', 'ru', or 'en'
      ttsParams.append('speaker', voiceGender); // 'female' or 'male'

      const ttsResponse = await fetch(MANGISOZ_TTS_API_URL, {
        method: "POST",
        headers: {
          "X-API-Key": MANGISOZ_TTS_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: ttsParams.toString()
      });

      const ttsEndTime = performance.now();
      metrics.mangiSozTime = ((ttsEndTime - ttsStartTime) / 1000).toFixed(2);

      console.log('TTS Response Status:', ttsResponse.status);
      console.log('TTS Response Headers:', Object.fromEntries(ttsResponse.headers.entries()));
      console.log('TTS Time:', metrics.mangiSozTime, 's');

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error('❌ MangiSoz TTS API error:', errorText);
        throw new Error(`MangiSoz TTS failed: ${ttsResponse.status} - ${errorText}`);
      }

      // Response is audio binary data
      const audioBlob = await ttsResponse.blob();
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      console.log('Audio blob type:', audioBlob.type);

      // Create blob URL for direct playback (more efficient than base64)
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio blob URL:', audioUrl);

      // Calculate estimated speech duration
      const wordCount = responseText.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60; // ~150 words per minute
      metrics.audioDuration = estimatedDuration.toFixed(2);

      console.log('Estimated audio duration:', metrics.audioDuration, 's');

      // Generate lipsync data
      const lipsync = generateLipsync(responseText, estimatedDuration);

      // Add AI response to chat history
      const aiMessage = {
        role: 'assistant',
        text: responseText,
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, aiMessage]);

      // Calculate total time
      const endTime = performance.now();
      metrics.totalTime = ((endTime - startTime) / 1000).toFixed(2);

      console.log('=== PERFORMANCE METRICS ===');
      console.log('Total Time:', metrics.totalTime, 's');
      console.log('STT Time:', metrics.sttTime, 's');
      console.log('Oylan LLM Time:', metrics.oylanTime, 's');
      console.log('MangiSoz TTS Time:', metrics.mangiSozTime, 's');
      console.log('Audio Duration:', metrics.audioDuration, 's');

      setPerformanceMetrics(metrics);

      // Create message with audio
      const messageWithAudio = {
        text: responseText,
        audioUrl: audioUrl, // Use blob URL instead of base64
        useTTS: true,
        animation: "Talking_1",
        facialExpression: "smile",
        lipsync: lipsync
      };

      console.log('Setting message with audio');
      setMessages((messages) => [...messages, messageWithAudio]);
      setLoading(false);

    } catch (err) {
      console.error('Chat error:', err);
      console.error('Error type:', err.name);
      console.error('Error stack:', err.stack);
      setError(err.message);

      // Fallback response
      const fallbackResponse = {
        text: userLanguage === 'kk'
          ? `Кешіріңіз, қате орын алды: ${err.message}`
          : userLanguage === 'ru'
          ? `Извините, произошла ошибка: ${err.message}`
          : `Sorry, an error occurred: ${err.message}`,
        audio: null,
        useTTS: false,
        animation: "Idle",
        facialExpression: "sad",
        lipsync: null
      };

      console.log('Setting fallback response:', fallbackResponse);
      setMessages((messages) => [...messages, fallbackResponse]);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  const stopSpeaking = () => {
    // Clear all messages to stop avatar from speaking
    setMessages([]);
  };

  const showGreeting = async (greetingText, greetingLanguage = language) => {
    // Don't show greeting if already loading or speaking
    if (loading || message) {
      console.log('Already busy, skipping greeting');
      return;
    }

    console.log('Showing greeting:', greetingText, 'in language:', greetingLanguage);

    try {
      // Call MangiSoz TTS for the greeting (NEW API format)
      const ttsParams = new URLSearchParams();
      ttsParams.append('text', greetingText);
      ttsParams.append('lang', greetingLanguage); // 'kk', 'ru', or 'en' directly
      ttsParams.append('speaker', voiceGender);

      const ttsResponse = await fetch(MANGISOZ_TTS_API_URL, {
        method: "POST",
        headers: {
          "X-API-Key": MANGISOZ_TTS_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: ttsParams.toString()
      });

      if (!ttsResponse.ok) {
        throw new Error('TTS failed for greeting');
      }

      // Create blob URL for direct playback
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Estimate duration
      const wordCount = greetingText.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60;

      // Generate lipsync
      const lipsync = generateLipsync(greetingText, estimatedDuration);

      // Show greeting message
      const greetingMessage = {
        text: greetingText,
        audioUrl: audioUrl, // Use blob URL instead of base64
        lipsync: lipsync,
        animation: "Talking_1",
        facialExpression: "smile",
        estimatedDuration: estimatedDuration
      };

      console.log('Showing greeting message');
      setMessages((messages) => [...messages, greetingMessage]);

    } catch (err) {
      console.error('Failed to show greeting:', err);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        stopSpeaking,
        showGreeting,
        loading,
        cameraZoomed,
        setCameraZoomed,
        language,
        setLanguage,
        voiceGender,
        setVoiceGender,
        performanceMetrics,
        setSttTime,
        chatHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
