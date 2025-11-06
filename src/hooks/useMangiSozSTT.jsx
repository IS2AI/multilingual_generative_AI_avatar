import { useState, useEffect, useRef, useCallback } from 'react';
import { convertToWav } from '../utils/audioConverter';

// MangiSoz STT API configuration
const MANGISOZ_STT_API_URL = "/mangisoz-api/v1/translate/audio/";
const MANGISOZ_STT_API_KEY = "XUD5UQxZj5UtcZMglv7sjg";

// Language mapping for MangiSoz
const languageMap = {
  'kk': 'kaz',
  'ru': 'rus',
  'en': 'eng'
};

export const useMangiSozSTT = (language = 'kk') => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isSupported, setIsSupported] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [volume, setVolume] = useState(0);
    const [lastSpeechTime, setLastSpeechTime] = useState(null);
    const [autoSendEnabled, setAutoSendEnabled] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const mediaRecorderRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const silenceTimeoutRef = useRef(null);
    const onAutoSendRef = useRef(null);
    const recordingStartTimeRef = useRef(null);

    // Check browser support
    const checkSupport = useCallback(() => {
        const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
        const hasMediaRecorder = !!window.MediaRecorder;
        setIsSupported(hasMediaDevices && hasMediaRecorder);
        return hasMediaDevices && hasMediaRecorder;
    }, []);

    // Convert audio blob to base16 (hex) string
    const blobToBase16 = async (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const arrayBuffer = reader.result;
                const bytes = new Uint8Array(arrayBuffer);
                const hexString = Array.from(bytes)
                    .map(byte => byte.toString(16).padStart(2, '0'))
                    .join('');
                resolve(hexString);
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    };

    // Send audio to MangiSoz STT API
    const transcribeAudio = async (audioBlob) => {
        try {
            setIsProcessing(true);
            console.log('Converting audio to base16...');
            console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

            const base16Audio = await blobToBase16(audioBlob);
            console.log('Base16 audio length:', base16Audio.length);
            console.log('Base16 preview:', base16Audio.substring(0, 100));

            console.log('Current language param:', language);
            console.log('Language map:', languageMap);
            const targetLang = languageMap[language] || 'kaz';
            console.log('Mapped target language:', targetLang);

            // Format exactly as in Postman example - NO source_language, only target_language
            const requestBody = {
                target_language: targetLang,
                audio: base16Audio
            };

            console.log('Request body:', JSON.stringify({
                target_language: requestBody.target_language,
                audio_length: requestBody.audio.length,
                audio_preview: requestBody.audio.substring(0, 50)
            }));

            const response = await fetch(
                `${MANGISOZ_STT_API_URL}?output_format=text`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${MANGISOZ_STT_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            console.log('MangiSoz STT response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('MangiSoz STT error response:', errorText);
                throw new Error(`MangiSoz STT error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('MangiSoz STT response:', data);

            const transcribedText = data.text || '';
            console.log('Transcribed text:', transcribedText);

            return transcribedText.trim();

        } catch (error) {
            console.error('Transcription error:', error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    // Initialize audio analysis for volume visualization
    const initializeAudioAnalysis = useCallback(async () => {
        try {
            if (!checkSupport()) {
                console.error('MediaRecorder or getUserMedia not supported');
                return false;
            }

            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000, // 16kHz is standard for speech recognition
                    channelCount: 1 // Mono audio
                }
            });

            mediaStreamRef.current = stream;
            setHasPermission(true);
            console.log('Microphone access granted');

            // Set up audio analysis for volume visualization
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            microphone.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const updateVolume = () => {
                if (analyserRef.current && isListening) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    setVolume(average);

                    // Detect speech activity
                    if (average > 20) { // Threshold for speech detection
                        setLastSpeechTime(Date.now());
                    }
                }
                animationFrameRef.current = requestAnimationFrame(updateVolume);
            };

            updateVolume();
            return true;

        } catch (error) {
            console.error('Microphone access denied:', error);
            setHasPermission(false);
            return false;
        }
    }, [isListening, checkSupport]);

    // Start recording
    const startListening = useCallback(async () => {
        if (!isSupported) {
            alert('Audio recording is not supported in this browser.');
            return;
        }

        if (!hasPermission || !mediaStreamRef.current) {
            const success = await initializeAudioAnalysis();
            if (!success) return;
        }

        try {
            audioChunksRef.current = [];

            // Try to use WAV format if supported, otherwise use WebM with low bitrate
            const options = {
                audioBitsPerSecond: 16000 // Low bitrate for smaller file size
            };

            // Try different MIME types in order of preference
            const mimeTypes = [
                'audio/wav',
                'audio/wave',
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg'
            ];

            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    options.mimeType = mimeType;
                    break;
                }
            }

            console.log('Starting MediaRecorder with type:', options.mimeType || 'default (browser will choose)', 'bitrate:', options.audioBitsPerSecond);

            const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log('Audio chunk received, size:', event.data.size);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('MediaRecorder stopped, total chunks:', audioChunksRef.current.length);

                if (audioChunksRef.current.length === 0) {
                    console.warn('No audio data recorded');
                    setTranscript('');
                    return;
                }

                const recordingDuration = Date.now() - recordingStartTimeRef.current;
                console.log('Recording duration:', recordingDuration, 'ms');

                // Check minimum recording duration
                if (recordingDuration < 500) {
                    console.warn('Recording too short:', recordingDuration, 'ms');
                    setTranscript('');
                    return;
                }

                // Create audio blob
                const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType || 'audio/webm' });
                console.log('Created audio blob, size:', audioBlob.size);

                try {
                    // Convert to WAV format
                    console.log('Converting audio to WAV format...');
                    const wavBlob = await convertToWav(audioBlob);
                    console.log('Converted to WAV, size:', wavBlob.size);

                    // Transcribe audio
                    const transcribedText = await transcribeAudio(wavBlob);

                    if (transcribedText) {
                        setTranscript(transcribedText);
                        setLastSpeechTime(Date.now());

                        // Auto-send after 2 seconds if enabled
                        if (autoSendEnabled && onAutoSendRef.current) {
                            if (silenceTimeoutRef.current) {
                                clearTimeout(silenceTimeoutRef.current);
                            }

                            silenceTimeoutRef.current = setTimeout(() => {
                                if (transcribedText.trim() && onAutoSendRef.current) {
                                    onAutoSendRef.current(transcribedText.trim());
                                    setTranscript('');
                                }
                            }, 2000);
                        }
                    }
                } catch (error) {
                    console.error('Failed to transcribe audio:', error);
                    setTranscript('');
                }

                audioChunksRef.current = [];
            };

            recordingStartTimeRef.current = Date.now();
            mediaRecorder.start();
            setIsListening(true);
            console.log('Recording started');

        } catch (error) {
            console.error('Failed to start recording:', error);
            setIsListening(false);
        }
    }, [isSupported, hasPermission, autoSendEnabled, initializeAudioAnalysis]);

    // Stop recording
    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log('Stopping recording...');
            mediaRecorderRef.current.stop();
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        setIsListening(false);
        setVolume(0);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript('');
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, []);

    const setAutoSendCallback = useCallback((callback) => {
        onAutoSendRef.current = callback;
    }, []);

    const toggleAutoSend = useCallback(() => {
        setAutoSendEnabled(prev => !prev);
        if (!autoSendEnabled && silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, [autoSendEnabled]);

    const pauseListening = useCallback(() => {
        if (mediaRecorderRef.current && isListening) {
            stopListening();
            setIsPaused(true);
        }
    }, [isListening, stopListening]);

    const resumeListening = useCallback(() => {
        if (isPaused && !isListening) {
            setIsPaused(false);
            startListening();
        }
    }, [isPaused, isListening, startListening]);

    const forceStop = useCallback(() => {
        stopListening();
        setIsPaused(false);
        setTranscript('');
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
    }, [stopListening]);

    const sendNow = useCallback(() => {
        const currentTranscript = transcript.trim();
        if (currentTranscript && onAutoSendRef.current) {
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            onAutoSendRef.current(currentTranscript);
            setTranscript('');
            stopListening();
        }
    }, [transcript, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript: '', // MangiSoz STT doesn't provide interim results
        isSupported,
        hasPermission,
        volume,
        lastSpeechTime,
        autoSendEnabled,
        isPaused,
        isProcessing,
        startListening,
        stopListening,
        clearTranscript,
        setAutoSendCallback,
        toggleAutoSend,
        pauseListening,
        resumeListening,
        forceStop,
        sendNow,
    };
};
