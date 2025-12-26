"""
Full Pipeline Benchmark: ASR → Llama.cpp (LLM) → TTS (ONNX)
Measures latency, throughput, GPU/CPU utilization for the complete pipeline
Uses direct ONNX inference for TTS (fastest method)
"""

import asyncio
import aiohttp
import time
import json
import statistics
import threading
import psutil
import subprocess
import sys
import os
from pathlib import Path
from typing import Dict, List
import pandas as pd
import torch
from aiofiles import open as aio_open

# Add mangisoz_tts to path for imports
MANGISOZ_TTS_PATH = Path(r"C:\Users\slumi\Desktop\ISSAI_workspace\mangisoz_tts")
sys.path.insert(0, str(MANGISOZ_TTS_PATH))

# IMPORTANT: Setup espeak BEFORE importing TTS modules
import espeak_settings  # noqa: F401

from config import settings
from match_tts.models_onnx import load_onnx_models
from match_tts.tts_text import process_text_lang
import soundfile as sf

# API Configuration
ASR_API_URL = "http://localhost:8002/v1/audio/transcriptions"
ASR_MODEL = "issai/faster-whisper-mangisoz-best-10july2025-fp16"

LLM_API_URL = "http://localhost:8080/v1/chat/completions"
LLM_MODEL = "issai/Qolda"

# Generation parameters (same as in llamacpp benchmark)
MAX_TOKENS = 512
TEMPERATURE = 0.7

# System prompt for LLM (same as in llamacpp benchmark)
SYSTEM_PROMPT = """You are an expert multilingual assistant.
Supported languages: English, Russian, Kazakh.
Always respond in the user's language.
Always answer in one complete grammatical sentence.
Be concise.
Answer only what is asked.
No explanations, introductions, filler, or meta text."""

# Audio folder
AUDIO_FOLDER = Path("benchmark_pipeline/audio")

# ONNX TTS Configuration
USE_GPU_TTS = True  # Use GPU for TTS (fastest)
INTRA_OP_THREADS = 8
INTER_OP_THREADS = 8


class ResourceMonitor:
    """Monitor GPU and CPU utilization during inference"""

    def __init__(self):
        self.monitoring = False
        self.gpu_samples = []
        self.cpu_samples = []
        self.vram_samples = []
        self.ram_samples = []

    def start(self):
        """Start monitoring resources"""
        self.monitoring = True
        self.gpu_samples = []
        self.cpu_samples = []
        self.vram_samples = []
        self.ram_samples = []
        self.thread = threading.Thread(target=self._monitor)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        """Stop monitoring resources"""
        self.monitoring = False
        if hasattr(self, 'thread'):
            self.thread.join(timeout=2)

    def _monitor(self):
        """Monitor loop"""
        while self.monitoring:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            self.cpu_samples.append(cpu_percent)

            # Get RAM usage
            ram_percent = psutil.virtual_memory().percent
            self.ram_samples.append(ram_percent)

            # Get GPU usage and VRAM using nvidia-smi
            try:
                result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used',
                     '--format=csv,noheader,nounits'],
                    capture_output=True,
                    text=True,
                    timeout=1
                )
                if result.returncode == 0:
                    values = result.stdout.strip().split('\n')[0].split(',')
                    gpu_util = float(values[0].strip())
                    vram_used = float(values[1].strip())
                    self.gpu_samples.append(gpu_util)
                    self.vram_samples.append(vram_used)
            except:
                pass

            time.sleep(0.1)

    def get_stats(self) -> Dict:
        """Get average statistics"""
        return {
            'avg_gpu': sum(self.gpu_samples) / len(self.gpu_samples) if self.gpu_samples else 0,
            'max_gpu': max(self.gpu_samples) if self.gpu_samples else 0,
            'avg_cpu': sum(self.cpu_samples) / len(self.cpu_samples) if self.cpu_samples else 0,
            'max_cpu': max(self.cpu_samples) if self.cpu_samples else 0,
            'avg_vram': sum(self.vram_samples) / len(self.vram_samples) if self.vram_samples else 0,
            'max_vram': max(self.vram_samples) if self.vram_samples else 0,
            'avg_ram': sum(self.ram_samples) / len(self.ram_samples) if self.ram_samples else 0,
            'max_ram': max(self.ram_samples) if self.ram_samples else 0,
        }


