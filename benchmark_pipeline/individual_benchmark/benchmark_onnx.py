"""
ONNX TTS Benchmark Script
Benchmarks ONNX-optimized TTS with parallelism (intra_op_num_threads=20)
"""
from __future__ import annotations

import os
import sys
import time
import numpy as np
from pathlib import Path
from datetime import datetime

# Add parent directory to path to import modules
sys.path.insert(0, str(Path(__file__).parent))

# IMPORTANT: Setup espeak BEFORE importing any TTS modules
import espeak_settings  # noqa: F401

from loguru import logger
from config import settings
from match_tts.models_onnx import load_onnx_models
from match_tts.tts_text import process_text_lang
import torch  # Still needed for text processing

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


def benchmark_sentence(models, device, lang, text, sentence_num, output_dir):
    """Benchmark a single sentence using ONNX models."""
    import soundfile as sf

    start_time = time.perf_counter()

    # Text processing (still uses PyTorch)
    text_start = time.perf_counter()
    processed = process_text_lang(0, lang, text, device)
    text_time = time.perf_counter() - text_start

    # Convert PyTorch tensors to NumPy for ONNX
    x_np = processed["x"].cpu().numpy()
    x_lengths_np = processed["x_lengths"].cpu().numpy()

    # Model inference + Vocoder (ONNX)
    inference_start = time.perf_counter()
    waveform, sample_rate = models.synthesize(
        lang=lang,
        x=x_np,
        x_lengths=x_lengths_np,
        speaker="male",
        n_timesteps=settings.steps,
        temperature=settings.temperature,
        length_scale=1.0,
    )
    inference_time = time.perf_counter() - inference_start

    # Save audio to file
    io_start = time.perf_counter()
    audio_filename = f"{lang}_sentence_{sentence_num:02d}.wav"
    audio_path = output_dir / audio_filename
    sf.write(str(audio_path), waveform, sample_rate, subtype="PCM_16")
    io_time = time.perf_counter() - io_start

    # Calculate metrics
    total_time = time.perf_counter() - start_time
    audio_duration = len(waveform) / sample_rate
    rtf = total_time / audio_duration
    chars_per_sec = len(text) / total_time

    return {
        'sentence_num': sentence_num,
        'lang': lang,
        'text_length': len(text),
        'audio_duration': audio_duration,
        'text_processing_time': text_time,
        'onnx_inference_time': inference_time,  # Combined model + vocoder
        'io_time': io_time,
        'total_time': total_time,
        'rtf': rtf,
        'chars_per_sec': chars_per_sec,
        'audio_file': audio_filename,
    }


