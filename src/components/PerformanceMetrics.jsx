import React from 'react';
import { useChat } from '../hooks/useChat';

export const PerformanceMetrics = () => {
  const { performanceMetrics } = useChat();

  if (!performanceMetrics) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
        <p className="text-gray-400 text-sm">No data yet. Send a message to see metrics.</p>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Oylan API Response',
      value: `${performanceMetrics.oylanTime}s`,
      color: 'text-blue-400',
      description: 'Time to get text response from LLM'
    },
    {
      label: 'MangiSoz TTS',
      value: `${performanceMetrics.mangiSozTime}s`,
      color: 'text-green-400',
      description: 'Time to generate audio from text'
    },
    {
      label: 'Total Time',
      value: `${performanceMetrics.totalTime}s`,
      color: 'text-orange-400',
      description: 'Total processing time'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
      <div className="space-y-3">
        {metrics.map((metric, index) => (
          <div key={index} className="border-b border-gray-700 pb-3 last:border-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-300">{metric.label}</span>
              <span className={`text-lg font-bold ${metric.color}`}>{metric.value}</span>
            </div>
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Visual bar chart */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-2">Processing Breakdown</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 w-24">Oylan</div>
            <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${(parseFloat(performanceMetrics.oylanTime) / parseFloat(performanceMetrics.totalTime)) * 100}%`
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 w-12 text-right">
              {((parseFloat(performanceMetrics.oylanTime) / parseFloat(performanceMetrics.totalTime)) * 100).toFixed(0)}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 w-24">MangiSoz</div>
            <div className="flex-1 h-4 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${(parseFloat(performanceMetrics.mangiSozTime) / parseFloat(performanceMetrics.totalTime)) * 100}%`
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 w-12 text-right">
              {((parseFloat(performanceMetrics.mangiSozTime) / parseFloat(performanceMetrics.totalTime)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
