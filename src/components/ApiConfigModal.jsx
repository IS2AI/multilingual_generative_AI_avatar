import { useState } from 'react';
import { useApiConfig } from '../contexts/ApiConfigContext';

export const ApiConfigModal = ({ isOpen, onClose }) => {
  const { config, updateLLMConfig, updateTTSConfig, updateASRConfig, setDeploymentMode, resetToDefaults } = useApiConfig();

  const [localConfig, setLocalConfig] = useState(config);

  if (!isOpen) return null;

  const handleSave = () => {
    updateLLMConfig(localConfig.llm);
    updateTTSConfig(localConfig.tts);
    updateASRConfig(localConfig.asr);
    setDeploymentMode(localConfig.deploymentMode);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default configuration?')) {
      resetToDefaults();
      setLocalConfig(config);
    }
  };

  const handleDeploymentModeChange = (mode) => {
    setLocalConfig(prev => ({
      ...prev,
      deploymentMode: mode
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">⚙️</span> API Configuration
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-blue-100 mt-2">Configure your API endpoints and keys for cloud or local deployment</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Deployment Mode Selection */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🌐</span> Deployment Mode
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDeploymentModeChange('local')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  localConfig.deploymentMode === 'local'
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">💻</div>
                <div className="font-semibold text-white">Local Deployment</div>
                <div className="text-xs text-gray-400 mt-1">Use local servers (localhost)</div>
              </button>
              <button
                onClick={() => handleDeploymentModeChange('cloud')}
                className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                  localConfig.deploymentMode === 'cloud'
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }`}
              >
                <div className="text-3xl mb-2">☁️</div>
                <div className="font-semibold text-white">Cloud Deployment</div>
                <div className="text-xs text-gray-400 mt-1">Use cloud APIs</div>
              </button>
            </div>
          </div>

          {/* LLM Configuration */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🤖</span> LLM (Language Model)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint URL</label>
                <input
                  type="text"
                  value={localConfig.llm.url}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    llm: { ...prev.llm, url: e.target.value }
                  }))}
                  placeholder="/api/v1/chat/completions or https://your-api.com/v1/chat/completions"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">OpenAI-compatible chat completions endpoint</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model Name</label>
                <input
                  type="text"
                  value={localConfig.llm.model}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    llm: { ...prev.llm, model: e.target.value }
                  }))}
                  placeholder="issai/Qolda or gpt-4"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key (optional)</label>
                <input
                  type="password"
                  value={localConfig.llm.apiKey}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    llm: { ...prev.llm, apiKey: e.target.value }
                  }))}
                  placeholder="Leave empty if not required"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* TTS Configuration */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🔊</span> TTS (Text-to-Speech)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint URL</label>
                <input
                  type="text"
                  value={localConfig.tts.url}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    tts: { ...prev.tts, url: e.target.value }
                  }))}
                  placeholder="/tts-api/tts/v1/audio/speech or https://your-tts-api.com/v1/audio/speech"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">OpenAI-compatible TTS endpoint</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model Name</label>
                <input
                  type="text"
                  value={localConfig.tts.model}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    tts: { ...prev.tts, model: e.target.value }
                  }))}
                  placeholder="matcha-tts-v1 or tts-1"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key (optional)</label>
                <input
                  type="password"
                  value={localConfig.tts.apiKey}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    tts: { ...prev.tts, apiKey: e.target.value }
                  }))}
                  placeholder="Leave empty if not required"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* ASR Configuration */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <span className="mr-2">🎤</span> ASR (Speech-to-Text)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint URL</label>
                <input
                  type="text"
                  value={localConfig.asr.url}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    asr: { ...prev.asr, url: e.target.value }
                  }))}
                  placeholder="/asr-api/v1/audio/transcriptions or https://your-asr-api.com/v1/audio/transcriptions"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-xs text-gray-400 mt-1">OpenAI Whisper-compatible transcription endpoint</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model Name</label>
                <input
                  type="text"
                  value={localConfig.asr.model}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    asr: { ...prev.asr, model: e.target.value }
                  }))}
                  placeholder="issai/faster-whisper-mangisoz-best-10july2025-fp16 or whisper-1"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
                <input
                  type="password"
                  value={localConfig.asr.apiKey}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    asr: { ...prev.asr, apiKey: e.target.value }
                  }))}
                  placeholder="test-key-1 or your-api-key"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-red-500/20 text-red-300 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all duration-300"
            >
              Reset to Defaults
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