def main():
    """Run ONNX benchmark."""
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Create output directory for audio files
    output_dir = Path(f"benchmark_onnx_audio_{timestamp_str}")
    output_dir.mkdir(exist_ok=True)

    # CONFIGURATION: Change these settings
    USE_GPU = False   # Set to True to use GPU, False to use CPU

    device_str = "GPU" if USE_GPU else "CPU"

    print("="*80)
    print(f"TTS BENCHMARK - ONNX OPTIMIZED ({device_str})")
    print("="*80)
    print(f"Audio output directory: {output_dir}")
    print()

    # Device for text processing (still uses PyTorch on CPU)
    device = torch.device("cpu")
    print(f"Text processing device: {device}")
    print(f"CPU cores: {os.cpu_count()}")
    print()

    # Load ONNX models with specified device
    print(f"Loading ONNX models ({device_str} mode)...")
    models = load_onnx_models(
        intra_op_num_threads=8,
        inter_op_num_threads=8,
        use_gpu=USE_GPU,
    )
    print(f"ONNX inference device: {models.device_type}")
    print("ONNX models loaded!\n")

    # Results storage
    all_results = []

    # Run benchmarks
    for lang, sentences in TEST_SENTENCES.items():
        if lang not in models.models:
            print(f"Skipping {lang} - ONNX model not available\n")
            continue

        print(f"\n{'='*80}")
        print(f"LANGUAGE: {lang.upper()}")
        print(f"{'='*80}\n")

        lang_results = []

        for i, text in enumerate(sentences, 1):
            text_preview = text[:60] if text.isascii() else f"<{lang} text, {len(text)} chars>"
            print(f"[{i}/{len(sentences)}] Benchmarking...")
            print(f"  Text: {text_preview}{'...' if len(text) > 60 else ''}")

            try:
                result = benchmark_sentence(models, device, lang, text, i, output_dir)
                lang_results.append(result)
                all_results.append(result)

                print(f"  Length: {result['text_length']} chars")
                print(f"  Audio: {result['audio_duration']:.2f}s")
                print(f"  Total Time: {result['total_time']:.3f}s")
                print(f"  RTF: {result['rtf']:.3f}")
                print(f"  Throughput: {result['chars_per_sec']:.1f} chars/s")
                print(f"  Pipeline: text={result['text_processing_time']:.3f}s, "
                      f"onnx_inference={result['onnx_inference_time']:.3f}s, "
                      f"io={result['io_time']:.3f}s")
                print(f"  Audio saved: {result['audio_file']}")
                print()

            except Exception as e:
                print(f"  [FAILED] {e}\n")
                logger.exception(f"Benchmark failed for sentence {i}")

        # Language summary
        if lang_results:
            avg_time = sum(r['total_time'] for r in lang_results) / len(lang_results)
            avg_rtf = sum(r['rtf'] for r in lang_results) / len(lang_results)
            avg_throughput = sum(r['chars_per_sec'] for r in lang_results) / len(lang_results)

            print(f"{'-'*80}")
            print(f"{lang.upper()} SUMMARY:")
            print(f"  Sentences: {len(lang_results)}")
            print(f"  Avg Latency: {avg_time:.3f}s")
            print(f"  Avg RTF: {avg_rtf:.3f}")
            print(f"  Avg Throughput: {avg_throughput:.1f} chars/s")
            print(f"{'-'*80}\n")

    # Overall summary
    if all_results:
        print(f"\n{'='*80}")
        print(f"OVERALL SUMMARY - ONNX OPTIMIZED ({models.device_type})")
        print(f"{'='*80}\n")

        total_sentences = len(all_results)
        avg_time = sum(r['total_time'] for r in all_results) / total_sentences
        avg_rtf = sum(r['rtf'] for r in all_results) / total_sentences
        avg_throughput = sum(r['chars_per_sec'] for r in all_results) / total_sentences
        avg_text_len = sum(r['text_length'] for r in all_results) / total_sentences
        avg_audio_dur = sum(r['audio_duration'] for r in all_results) / total_sentences

        # Pipeline breakdown
        avg_text_proc = sum(r['text_processing_time'] for r in all_results) / total_sentences
        avg_onnx = sum(r['onnx_inference_time'] for r in all_results) / total_sentences
        avg_io = sum(r['io_time'] for r in all_results) / total_sentences

        print(f"Total sentences tested: {total_sentences}")
        print(f"Average text length: {avg_text_len:.0f} chars")
        print(f"Average audio duration: {avg_audio_dur:.2f}s")
        print()
        print(f"PERFORMANCE:")
        print(f"  Average Latency: {avg_time:.3f}s")
        print(f"  Average RTF: {avg_rtf:.3f} {'(faster than real-time)' if avg_rtf < 1.0 else '(slower than real-time)'}")
        print(f"  Average Throughput: {avg_throughput:.1f} chars/s")
        print()
        print(f"PIPELINE BREAKDOWN:")
        print(f"  Text Processing: {avg_text_proc:.4f}s ({avg_text_proc/avg_time*100:.1f}%)")
        print(f"  ONNX Inference (Model+Vocoder): {avg_onnx:.4f}s ({avg_onnx/avg_time*100:.1f}%)")
        print(f"  I/O: {avg_io:.4f}s ({avg_io/avg_time*100:.1f}%)")
        print()

        # Best/worst
        fastest = min(all_results, key=lambda x: x['total_time'])
        slowest = max(all_results, key=lambda x: x['total_time'])
        best_rtf = min(all_results, key=lambda x: x['rtf'])
        worst_rtf = max(all_results, key=lambda x: x['rtf'])

        print(f"EXTREMES:")
        print(f"  Fastest: {fastest['total_time']:.3f}s ({fastest['lang']} sentence {fastest['sentence_num']})")
        print(f"  Slowest: {slowest['total_time']:.3f}s ({slowest['lang']} sentence {slowest['sentence_num']})")
        print(f"  Best RTF: {best_rtf['rtf']:.3f} ({best_rtf['lang']} sentence {best_rtf['sentence_num']})")
        print(f"  Worst RTF: {worst_rtf['rtf']:.3f} ({worst_rtf['lang']} sentence {worst_rtf['sentence_num']})")
        print()
        print("="*80)
        print("ONNX BENCHMARK COMPLETE")
        print("="*80)
        print(f"\nAll audio files saved to: {output_dir}")


if __name__ == "__main__":
    main()