def detect_language(text: str) -> str:
    """Detect language from text (kk, ru, or en)"""
    # Check for Cyrillic characters
    has_cyrillic = any('\u0400' <= c <= '\u04FF' for c in text)

    if not has_cyrillic:
        return 'en'

    # Kazakh-specific characters: ә, ғ, қ, ң, ө, ұ, ү, һ, і
    has_kazakh = any(c in text.lower() for c in 'әғқңөұүһі')

    return 'kk' if has_kazakh else 'ru'


class PipelineBenchmark:
    """Benchmark the full ASR → LLM → TTS pipeline"""

    def __init__(self, audio_folder: Path = AUDIO_FOLDER):
        self.audio_folder = audio_folder
        self.results = []
        self.tts_models = None
        self.tts_device = torch.device("cpu")  # Text processing always on CPU

    def initialize_tts(self):
        """Initialize ONNX TTS models"""
        print(f"\nLoading ONNX TTS models ({'GPU' if USE_GPU_TTS else 'CPU'} mode)...")

        # Save current directory
        original_dir = os.getcwd()

        try:
            # Change to mangisoz_tts directory so relative paths work
            os.chdir(MANGISOZ_TTS_PATH)

            self.tts_models = load_onnx_models(
                intra_op_num_threads=INTRA_OP_THREADS,
                inter_op_num_threads=INTER_OP_THREADS,
                use_gpu=USE_GPU_TTS,
            )
            print(f"ONNX TTS models loaded on {self.tts_models.device_type}!\n")
        finally:
            # Restore original directory
            os.chdir(original_dir)

    def get_audio_files(self) -> List[Path]:
        """Get all audio files from the folder"""
        audio_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
        audio_files = []

        for ext in audio_extensions:
            audio_files.extend(self.audio_folder.glob(f'*{ext}'))

        return sorted(audio_files)

    async def run_asr(self, session: aiohttp.ClientSession, audio_path: Path,
                      monitor: ResourceMonitor) -> Dict:
        """Step 1: Run ASR on audio file"""
        monitor.start()
        start_time = time.time()

        try:
            # Read audio file
            async with aio_open(audio_path, 'rb') as f:
                audio_data = await f.read()

            # Prepare form data
            form = aiohttp.FormData()
            form.add_field('model', ASR_MODEL)
            form.add_field('file', audio_data, filename=audio_path.name,
                          content_type='audio/wav')

            # Make API request
            async with session.post(ASR_API_URL, data=form) as response:
                if response.status == 200:
                    result = await response.json()
                    transcription = result.get('text', '')
                    latency = time.time() - start_time

                    monitor.stop()
                    stats = monitor.get_stats()

                    return {
                        'success': True,
                        'transcription': transcription,
                        'latency': latency,
                        'error': None,
                        **stats
                    }
                else:
                    error_text = await response.text()
                    monitor.stop()
                    return {
                        'success': False,
                        'transcription': '',
                        'latency': time.time() - start_time,
                        'error': f"HTTP {response.status}: {error_text}",
                        **monitor.get_stats()
                    }

        except Exception as e:
            monitor.stop()
            return {
                'success': False,
                'transcription': '',
                'latency': time.time() - start_time,
                'error': str(e),
                **monitor.get_stats()
            }

    async def run_llm(self, session: aiohttp.ClientSession, prompt: str,
                      monitor: ResourceMonitor) -> Dict:
        """Step 2: Run LLM inference on transcription"""
        monitor.start()
        start_time = time.time()
        first_token_time = None
        tokens_received = 0
        full_response = ""

        try:
            payload = {
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": MAX_TOKENS,
                "temperature": TEMPERATURE,
                "stream": True
            }

            async with session.post(LLM_API_URL, json=payload) as response:
                if response.status == 200:
                    async for line in response.content:
                        if line:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data_str = line[6:]
                                if data_str.strip() == '[DONE]':
                                    break
                                try:
                                    data = json.loads(data_str)
                                    if 'choices' in data and len(data['choices']) > 0:
                                        delta = data['choices'][0].get('delta', {})
                                        text = delta.get('content', '')
                                        if text:
                                            if first_token_time is None:
                                                first_token_time = time.time()
                                            full_response += text
                                            tokens_received += 1
                                except json.JSONDecodeError:
                                    pass

                    total_time = time.time() - start_time
                    ttft = first_token_time - start_time if first_token_time else 0
                    throughput = tokens_received / total_time if total_time > 0 else 0

                    monitor.stop()
                    stats = monitor.get_stats()

                    return {
                        'success': True,
                        'response': full_response,
                        'latency': total_time,
                        'ttft': ttft,
                        'tokens_generated': tokens_received,
                        'throughput': throughput,
                        'error': None,
                        **stats
                    }
                else:
                    error_text = await response.text()
                    monitor.stop()
                    return {
                        'success': False,
                        'response': '',
                        'latency': time.time() - start_time,
                        'ttft': 0,
                        'tokens_generated': 0,
                        'throughput': 0,
                        'error': f"HTTP {response.status}: {error_text}",
                        **monitor.get_stats()
                    }

        except Exception as e:
            monitor.stop()
            return {
                'success': False,
                'response': '',
                'latency': time.time() - start_time,
                'ttft': 0,
                'tokens_generated': 0,
                'throughput': 0,
                'error': str(e),
                **monitor.get_stats()
            }

    def run_tts_onnx(self, text: str, language: str, monitor: ResourceMonitor,
                     output_path: Path) -> Dict:
        """Step 3: Run TTS using ONNX models (direct inference)"""
        monitor.start()
        start_time = time.time()

        try:
            # Text processing
            text_start = time.time()
            processed = process_text_lang(0, language, text, self.tts_device)
            text_time = time.time() - text_start

            # Convert PyTorch tensors to NumPy for ONNX
            x_np = processed["x"].cpu().numpy()
            x_lengths_np = processed["x_lengths"].cpu().numpy()

            # ONNX inference (model + vocoder)
            inference_start = time.time()
            waveform, sample_rate = self.tts_models.synthesize(
                lang=language,
                x=x_np,
                x_lengths=x_lengths_np,
                speaker="male",
                n_timesteps=settings.steps,
                temperature=settings.temperature,
                length_scale=1.0,
            )
            inference_time = time.time() - inference_start

            # Save audio
            io_start = time.time()
            sf.write(str(output_path), waveform, sample_rate, subtype="PCM_16")
            io_time = time.time() - io_start

            # Calculate metrics
            total_time = time.time() - start_time
            audio_duration = len(waveform) / sample_rate
            rtf = total_time / audio_duration if audio_duration > 0 else 0

            monitor.stop()
            stats = monitor.get_stats()

            return {
                'success': True,
                'audio_duration': audio_duration,
                'audio_size': len(waveform) * 2,  # 16-bit samples
                'latency': total_time,
                'text_processing_time': text_time,
                'onnx_inference_time': inference_time,
                'io_time': io_time,
                'rtf': rtf,
                'error': None,
                **stats
            }

        except Exception as e:
            monitor.stop()
            return {
                'success': False,
                'audio_duration': 0,
                'audio_size': 0,
                'latency': time.time() - start_time,
                'text_processing_time': 0,
                'onnx_inference_time': 0,
                'io_time': 0,
                'rtf': 0,
                'error': str(e),
                **monitor.get_stats()
            }

    async def benchmark_single_audio(self, session: aiohttp.ClientSession,
                                    audio_path: Path, output_dir: Path) -> Dict:
        """Benchmark the full pipeline for a single audio file"""
        print(f"\n{'='*80}")
        print(f"Processing: {audio_path.name}")
        print(f"{'='*80}")

        pipeline_start = time.time()

        # Step 1: ASR
        print("\n[1/3] Running ASR...")
        asr_monitor = ResourceMonitor()
        asr_result = await self.run_asr(session, audio_path, asr_monitor)

        if not asr_result['success']:
            print(f"  ✗ ASR Failed: {asr_result['error']}")
            return {
                'audio_file': audio_path.name,
                'pipeline_success': False,
                'pipeline_latency': time.time() - pipeline_start,
                'asr': asr_result,
                'llm': {'success': False, 'error': 'ASR failed'},
                'tts': {'success': False, 'error': 'ASR failed'}
            }

        transcription = asr_result['transcription']
        language = detect_language(transcription)

        print(f"  ✓ ASR Success")
        print(f"    Latency: {asr_result['latency']:.3f}s")
        print(f"    GPU: {asr_result['avg_gpu']:.1f}% (max: {asr_result['max_gpu']:.1f}%)")
        print(f"    CPU: {asr_result['avg_cpu']:.1f}% (max: {asr_result['max_cpu']:.1f}%)")
        print(f"    VRAM: {asr_result['avg_vram']:.0f} MB (max: {asr_result['max_vram']:.0f} MB)")
        print(f"    Transcription: {transcription}")
        print(f"    Detected Language: {language}")

        # Step 2: LLM
        print("\n[2/3] Running LLM inference...")
        llm_monitor = ResourceMonitor()
        llm_result = await self.run_llm(session, transcription, llm_monitor)

        if not llm_result['success']:
            print(f"  ✗ LLM Failed: {llm_result['error']}")
            return {
                'audio_file': audio_path.name,
                'pipeline_success': False,
                'pipeline_latency': time.time() - pipeline_start,
                'asr': asr_result,
                'llm': llm_result,
                'tts': {'success': False, 'error': 'LLM failed'}
            }

        response_text = llm_result['response']

        print(f"  ✓ LLM Success")
        print(f"    Latency: {llm_result['latency']:.3f}s")
        print(f"    TTFT: {llm_result['ttft']:.3f}s")
        print(f"    Tokens: {llm_result['tokens_generated']}")
        print(f"    Throughput: {llm_result['throughput']:.2f} tok/s")
        print(f"    GPU: {llm_result['avg_gpu']:.1f}% (max: {llm_result['max_gpu']:.1f}%)")
        print(f"    CPU: {llm_result['avg_cpu']:.1f}% (max: {llm_result['max_cpu']:.1f}%)")
        print(f"    VRAM: {llm_result['avg_vram']:.0f} MB (max: {llm_result['max_vram']:.0f} MB)")
        print(f"    Response: {response_text}")

        # Step 3: TTS (ONNX)
        print("\n[3/3] Running TTS (ONNX)...")
        tts_monitor = ResourceMonitor()
        output_audio_path = output_dir / f"{audio_path.stem}_response.wav"
        tts_result = self.run_tts_onnx(response_text, language, tts_monitor, output_audio_path)

        if not tts_result['success']:
            print(f"  ✗ TTS Failed: {tts_result['error']}")
            return {
                'audio_file': audio_path.name,
                'pipeline_success': False,
                'pipeline_latency': time.time() - pipeline_start,
                'asr': asr_result,
                'llm': llm_result,
                'tts': tts_result
            }

        print(f"  ✓ TTS Success")
        print(f"    Latency: {tts_result['latency']:.3f}s")
        print(f"    Audio Duration: {tts_result['audio_duration']:.2f}s")
        print(f"    RTF: {tts_result['rtf']:.3f}")
        print(f"    Pipeline: text={tts_result['text_processing_time']:.3f}s, "
              f"onnx={tts_result['onnx_inference_time']:.3f}s, io={tts_result['io_time']:.3f}s")
        print(f"    GPU: {tts_result['avg_gpu']:.1f}% (max: {tts_result['max_gpu']:.1f}%)")
        print(f"    CPU: {tts_result['avg_cpu']:.1f}% (max: {tts_result['max_cpu']:.1f}%)")
        print(f"    VRAM: {tts_result['avg_vram']:.0f} MB (max: {tts_result['max_vram']:.0f} MB)")
        print(f"    Output: {output_audio_path.name}")

        # Calculate total pipeline metrics
        pipeline_latency = time.time() - pipeline_start

        print(f"\n{'='*80}")
        print(f"PIPELINE COMPLETE")
        print(f"  Total Latency: {pipeline_latency:.3f}s")
        print(f"  ASR: {asr_result['latency']:.3f}s ({asr_result['latency']/pipeline_latency*100:.1f}%)")
        print(f"  LLM: {llm_result['latency']:.3f}s ({llm_result['latency']/pipeline_latency*100:.1f}%)")
        print(f"  TTS: {tts_result['latency']:.3f}s ({tts_result['latency']/pipeline_latency*100:.1f}%)")
        print(f"{'='*80}")

        return {
            'audio_file': audio_path.name,
            'language': language,
            'pipeline_success': True,
            'pipeline_latency': pipeline_latency,
            'transcription': transcription,
            'llm_response': response_text,
            'output_audio': output_audio_path.name,
            'asr': asr_result,
            'llm': llm_result,
            'tts': tts_result
        }

    async def run_benchmark(self, output_dir: Path) -> List[Dict]:
        """Run benchmark on all audio files"""
        audio_files = self.get_audio_files()

        if not audio_files:
            print(f"No audio files found in {self.audio_folder}")
            return []

        print(f"{'='*80}")
        print(f"FULL PIPELINE BENCHMARK - ONNX TTS")
        print(f"{'='*80}")
        print(f"Audio files: {len(audio_files)}")
        print(f"Output directory: {output_dir}")
        print(f"ASR API: {ASR_API_URL}")
        print(f"LLM API: {LLM_API_URL}")
        print(f"TTS: Direct ONNX inference ({'GPU' if USE_GPU_TTS else 'CPU'})")

        # Initialize TTS models
        self.initialize_tts()

        # Create output directory
        output_dir.mkdir(exist_ok=True, parents=True)

        # Create session
        timeout = aiohttp.ClientTimeout(total=300)
        connector = aiohttp.TCPConnector(limit=1)

        results = []

        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            for audio_file in audio_files:
                result = await self.benchmark_single_audio(session, audio_file, output_dir)
                results.append(result)

        self.results = results
        return results

    def generate_report(self, results: List[Dict], output_file: Path):
        """Generate detailed benchmark report"""
        if not results:
            print("No results to report")
            return

        successful_results = [r for r in results if r['pipeline_success']]

        print(f"\n\n{'='*80}")
        print(f"BENCHMARK SUMMARY REPORT")
        print(f"{'='*80}\n")

        # Overall stats
        total = len(results)
        successful = len(successful_results)
        failed = total - successful
        success_rate = (successful / total * 100) if total > 0 else 0

        print(f"Total Tests: {total}")
        print(f"Successful: {successful} ({success_rate:.1f}%)")
        print(f"Failed: {failed}")
        print()

        if not successful_results:
            print("No successful pipeline runs to analyze")
            return

        # Latency statistics
        def calc_stats(values):
            if not values:
                return {'mean': 0, 'median': 0, 'min': 0, 'max': 0, 'std': 0}
            return {
                'mean': statistics.mean(values),
                'median': statistics.median(values),
                'min': min(values),
                'max': max(values),
                'std': statistics.stdev(values) if len(values) > 1 else 0
            }

        # Pipeline latencies
        pipeline_latencies = [r['pipeline_latency'] for r in successful_results]
        asr_latencies = [r['asr']['latency'] for r in successful_results]
        llm_latencies = [r['llm']['latency'] for r in successful_results]
        llm_ttfts = [r['llm']['ttft'] for r in successful_results]
        tts_latencies = [r['tts']['latency'] for r in successful_results]

        print(f"{'='*80}")
        print(f"LATENCY STATISTICS (seconds)")
        print(f"{'='*80}")
        print(f"{'Component':<20} {'Mean':<10} {'Median':<10} {'Min':<10} {'Max':<10} {'Std Dev':<10}")
        print(f"{'-'*80}")

        for name, values in [
            ('Pipeline (Total)', pipeline_latencies),
            ('ASR', asr_latencies),
            ('LLM (Total)', llm_latencies),
            ('LLM (TTFT)', llm_ttfts),
            ('TTS (ONNX)', tts_latencies)
        ]:
            stats = calc_stats(values)
            print(f"{name:<20} {stats['mean']:<10.3f} {stats['median']:<10.3f} "
                  f"{stats['min']:<10.3f} {stats['max']:<10.3f} {stats['std']:<10.3f}")

        # Component breakdown
        avg_asr = statistics.mean(asr_latencies)
        avg_llm = statistics.mean(llm_latencies)
        avg_tts = statistics.mean(tts_latencies)
        avg_pipeline = statistics.mean(pipeline_latencies)

        print(f"\n{'='*80}")
        print(f"COMPONENT BREAKDOWN (% of total pipeline time)")
        print(f"{'='*80}")
        print(f"  ASR: {avg_asr/avg_pipeline*100:.1f}%")
        print(f"  LLM: {avg_llm/avg_pipeline*100:.1f}%")
        print(f"  TTS: {avg_tts/avg_pipeline*100:.1f}%")

        # Resource utilization
        asr_gpu = [r['asr']['avg_gpu'] for r in successful_results]
        llm_gpu = [r['llm']['avg_gpu'] for r in successful_results]
        tts_gpu = [r['tts']['avg_gpu'] for r in successful_results]

        asr_cpu = [r['asr']['avg_cpu'] for r in successful_results]
        llm_cpu = [r['llm']['avg_cpu'] for r in successful_results]
        tts_cpu = [r['tts']['avg_cpu'] for r in successful_results]

        asr_vram = [r['asr']['avg_vram'] for r in successful_results]
        llm_vram = [r['llm']['avg_vram'] for r in successful_results]
        tts_vram = [r['tts']['avg_vram'] for r in successful_results]

        print(f"\n{'='*80}")
        print(f"RESOURCE UTILIZATION")
        print(f"{'='*80}")
        print(f"{'Component':<20} {'Avg GPU %':<15} {'Avg CPU %':<15} {'Avg VRAM (MB)':<15}")
        print(f"{'-'*80}")

        for name, gpu, cpu, vram in [
            ('ASR', asr_gpu, asr_cpu, asr_vram),
            ('LLM', llm_gpu, llm_cpu, llm_vram),
            ('TTS (ONNX)', tts_gpu, tts_cpu, tts_vram)
        ]:
            avg_gpu = statistics.mean(gpu) if gpu else 0
            avg_cpu = statistics.mean(cpu) if cpu else 0
            avg_vram = statistics.mean(vram) if vram else 0
            print(f"{name:<20} {avg_gpu:<15.1f} {avg_cpu:<15.1f} {avg_vram:<15.0f}")

        # LLM throughput
        llm_throughputs = [r['llm']['throughput'] for r in successful_results]
        llm_tokens = [r['llm']['tokens_generated'] for r in successful_results]

        print(f"\n{'='*80}")
        print(f"LLM STATISTICS")
        print(f"{'='*80}")
        print(f"  Average Tokens Generated: {statistics.mean(llm_tokens):.1f}")
        print(f"  Average Throughput: {statistics.mean(llm_throughputs):.2f} tok/s")
        print(f"  Average TTFT: {statistics.mean(llm_ttfts):.3f}s")

        # TTS RTF and breakdown
        tts_rtfs = [r['tts']['rtf'] for r in successful_results]
        tts_durations = [r['tts']['audio_duration'] for r in successful_results]
        tts_text_times = [r['tts']['text_processing_time'] for r in successful_results]
        tts_inference_times = [r['tts']['onnx_inference_time'] for r in successful_results]
        tts_io_times = [r['tts']['io_time'] for r in successful_results]

        print(f"\n{'='*80}")
        print(f"TTS STATISTICS (ONNX)")
        print(f"{'='*80}")
        print(f"  Average RTF: {statistics.mean(tts_rtfs):.3f}")
        print(f"  Average Audio Duration: {statistics.mean(tts_durations):.2f}s")
        print(f"  TTS Pipeline Breakdown:")
        print(f"    Text Processing: {statistics.mean(tts_text_times):.4f}s")
        print(f"    ONNX Inference: {statistics.mean(tts_inference_times):.4f}s")
        print(f"    I/O: {statistics.mean(tts_io_times):.4f}s")

        # Save detailed results to CSV
        flat_results = []
        for r in successful_results:
            flat_results.append({
                'audio_file': r['audio_file'],
                'language': r['language'],
                'pipeline_latency': r['pipeline_latency'],
                'transcription': r['transcription'],
                'llm_response': r['llm_response'],
                # ASR
                'asr_latency': r['asr']['latency'],
                'asr_gpu_avg': r['asr']['avg_gpu'],
                'asr_gpu_max': r['asr']['max_gpu'],
                'asr_cpu_avg': r['asr']['avg_cpu'],
                'asr_cpu_max': r['asr']['max_cpu'],
                'asr_vram_avg': r['asr']['avg_vram'],
                'asr_vram_max': r['asr']['max_vram'],
                # LLM
                'llm_latency': r['llm']['latency'],
                'llm_ttft': r['llm']['ttft'],
                'llm_tokens': r['llm']['tokens_generated'],
                'llm_throughput': r['llm']['throughput'],
                'llm_gpu_avg': r['llm']['avg_gpu'],
                'llm_gpu_max': r['llm']['max_gpu'],
                'llm_cpu_avg': r['llm']['avg_cpu'],
                'llm_cpu_max': r['llm']['max_cpu'],
                'llm_vram_avg': r['llm']['avg_vram'],
                'llm_vram_max': r['llm']['max_vram'],
                # TTS
                'tts_latency': r['tts']['latency'],
                'tts_rtf': r['tts']['rtf'],
                'tts_audio_duration': r['tts']['audio_duration'],
                'tts_text_processing': r['tts']['text_processing_time'],
                'tts_onnx_inference': r['tts']['onnx_inference_time'],
                'tts_io': r['tts']['io_time'],
                'tts_gpu_avg': r['tts']['avg_gpu'],
                'tts_gpu_max': r['tts']['max_gpu'],
                'tts_cpu_avg': r['tts']['avg_cpu'],
                'tts_cpu_max': r['tts']['max_cpu'],
                'tts_vram_avg': r['tts']['avg_vram'],
                'tts_vram_max': r['tts']['max_vram'],
            })

        df = pd.DataFrame(flat_results)
        csv_file = output_file.parent / f"{output_file.stem}.csv"
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        print(f"\n\nDetailed results saved to: {csv_file}")

        # Save JSON
        json_file = output_file.parent / f"{output_file.stem}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"Full results saved to: {json_file}")

        print(f"\n{'='*80}")
        print(f"BENCHMARK COMPLETE")
        print(f"{'='*80}\n")


async def main():
    """Main function"""
    from datetime import datetime

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_dir = Path(f"benchmark_pipeline/results/pipeline_output_{timestamp}")

    benchmark = PipelineBenchmark()
    results = await benchmark.run_benchmark(output_dir)

    # Generate report
    report_file = Path(f"benchmark_pipeline/results/pipeline_benchmark_{timestamp}")
    benchmark.generate_report(results, report_file)


if __name__ == "__main__":
    asyncio.run(main())
