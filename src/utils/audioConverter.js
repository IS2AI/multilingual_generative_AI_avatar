// Convert audio blob to WAV format using Web Audio API
export async function convertToWav(audioBlob) {
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Read blob as array buffer
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to WAV
        const wavBuffer = audioBufferToWav(audioBuffer);

        // Create blob
        const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

        await audioContext.close();

        return wavBlob;
    } catch (error) {
        console.error('Error converting audio to WAV:', error);
        throw error;
    }
}

// Convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    // Interleave channels
    const length = audioBuffer.length * numberOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // Write WAV header
    let offset = 0;

    // RIFF identifier
    writeString(view, offset, 'RIFF'); offset += 4;
    // file length
    view.setUint32(offset, 36 + length, true); offset += 4;
    // RIFF type
    writeString(view, offset, 'WAVE'); offset += 4;
    // format chunk identifier
    writeString(view, offset, 'fmt '); offset += 4;
    // format chunk length
    view.setUint32(offset, 16, true); offset += 4;
    // sample format (raw)
    view.setUint16(offset, format, true); offset += 2;
    // channel count
    view.setUint16(offset, numberOfChannels, true); offset += 2;
    // sample rate
    view.setUint32(offset, sampleRate, true); offset += 4;
    // byte rate (sample rate * block align)
    view.setUint32(offset, sampleRate * numberOfChannels * bitDepth / 8, true); offset += 4;
    // block align (channel count * bytes per sample)
    view.setUint16(offset, numberOfChannels * bitDepth / 8, true); offset += 2;
    // bits per sample
    view.setUint16(offset, bitDepth, true); offset += 2;
    // data chunk identifier
    writeString(view, offset, 'data'); offset += 4;
    // data chunk length
    view.setUint32(offset, length, true); offset += 4;

    // Write audio data
    const channels = [];
    for (let i = 0; i < numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    let index = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, channels[channel][i]));
            view.setInt16(index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            index += 2;
        }
    }

    return buffer;
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
