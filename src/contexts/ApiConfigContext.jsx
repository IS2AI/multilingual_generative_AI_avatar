import { createContext, useContext, useState, useEffect } from 'react';

const ApiConfigContext = createContext();

// Default configuration (local deployment)
const DEFAULT_CONFIG = {
  llm: {
    url: '/api/v1/chat/completions',
    model: 'issai/Qolda',
    apiKey: ''
  },
  tts: {
    url: '/tts-api/tts/v1/audio/speech',
    model: 'matcha-tts-v1',
    apiKey: ''
  },
  asr: {
    url: '/asr-api/v1/audio/transcriptions',
    model: 'issai/faster-whisper-mangisoz-best-10july2025-fp16',
    apiKey: 'test-key-1'
  },
  deploymentMode: 'local' // 'local' or 'cloud'
};

export const ApiConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    // Load from localStorage if available
    const savedConfig = localStorage.getItem('apiConfig');
    return savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG;
  });

  // Save to localStorage whenever config changes
  useEffect(() => {
    localStorage.setItem('apiConfig', JSON.stringify(config));
  }, [config]);

  const updateLLMConfig = (llmConfig) => {
    setConfig(prev => ({
      ...prev,
      llm: { ...prev.llm, ...llmConfig }
    }));
  };

  const updateTTSConfig = (ttsConfig) => {
    setConfig(prev => ({
      ...prev,
      tts: { ...prev.tts, ...ttsConfig }
    }));
  };

  const updateASRConfig = (asrConfig) => {
    setConfig(prev => ({
      ...prev,
      asr: { ...prev.asr, ...asrConfig }
    }));
  };

  const setDeploymentMode = (mode) => {
    setConfig(prev => ({
      ...prev,
      deploymentMode: mode
    }));
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem('apiConfig');
  };

  return (
    <ApiConfigContext.Provider
      value={{
        config,
        updateLLMConfig,
        updateTTSConfig,
        updateASRConfig,
        setDeploymentMode,
        resetToDefaults
      }}
    >
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within ApiConfigProvider');
  }
  return context;
};
