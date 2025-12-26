"""
API Benchmark Script
Benchmarks the deployed TTS API (OpenAI-compatible endpoint)
"""
from __future__ import annotations

import time
import requests
from pathlib import Path
from datetime import datetime

# Test sentences
TEST_SENTENCES = {
    "en": [
        "The weather today is unpredictable, so make sure to carry an umbrella just in case.",
        "Artificial intelligence is transforming industries, but ethical considerations are still a major challenge.",
        "Traveling allows us to experience new cultures and broaden our perspectives in unexpected ways.",
        "She was excited to start her new job, even though the commute would be longer than expected.",
        "The recipe called for fresh herbs, but frozen ones worked just as well in the end.",
    ],
    "ru": [
        "Сегодня погода изменчивая, поэтому возьмите зонт на всякий случай.",
        "Искусственный интеллект меняет отрасли, но этические вопросы остаются актуальными.",
        "Путешествия позволяют нам познакомиться с новыми культурами и расширить кругозор.",
        "Она была рада новой работе, хотя дорога на неё оказалась длиннее, чем ожидалось.",
        "В рецепте требовались свежие травы, но замороженные тоже сгодились.",
    ],
    "kk": [
        "Бүгінгі ауа райы тұрақсыз, сондықтан жаңбырдан қорғану үшін зонт алыңыз.",
        "Жасанды интеллект салаларды өзгертуде, бірақ этикалық мәселелер әлі де маңызды.",
        "Саяхаттау бізге жаңа мәдениеттерді тануға және ой-пікірімізді кеңейтуге мүмкіндік береді.",
        "Ол жаңа жұмысқа қуанышты болды, дегенмен жолы ойлағаннан ұзақ шықты.",
        "Рецептте жаңа шөптер керек болды, бірақ мұздатылғандары да жарады.",
    ],
}


def benchmark_api_request(api_url, api_key, lang, text, sentence_num, output_dir):
    """Benchmark a single API request and save audio."""
    start_time = time.perf_counter()

    # Make API request
    try:
        response = requests.post(
            f"{api_url}/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "matcha-tts-v1",
                "input": text,
                "lang": lang,
                "voice": "male",
                "format": "wav",
            },
            timeout=60,
        )
        response.raise_for_status()

        # Save audio file
        audio_filename = f"{lang}_sentence_{sentence_num:02d}.wav"
        audio_path = output_dir / audio_filename

        with open(audio_path, 'wb') as f:
            f.write(response.content)

        # Calculate metrics
        total_time = time.perf_counter() - start_time
        file_size = len(response.content)

        # Estimate audio duration (rough calculation: PCM_16, 22050 Hz, mono)
        # WAV header is 44 bytes, rest is audio data
        audio_data_size = file_size - 44
        audio_duration = audio_data_size / (22050 * 2)  # 2 bytes per sample

        rtf = total_time / audio_duration if audio_duration > 0 else 0
        chars_per_sec = len(text) / total_time if total_time > 0 else 0

        return {
            'sentence_num': sentence_num,
            'lang': lang,
            'text_length': len(text),
            'audio_duration': audio_duration,
            'file_size': file_size,
            'total_time': total_time,
            'rtf': rtf,
            'chars_per_sec': chars_per_sec,
            'audio_file': audio_filename,
            'success': True,
            'error': None,
        }

    except requests.exceptions.RequestException as e:
        return {
            'sentence_num': sentence_num,
            'lang': lang,
            'text_length': len(text),
            'audio_duration': 0,
            'file_size': 0,
            'total_time': time.perf_counter() - start_time,
            'rtf': 0,
            'chars_per_sec': 0,
            'audio_file': None,
            'success': False,
            'error': str(e),
        }


