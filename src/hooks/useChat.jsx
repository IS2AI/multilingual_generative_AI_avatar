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
      // Try different parameter names for token limit
      formData.append('max_tokens', '350');
      formData.append('max_length', '350');
      formData.append('max_response_length', '350');

      console.log('Sending to Oylan with token limit: 350');

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

      // Remove <think> tags - handle both complete and incomplete tags
      // First, remove complete think blocks (greedy and non-greedy)
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');
      responseText = responseText.replace(/<think[\s\S]*?<\/think>/gi, '');

      // Remove any remaining opening or closing tags
      responseText = responseText.replace(/<\/?think[^>]*>/gi, '');

      // Clean up multiple newlines and extra spaces
      responseText = responseText.replace(/\n\s*\n\s*\n/g, '\n\n');
      responseText = responseText.trim();

      console.log('Cleaned response text:', responseText);

      // Detect language of response
      const detectedLang = detectLanguage(responseText) || userLanguage;
      console.log('Detected language:', detectedLang);

      // If response is empty or too short after cleaning, provide fallback
      if (!responseText || responseText.length < 5) {
        console.warn('Response too short after cleaning, using fallback');
        responseText = detectedLang === 'kk' ? 'Кешіріңіз, жауап беру мүмкін болмады.' :
                       detectedLang === 'ru' ? 'Извините, не смог ответить.' :
                       'Sorry, could not respond.';
      }

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
