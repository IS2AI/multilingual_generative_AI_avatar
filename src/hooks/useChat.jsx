import { createContext, useContext, useEffect, useState } from "react";

// Oylan API configuration
const OYLAN_ASSISTANT_ID = "793"; // Your assistant ID
const OYLAN_API_URL = `/api/v1/assistant/${OYLAN_ASSISTANT_ID}/interactions/`;
const OYLAN_API_KEY = "4zQPa23y.SXlAsiDq6CVPk0rDBM2ZXLsH3ClG04rf";

// MangiSoz TTS API configuration
const MANGISOZ_API_URL = "/mangisoz-api/v1/translate/text/";
const MANGISOZ_API_KEY = "1lsF_GHGlMWM8AIrQjRVAA";

// Language mapping for MangiSoz
const languageMap = {
  'kk': 'kaz',
  'ru': 'rus',
  'en': 'eng'
};

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

  const chat = async (message, userLanguage = language, voiceSttTime = null) => {
    setLoading(true);
    setError(null);
    console.log('Chat called with message:', message, 'language:', userLanguage);
    console.log('Voice STT time passed:', voiceSttTime);
    console.log('Current STT time state:', sttTime);

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
      formData.append('content', message);

      // Add system instructions in context to force correct behavior
      const systemPrompt = userLanguage === 'kk'
        ? 'Маңызды нұсқаулар: Тікелей жауап беріңіз. Ойлау процесін көрсетпеңіз. Максимум 3-5 сөйлем. Қазақша жауап беріңіз.'
        : userLanguage === 'ru'
        ? 'Важные инструкции: Отвечайте прямо. Не показывайте процесс мышления. Максимум 3-5 предложений. Отвечайте на русском.'
        : 'Important instructions: Answer directly. Do not show your thinking process. Maximum 3-5 sentences. Respond in English.';

      formData.append('context', systemPrompt);

      // Try different parameter names for token limit
      formData.append('max_tokens', '200');
      formData.append('max_length', '200');
      formData.append('max_response_length', '200');

      console.log('Sending to Oylan with token limit: 200 and system prompt');

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

      console.log('Raw response text:', responseText);
      console.log('Raw response length:', responseText.length);

      // AGGRESSIVE CLEANING: Remove all thinking content

      // 0. Remove any digits/text BEFORE <think> tag (e.g., "4<think>")
      responseText = responseText.replace(/^[^<]*?(<think>)/i, '$1');
      responseText = responseText.replace(/^[\d\s]+(<think>)/i, '$1');

      // 1. Remove content between <think> tags (multiple patterns)
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');
      responseText = responseText.replace(/<think[\s\S]*?<\/think>/gi, '');
      responseText = responseText.replace(/\[думаю\][\s\S]*?\[\/думаю\]/gi, '');

      // 2. Handle orphaned closing tags - remove everything BEFORE </think>
      if (responseText.includes('</think>') && !responseText.includes('<think>')) {
        console.log('⚠️ Found orphaned </think> tag - removing everything before it');
        const parts = responseText.split('</think>');
        responseText = parts[parts.length - 1]; // Keep only what's after the last </think>
      }

      // 3. Handle orphaned opening tags - remove everything AFTER <think>
      if (responseText.includes('<think>') && !responseText.includes('</think>')) {
        console.log('⚠️ Found orphaned <think> tag - removing everything after it');
        responseText = responseText.split('<think>')[0]; // Keep only what's before <think>
      }

      // 4. Remove any remaining tags
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
      if (!responseText.match(/[.!?]$/)) {
        console.log('⚠️ Response has incomplete final sentence, removing it');
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

      console.log('Cleaned response text:', responseText);
      console.log('Cleaned response length:', responseText.length);

      // Detect language of response
      const detectedLang = detectLanguage(responseText) || userLanguage;
      console.log('Detected language:', detectedLang);
      console.log('Expected language:', userLanguage);

      // Check if response is still thinking content (contains English thinking phrases)
      const thinkingIndicators = /\b(then|first|next|after|but wait|maybe|should i|perhaps|also|finally|wait|oh)\b.*\b(the|a|an|to|for|with|from)\b/i;
      const isStillThinking = detectedLang === 'en' && userLanguage !== 'en' && thinkingIndicators.test(responseText);

      // If response is empty, too short, or still thinking content, provide fallback
      if (!responseText || responseText.length < 5 || isStillThinking) {
        if (isStillThinking) {
          console.warn('⚠️ Response is still thinking content in English! Using fallback.');
        } else {
          console.warn('Response too short after cleaning, using fallback');
        }

        responseText = userLanguage === 'kk' ? 'Кешіріңіз, жауап беру мүмкін болмады. Сұрағыңызды қайталап көріңіз.' :
                       userLanguage === 'ru' ? 'Извините, не смог ответить. Попробуйте переформулировать вопрос.' :
                       'Sorry, could not respond. Please try rephrasing your question.';
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

      // Call MangiSoz TTS API to generate audio
      console.log('Calling MangiSoz TTS API...');
      const mangiSozStartTime = performance.now();
      const mangiSozLang = languageMap[detectedLang] || 'eng';
      console.log('MangiSoz language:', mangiSozLang);
      console.log('Voice gender:', voiceGender);
      console.log('Text to convert:', responseText.substring(0, 100));

      const ttsResponse = await fetch(
        `${MANGISOZ_API_URL}?output_format=audio&output_voice=${voiceGender}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MANGISOZ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            source_language: mangiSozLang,
            target_language: mangiSozLang,
            text: responseText
          })
        }
      );

      const mangiSozEndTime = performance.now();
      metrics.mangiSozTime = ((mangiSozEndTime - mangiSozStartTime) / 1000).toFixed(2);

      console.log('MangiSoz API response status:', ttsResponse.status);
      console.log('MangiSoz API time:', metrics.mangiSozTime, 's');

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error('MangiSoz API error response:', errorText);
        throw new Error(`MangiSoz TTS error! status: ${ttsResponse.status}, details: ${errorText}`);
      }

      const ttsData = await ttsResponse.json();
      console.log('MangiSoz TTS response received:', {
        hasAudio: !!ttsData.audio,
        audioLength: ttsData.audio ? ttsData.audio.length : 0,
        audioPreview: ttsData.audio ? ttsData.audio.substring(0, 50) + '...' : 'null'
      });

      // Extract audio from response
      const audioBase64 = ttsData.audio;

      if (!audioBase64) {
        console.error('No audio in MangiSoz response!', ttsData);
        throw new Error('MangiSoz did not return audio data');
      }

      // Calculate estimated speech duration based on audio
      const wordCount = responseText.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60; // in seconds
      metrics.audioDuration = estimatedDuration.toFixed(2);

      // Generate lipsync
      const lipsync = generateLipsync(responseText, estimatedDuration);

      // Calculate total time (STT + Oylan + TTS)
      const endTime = performance.now();
      const calculatedTotal = parseFloat(metrics.sttTime) + parseFloat(metrics.oylanTime) + parseFloat(metrics.mangiSozTime);
      metrics.totalTime = calculatedTotal.toFixed(2);

      // Set metrics and reset STT time AFTER setting metrics
      setPerformanceMetrics(metrics);
      console.log('Performance metrics:', metrics);
      setSttTime(0); // Reset STT time for next request

      // Prepare response message with audio
      const responseMessage = {
        text: responseText,
        audio: audioBase64, // Base64 audio from MangiSoz
        lipsync: lipsync,
        animation: "Talking_1",
        facialExpression: "default",
        estimatedDuration: estimatedDuration
      };

      console.log('Setting response message with audio');
      setMessages((messages) => [...messages, responseMessage]);

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
      // Call MangiSoz TTS for the greeting (same format as main chat)
      const mangiSozLang = languageMap[greetingLanguage] || 'kaz';

      const ttsResponse = await fetch(
        `${MANGISOZ_API_URL}?output_format=audio&output_voice=${voiceGender}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${MANGISOZ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            source_language: mangiSozLang,
            target_language: mangiSozLang,
            text: greetingText
          })
        }
      );

      if (!ttsResponse.ok) {
        throw new Error('TTS failed for greeting');
      }

      const ttsData = await ttsResponse.json();
      const audioBase64 = ttsData.audio;

      if (!audioBase64) {
        throw new Error('No audio in greeting TTS');
      }

      // Estimate duration
      const wordCount = greetingText.split(/\s+/).length;
      const estimatedDuration = (wordCount / 150) * 60;

      // Generate lipsync
      const lipsync = generateLipsync(greetingText, estimatedDuration);

      // Show greeting message
      const greetingMessage = {
        text: greetingText,
        audio: audioBase64,
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
