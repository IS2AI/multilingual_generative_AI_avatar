import { createContext, useContext, useEffect, useState } from "react";

// LLM API configuration
// Old OYLAN API (commented out)
// const OYLAN_ASSISTANT_ID = "793";
// const OYLAN_API_URL = `/api/v1/assistant/${OYLAN_ASSISTANT_ID}/interactions/`;
// const OYLAN_API_KEY = "4zQPa23y.SXlAsiDq6CVPk0rDBM2ZXLsH3ClG04rf";

// New: Local LMDeploy model (OpenAI-compatible)
const LLM_API_URL = "/api/v1/chat/completions";
const LLM_MODEL_NAME = "issai/Qolda-MPO"; // Your model name

// System prompt for natural, concise responses
const SYSTEM_PROMPT = {
  kk: `Сіз адаммен сөйлесіп тұрғандай қысқа және табиғи жауап беретін көмекші боласыз. Ережелер:
- Тек қысқа, тікелей жауап беріңіз
- "Көмекші:", "Жауап:" сияқты белгілерді қолданбаңыз
- Түсіндіру немесе контекст бермеңіз
- Адам сияқты қарапайым әңгімелесіңіз

Мысалдар:
Қазақстанның астанасы қандай қала?
Қазақстанның астанасы Астана.

144-тің түбірі неше?
144-тің түбірі 12.`,

  ru: `Вы помощник, который отвечает кратко и естественно, как человек в разговоре. Правила:
- Давайте только краткий, прямой ответ
- Не используйте метки типа "Помощник:", "Ответ:"
- Не давайте объяснений или контекста
- Общайтесь просто, как человек

Примеры:
Какая столица Казахстана?
Столица Казахстана — Астана.

Каков корень из 144?
Корень из 144 равен 12.`,

  en: `You are an assistant who responds briefly and naturally, like a human in conversation. Rules:
- Give only brief, direct answers
- Don't use labels like "Assistant:", "Answer:"
- Don't provide explanations or context
- Speak simply, like a human

Examples:
What is the capital of Kazakhstan?
Capital of Kazakhstan is Astana.

What is the root of 144?
Root of 144 is 12.`
};

// TTS API configuration
// Old MangiSoz TTS API (commented out)
// const MANGISOZ_API_URL = "/mangisoz-api/v1/translate/text/";
// const MANGISOZ_API_KEY = "1lsF_GHGlMWM8AIrQjRVAA";

// New: Local TTS API (Matcha-TTS with OpenAI-compatible endpoint)
const TTS_API_URL = "/tts-api/tts/v1/audio/speech";
const TTS_API_KEY = "test-key-1";
const TTS_MODEL_NAME = "matcha-tts-v1";

// Language mapping for TTS
// Old MangiSoz language codes
// const languageMap = {
//   'kk': 'kaz',
//   'ru': 'rus',
//   'en': 'eng'
// };

// Language mapping for local TTS API
const ttsLanguageMap = {
  'kk': 'kk',  // Kazakh
  'ru': 'ru',  // Russian
  'en': 'en'   // English
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
      // Call Local LLM API using OpenAI-compatible format
      console.log('Calling Local LLM API...');
      console.log('URL:', LLM_API_URL);

      const llmStartTime = performance.now();

      const requestBody = {
        model: LLM_MODEL_NAME,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT[userLanguage] || SYSTEM_PROMPT['en']
          },
          {
            role: "user",
            content: message
          }
        ],
        // No max_tokens - get full response including thinking, then extract real answer
        temperature: 0.7,
        top_p: 0.95,
        stop: ["\n\n\n", "User:", "Пайдаланушы:", "Пользователь:"],  // Stop sequences to prevent rambling
        extra_body: {
          top_k: 20,
          enable_thinking: false  // Disable thinking mode for direct responses
        }
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

      // EXTRACT REAL RESPONSE: Remove thinking section and get actual answer

      // Strategy: If response has <think> tags, extract only content AFTER </think>
      if (responseText.includes('</think>')) {
        console.log('✂️ Found </think> tag - extracting content after thinking section');
        const parts = responseText.split('</think>');
        responseText = parts[parts.length - 1]; // Get everything after last </think>
        console.log('Content after </think>:', responseText);
      } else if (responseText.includes('<think>')) {
        // If only opening tag exists (response cut off), remove everything from <think> onward
        console.log('⚠️ Found only <think> tag - removing thinking section');
        responseText = responseText.split('<think>')[0];
      }

      // Remove any remaining <think> or </think> tags
      responseText = responseText.replace(/<\/?think[^>]*>/gi, '');
      responseText = responseText.replace(/\[?\/?думаю\]?/gi, '');

      // Remove common thinking patterns at the start
      responseText = responseText.replace(/^(Okay|Alright|Let me|I need to|First|So|Well),?\s+(think|answer|respond|address|tackle|consider)[\s\S]*?(\n\n|\.\s+[A-ZА-ЯӘ])/i, '$3');
      responseText = responseText.replace(/^.*?(Let me think|I should|I need to).*?\n/gim, '');

      // Remove thinking indicators
      responseText = responseText.replace(/^(Thinking:|Analysis:|Plan:|Step \d+:).*$/gim, '');

      // Remove AI artifacts at the start
      responseText = responseText.replace(/^(continuation|answer|response|reply|result)\.?\s*/i, '');
      responseText = responseText.replace(/^(Continuation|Answer|Response|Reply|Result):\s*/gim, '');

      // Clean up whitespace
      responseText = responseText.replace(/\n\s*\n\s*\n+/g, '\n\n');
      responseText = responseText.trim();

      console.log('Cleaned response text:', responseText);
      console.log('Cleaned response length:', responseText.length);

      // Detect language of response
      const detectedLang = detectLanguage(responseText) || userLanguage;
      console.log('Detected language:', detectedLang);
      console.log('Expected language:', userLanguage);

      // Check if response is empty or still thinking content
      const thinkingIndicators = /\b(then|first|next|after|but wait|maybe|should i|perhaps|also|finally|wait|oh)\b.*\b(the|a|an|to|for|with|from)\b/i;
      const isStillThinking = detectedLang === 'en' && userLanguage !== 'en' && thinkingIndicators.test(responseText);

      // If response is empty, too short, or still thinking content, provide fallback
      if (!responseText || responseText.length < 3 || isStillThinking) {
        if (isStillThinking) {
          console.warn('⚠️ Response is still thinking content in English! Using fallback.');
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
        responseText = truncatedWords.join(' ');

        // Add ellipsis if we truncated mid-sentence
        if (!responseText.match(/[.!?]$/)) {
          responseText += '...';
        }

        console.log(`✂️ Truncated response (${truncatedWords.length} words):`, responseText.substring(0, 100) + '...');
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
          "Authorization": `Bearer ${TTS_API_KEY}`,
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

      // TTS API returns audio blob directly, need to convert to base64
      const audioBlob = await ttsResponse.blob();
      console.log('TTS audio blob received:', {
        size: audioBlob.size,
        type: audioBlob.type
      });

      // Convert blob to base64
      const audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Remove data URL prefix (e.g., "data:audio/wav;base64,")
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      if (!audioBase64) {
        console.error('Failed to convert audio to base64!');
        throw new Error('TTS did not return valid audio data');
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
      // Call Local TTS API for the greeting
      const ttsLang = ttsLanguageMap[greetingLanguage] || 'en';

      const ttsResponse = await fetch(TTS_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TTS_API_KEY}`,
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

      // Convert blob to base64
      const audioBlob = await ttsResponse.blob();
      const audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

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