def main():
    """Run API benchmark."""
    # Configuration
    API_URL = "http://localhost:8001/tts"
    API_KEY = "test-key-1"

    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Create output directory for audio files
    output_dir = Path(f"benchmark_api_audio_{timestamp_str}")
    output_dir.mkdir(exist_ok=True)

    print("="*80)
    print("TTS API BENCHMARK - OpenAI-Compatible Endpoint")
    print("="*80)
    print(f"API URL: {API_URL}/v1/audio/speech")
    print(f"Audio output directory: {output_dir}")
    print()

    # Check if API is available
    try:
        response = requests.get(f"{API_URL.replace('/tts', '')}/docs", timeout=5)
        print("✓ API is reachable")
        print()
    except requests.exceptions.RequestException:
        print("✗ ERROR: API is not reachable!")
        print(f"  Make sure the server is running: uv run uvicorn main:app --host 0.0.0.0 --port 8001")
        print()
        return

    # Results storage
    all_results = []

    # Run benchmarks
    for lang, sentences in TEST_SENTENCES.items():
        print(f"\n{'='*80}")
        print(f"LANGUAGE: {lang.upper()}")
        print(f"{'='*80}\n")

        lang_results = []

        for i, text in enumerate(sentences, 1):
            text_preview = text[:60] if text.isascii() else f"<{lang} text, {len(text)} chars>"
            print(f"[{i}/{len(sentences)}] Benchmarking API request...")
            print(f"  Text: {text_preview}{'...' if len(text) > 60 else ''}")

            result = benchmark_api_request(API_URL, API_KEY, lang, text, i, output_dir)
            lang_results.append(result)
            all_results.append(result)

            if result['success']:
                print(f"  ✓ SUCCESS")
                print(f"  Length: {result['text_length']} chars")
                print(f"  Audio: {result['audio_duration']:.2f}s")
                print(f"  File Size: {result['file_size']:,} bytes")
                print(f"  API Response Time: {result['total_time']:.3f}s")
                print(f"  RTF: {result['rtf']:.3f}")
                print(f"  Throughput: {result['chars_per_sec']:.1f} chars/s")
                print(f"  Audio saved: {result['audio_file']}")
            else:
                print(f"  ✗ FAILED: {result['error']}")

            print()

        # Language summary
        successful = [r for r in lang_results if r['success']]
        if successful:
            avg_time = sum(r['total_time'] for r in successful) / len(successful)
            avg_rtf = sum(r['rtf'] for r in successful) / len(successful)
            avg_throughput = sum(r['chars_per_sec'] for r in successful) / len(successful)

            print(f"{'-'*80}")
            print(f"{lang.upper()} SUMMARY:")
            print(f"  Successful: {len(successful)}/{len(lang_results)}")
            print(f"  Avg API Response Time: {avg_time:.3f}s")
            print(f"  Avg RTF: {avg_rtf:.3f}")
            print(f"  Avg Throughput: {avg_throughput:.1f} chars/s")
            print(f"{'-'*80}\n")

    # Overall summary
    successful_results = [r for r in all_results if r['success']]
    if successful_results:
        print(f"\n{'='*80}")
        print("OVERALL API SUMMARY")
        print(f"{'='*80}\n")

        total_requests = len(all_results)
        successful_requests = len(successful_results)
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0

        avg_time = sum(r['total_time'] for r in successful_results) / len(successful_results)
        avg_rtf = sum(r['rtf'] for r in successful_results) / len(successful_results)
        avg_throughput = sum(r['chars_per_sec'] for r in successful_results) / len(successful_results)
        avg_text_len = sum(r['text_length'] for r in successful_results) / len(successful_results)
        avg_audio_dur = sum(r['audio_duration'] for r in successful_results) / len(successful_results)

        print(f"Total requests: {total_requests}")
        print(f"Successful: {successful_requests} ({success_rate:.1f}%)")
        print(f"Failed: {total_requests - successful_requests}")
        print(f"Average text length: {avg_text_len:.0f} chars")
        print(f"Average audio duration: {avg_audio_dur:.2f}s")
        print()
        print(f"PERFORMANCE:")
        print(f"  Average API Response Time: {avg_time:.3f}s")
        print(f"  Average RTF: {avg_rtf:.3f} {'(faster than real-time)' if avg_rtf < 1.0 else '(slower than real-time)'}")
        print(f"  Average Throughput: {avg_throughput:.1f} chars/s")
        print()

        # Best/worst
        fastest = min(successful_results, key=lambda x: x['total_time'])
        slowest = max(successful_results, key=lambda x: x['total_time'])
        best_rtf = min(successful_results, key=lambda x: x['rtf'])
        worst_rtf = max(successful_results, key=lambda x: x['rtf'])

        print(f"EXTREMES:")
        print(f"  Fastest: {fastest['total_time']:.3f}s ({fastest['lang']} sentence {fastest['sentence_num']})")
        print(f"  Slowest: {slowest['total_time']:.3f}s ({slowest['lang']} sentence {slowest['sentence_num']})")
        print(f"  Best RTF: {best_rtf['rtf']:.3f} ({best_rtf['lang']} sentence {best_rtf['sentence_num']})")
        print(f"  Worst RTF: {worst_rtf['rtf']:.3f} ({worst_rtf['lang']} sentence {worst_rtf['sentence_num']})")
        print()
        print("="*80)
        print("API BENCHMARK COMPLETE")
        print("="*80)
        print(f"\nAll audio files saved to: {output_dir}")
    else:
        print("\n✗ No successful requests!")


if __name__ == "__main__":
    main()
