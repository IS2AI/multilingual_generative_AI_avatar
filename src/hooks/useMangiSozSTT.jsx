import { useState, useEffect, useRef, useCallback } from 'react';
import { convertToWav } from '../utils/audioConverter';

// STT API configuration
// Old MangiSoz STT API (commented out)
// const MANGISOZ_STT_API_URL = "/mangisoz-api/v1/transcript/transcript_audio/";
// const MANGISOZ_STT_API_KEY = "XUD5UQxZj5UtcZMglv7sjg";

// New: Local Faster Whisper ASR API
const ASR_API_URL = "/asr-api/v1/audio/transcriptions";
const ASR_API_KEY = "test-key-1"; // Update if your API requires a different key
const ASR_MODEL_ID = "issai/faster-whisper-mangisoz-best-10july2025-fp16";

// Language mapping for ASR API (uses ISO 639-1 codes: kk, ru, en)
const languageMap = {
  'kk': 'kk',  // Kazakh
  'ru': 'ru',  // Russian
  'en': 'en'   // English
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

    // Send audio file to Local ASR API (Faster Whisper)
    const transcribeAudio = async (audioBlob) => {
        try {
            setIsProcessing(true);
            console.log('Sending audio file to Local ASR API...');
            console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

            // Create FormData with OpenAI Whisper API format
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
            formData.append('model', ASR_MODEL_ID); // Your fine-tuned model
            formData.append('language', languageMap[language] || language); // Send language hint (kk, ru, or en)

            console.log('Sending request to Local ASR API...');

            const sttStartTime = performance.now();
            const response = await fetch(
                ASR_API_URL,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${ASR_API_KEY}`
                        // Don't set Content-Type - browser will set it with boundary for FormData
                    },
                    body: formData
                }
            );
            const sttEndTime = performance.now();
            const sttTimeSeconds = ((sttEndTime - sttStartTime) / 1000).toFixed(2);
            console.log('Local ASR time:', sttTimeSeconds, 's');

            console.log('Local ASR response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Local ASR error response:', errorText);
                throw new Error(`Local ASR error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Local ASR response:', data);
            console.log('Response keys:', Object.keys(data));

            // OpenAI Whisper API format returns { text: "transcribed text" }
            // Also try other possible formats
            const transcribedText = data.text || data.transcription_text || data.transcript || data.transcription || data.result || '';
            console.log('Transcribed text:', transcribedText);

            if (!transcribedText) {
                console.error('❌ Could not find transcribed text in response. Full response:', JSON.stringify(data, null, 2));
            }

            return { text: transcribedText.trim(), sttTime: sttTimeSeconds };

        } catch (error) {
            console.error('❌ Transcription error:', error);
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

        // Stop existing recording if any
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            console.log('Stopping existing MediaRecorder before starting new one');
            mediaRecorderRef.current.stop();
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit
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
                    const result = await transcribeAudio(wavBlob);
                    const transcribedText = result.text;
                    const sttTimeValue = result.sttTime;

                    console.log('=== TRANSCRIPTION COMPLETE ===');
                    console.log('Transcribed text:', transcribedText);
                    console.log('STT time:', sttTimeValue);
                    console.log('Recording duration:', recordingDuration, 'ms');

                    if (transcribedText) {
                        setTranscript(transcribedText);
                        setLastSpeechTime(Date.now());

                        // Auto-send immediately if enabled
                        if (autoSendEnabled && onAutoSendRef.current) {
                            console.log('Auto-sending transcribed text:', transcribedText);
                            onAutoSendRef.current(transcribedText.trim(), sttTimeValue);
                            setTranscript('');
                        }
                    } else {
                        console.warn('No transcribed text received');
                    }
                } catch (error) {
                    console.error('Failed to transcribe audio:', error);
                    setTranscript('');
                }

                audioChunksRef.current = [];
            };

            recordingStartTimeRef.current = Date.now();
            setLastSpeechTime(Date.now()); // Initialize speech time
            mediaRecorder.start();
            setIsListening(true);
            console.log('Recording started');

            // Auto-stop after 2 seconds of silence (increased from 1 second)
            let lastCheck = Date.now();
            const checkSilence = () => {
                if (mediaRecorderRef.current?.state !== 'recording' || !analyserRef.current) {
                    return;
                }

                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

                // Higher threshold to ignore background noise
                if (average > 30) {
                    // Speech detected, reset timer
                    lastCheck = Date.now();
                } else if (Date.now() - lastCheck > 2000) {
                    // 2 seconds of silence, check if recording is long enough
                    const recordingDuration = Date.now() - recordingStartTimeRef.current;

                    if (recordingDuration < 2000) {
                        // Recording too short (less than 2 seconds), ignore it
                        console.log('Recording too short (', recordingDuration, 'ms), ignoring...');
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                            // Clear chunks to prevent transcription
                            audioChunksRef.current = [];
                        }
                        setIsListening(false);
                        return;
                    }

                    // Good recording, auto-stop
                    console.log('2 seconds of silence detected after', recordingDuration, 'ms, auto-stopping...');
                    if (mediaRecorderRef.current?.state === 'recording') {
                        mediaRecorderRef.current.stop();
                    }
                    return;
                }

                // Check again in 100ms
                setTimeout(checkSilence, 100);
            };

            // Start silence detection after 1 second (give time to start speaking)
            setTimeout(checkSilence, 1000);

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
