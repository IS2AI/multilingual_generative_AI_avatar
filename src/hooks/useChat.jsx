import { createContext, useContext, useEffect, useState } from "react";

// LLM API configuration
const LLM_API_URL = "/api/v1/chat/completions";
const LLM_MODEL_NAME = "issai/Qolda"; // llama.cpp model name

// System prompt for natural, concise responses
const SYSTEM_PROMPT = `You are an expert multilingual assistant.
Supported languages: English, Russian, Kazakh.
Always respond in the user's language.
Always answer in one complete grammatical sentence.
Be concise.
Answer only what is asked.
No explanations, introductions, filler, or meta text.`;

// TTS Backend configuration
const TTS_API_URL = "/tts-api/tts/v1/audio/speech";
const TTS_MODEL_NAME = "matcha-tts-v1";

// Language mapping for TTS
const ttsLanguageMap = {
  'kk': 'kk',  // Kazakh
  'ru': 'ru',  // Russian
  'en': 'en'   // English
};

const ChatContext = createContext();

// Language detection function
const detectLanguage = (text, userLanguage = 'en') => {
  // Check for Cyrillic characters (Kazakh/Russian)
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);

  // Check if text is mostly numbers/symbols (language-neutral)
  const letterCount = (text.match(/[A-Za-zА-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/g) || []).length;
  const isLanguageNeutral = letterCount <= 3;

  // If language-neutral (mostly numbers/symbols), return user's language
  if (isLanguageNeutral) {
    return userLanguage;
  }

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
      // Call Local LLM API using OpenAI-compatible format
      console.log('Calling Local LLM API...');
      console.log('URL:', LLM_API_URL);

      const llmStartTime = performance.now();

      const requestBody = {
        model: LLM_MODEL_NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 512,
        temperature: 0.7,
        stream: false  // Use non-streaming for simpler handling
      };

      console.log('Sending to LLM with full response (no token limit), enable_thinking: false, and system prompt for language:', userLanguage);

      const response = await fetch(LLM_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const llmEndTime = performance.now();
      metrics.oylanTime = ((llmEndTime - llmStartTime) / 1000).toFixed(2);

      console.log('LLM API response status:', response.status);
      console.log('LLM API time:', metrics.oylanTime, 's');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LLM API error response:', errorText);
        throw new Error(`LLM API error! status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      console.log('LLM API response:', data);

      // Extract text from OpenAI-compatible response format
      let responseText = data.choices?.[0]?.message?.content || "No response";

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
        responseText = parts[parts.length - 1]; // Get everything after last </think>
        console.log('Content after </think>:', responseText);
      } else if (responseText.includes('<think>')) {
        // If only opening tag exists (response cut off), remove everything from <think> onward
        console.log('⚠️ Found only <think> tag - removing thinking section');
        responseText = responseText.split('<think>')[0];
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

      // Remove thinking indicators
      responseText = responseText.replace(/^(Thinking:|Analysis:|Plan:|Step \d+:).*$/gim, '');

      // Remove AI artifacts at the start
      responseText = responseText.replace(/^(continuation|answer|response|reply|result)\.?\s*/i, '');
      responseText = responseText.replace(/^(Continuation|Answer|Response|Reply|Result):\s*/gim, '');

      // 5.5. Remove language markers at the start (e.g., "қазақша", "english", "русский")
      responseText = responseText.replace(/^(қазақша|english|русский|kazakh|russian)\s*\n*/gi, '');

      // 6. Clean up multiple newlines and extra spaces
      responseText = responseText.replace(/\n\s*\n\s*\n+/g, '\n\n');
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
      // BUT allow language-neutral responses (numbers, short answers with no/few letters)
      if (userLanguage === 'kk' || userLanguage === 'ru') {
        const cyrillicSentences = sentences.filter(s => {
          const cyrillicLetters = (s.match(/[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/g) || []).length;
          const latinLetters = (s.match(/[A-Za-z]/g) || []).length;
          const totalLetters = cyrillicLetters + latinLetters;

          console.log(`  - Sentence: "${s.substring(0, 50)}..." | Cyrillic: ${cyrillicLetters}, Latin: ${latinLetters}`);

          // Accept if:
          // 1. More Cyrillic than Latin (normal case)
          // 2. Very few letters total (likely numbers or short language-neutral answers like "20", "100%")
          if (totalLetters <= 3) {
            console.log(`    ✅ Accepted: Language-neutral (few letters: ${totalLetters})`);
            return true;
          }

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

      // Detect language of response (pass userLanguage for language-neutral responses)
      let detectedLang = detectLanguage(responseText, userLanguage) || userLanguage;
      console.log('Detected language:', detectedLang);
      console.log('Expected language:', userLanguage);

      // Check if response is empty or still thinking content
      const thinkingIndicators = /\b(then|first|next|after|but wait|maybe|should i|perhaps|also|finally|wait|oh)\b.*\b(the|a|an|to|for|with|from)\b/i;
      const isStillThinking = detectedLang === 'en' && userLanguage !== 'en' && thinkingIndicators.test(responseText);

      // If response is empty, wrong language, or still thinking content, provide fallback
      // Note: Removed length checks to allow short but valid answers
      // Allow kk/ru mismatch since many Kazakh words use same Cyrillic as Russian
      const isCyrillicMismatch = (detectedLang === 'kk' && userLanguage === 'ru') || (detectedLang === 'ru' && userLanguage === 'kk');
      const languageMismatch = detectedLang !== userLanguage && userLanguage !== 'en' && !isCyrillicMismatch;

      if (!responseText || isStillThinking || languageMismatch) {
        if (isStillThinking) {
          console.warn('⚠️ Response is still thinking content in English! Using fallback.');
        } else if (languageMismatch) {
          console.warn('⚠️ Language mismatch, using friendly or math fallback');
        } else {
          console.warn('⚠️ Response empty after cleaning thinking section! Using fallback.');
          console.warn('This happens when LLM only outputs thinking without real answer.');
        }

        responseText = userLanguage === 'kk' ? 'Мен сіздің көмекшіңізбін. Сізге қалай көмектесе аламын?' :
                       userLanguage === 'ru' ? 'Я ваш помощник. Чем могу помочь?' :
                       'I am your assistant. How can I help you?';
      }

      // Truncate response to ~100 tokens (approximately 50 words for concise responses)
      // This ensures brief, natural responses suitable for voice interaction
      const maxWords = 50; // Reduced to match max_tokens: 100 for very concise responses
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

      // Call Local TTS API to generate audio
      console.log('Calling Local TTS API...');
      const ttsStartTime = performance.now();
      const ttsLang = ttsLanguageMap[detectedLang] || 'en';
      console.log('TTS language:', ttsLang);
      console.log('Voice gender:', voiceGender);
      console.log('Text to convert:', responseText.substring(0, 100));

      const ttsResponse = await fetch(TTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: TTS_MODEL_NAME,
          input: responseText,
          voice: voiceGender,  // "male" or "female"
          lang: ttsLang,       // "kk", "ru", or "en"
          format: "wav"
        })
      });

      const ttsEndTime = performance.now();
      metrics.mangiSozTime = ((ttsEndTime - ttsStartTime) / 1000).toFixed(2);

      console.log('TTS API response status:', ttsResponse.status);
      console.log('TTS API time:', metrics.mangiSozTime, 's');

      // Log detailed TTS metrics from ONNX backend
      const ttsMetrics = {
        textProcessing: ttsResponse.headers.get('X-TTS-Text-Processing-Time'),
        onnxInference: ttsResponse.headers.get('X-TTS-ONNX-Inference-Time'),
        ioTime: ttsResponse.headers.get('X-TTS-IO-Time'),
        totalTime: ttsResponse.headers.get('X-TTS-Total-Time'),
        audioDuration: ttsResponse.headers.get('X-TTS-Audio-Duration'),
        rtf: ttsResponse.headers.get('X-TTS-RTF')
      };

      if (ttsMetrics.rtf) {
        console.log('TTS ONNX Metrics:', {
          'Text Processing': `${parseFloat(ttsMetrics.textProcessing).toFixed(4)}s`,
          'ONNX Inference': `${parseFloat(ttsMetrics.onnxInference).toFixed(4)}s`,
          'I/O': `${parseFloat(ttsMetrics.ioTime).toFixed(4)}s`,
          'Total': `${parseFloat(ttsMetrics.totalTime).toFixed(4)}s`,
          'Audio Duration': `${parseFloat(ttsMetrics.audioDuration).toFixed(2)}s`,
          'RTF': parseFloat(ttsMetrics.rtf).toFixed(3)
        });
      }

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error('TTS API error response:', errorText);
        console.error('TTS request body was:', {
          model: TTS_MODEL_NAME,
          input: responseText,
          voice: voiceGender,
          lang: ttsLang,
          format: "wav"
        });

        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }

        throw new Error(`TTS API error! status: ${ttsResponse.status}, details: ${JSON.stringify(errorDetails)}`);
      }

      // TTS API returns audio blob directly, create blob URL for playback
      const audioBlob = await ttsResponse.blob();
      console.log('TTS audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Create blob URL for audio playback
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio blob URL created:', audioUrl);

      // Calculate estimated speech duration based on audio
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

      // Calculate total time (including STT time from voice recognition)
      const endTime = performance.now();
      const chatProcessingTime = (endTime - startTime) / 1000; // LLM + TTS time
      metrics.totalTime = (chatProcessingTime + parseFloat(metrics.sttTime)).toFixed(2);

      console.log('=== PERFORMANCE METRICS ===');
      console.log('Total Time:', metrics.totalTime, 's');
      console.log('STT Time:', metrics.sttTime, 's');
      console.log('LLM Time:', metrics.oylanTime, 's');
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
      // Call Local TTS API for the greeting
      const ttsLang = ttsLanguageMap[greetingLanguage] || 'en';

      const ttsResponse = await fetch(TTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: TTS_MODEL_NAME,
          input: greetingText,
          voice: voiceGender,
          lang: ttsLang,
          format: "wav"
        })
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
