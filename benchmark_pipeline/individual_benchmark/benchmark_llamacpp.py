"""
llama.cpp Inference Benchmark for Qolda Model
Measures TTFT, Total Time, Tokens Generated, Throughput, GPU/CPU Utilization
"""

import requests
import time
import json
import threading
import psutil
import subprocess
import statistics

# Configuration
API_URL = "http://localhost:8080/v1/chat/completions"
MODEL_NAME = "issai/Qolda"

# Test questions
TEST_QUESTIONS = [
    # Kazakh
    "Қазақстанның астанасы қай қала?",
    "Назарбаев Университеті қай жерде орналасқан?",
    "Сенің атың кім?",
    "144 санының түбірі неше?",
    "12ге 18 қоссақ, қанша болады?",
    "Мадрид қай мемлекетте орналасқан?",
    "Қандай жануар түрлері бар?",

    # English
    "Who is the current president of the United States?",
    "How many continents are there in the world?",
    "What is the largest ocean on Earth?",
    "What does CPU stand for?",
    "How many bytes are in a kilobyte?",

    # Russian
    "Какая планета находится ближе всего к Солнцу?",
    "Сколько минут в одном часе?",
    "Как называется самая длинная река в мире?",
    "Что такое искусственный интеллект?",
    "В каком году началась Вторая мировая война?"
]
# Generation parameters
MAX_TOKENS = 512
TEMPERATURE = 0.7

# System prompt
SYSTEM_PROMPT = """You are an expert multilingual assistant.
Supported languages: English, Russian, Kazakh.
Always respond in the user's language.
Always answer in one complete grammatical sentence.
Be concise.
Answer only what is asked.
No explanations, introductions, filler, or meta text."""


class GPUMonitor:
    """Monitor GPU and CPU utilization during inference"""
    def __init__(self):
        self.monitoring = False
        self.gpu_samples = []
        self.cpu_samples = []
        self.vram_samples = []

    def start(self):
        self.monitoring = True
        self.gpu_samples = []
        self.cpu_samples = []
        self.vram_samples = []
        self.thread = threading.Thread(target=self._monitor)
        self.thread.start()

    def stop(self):
        self.monitoring = False
        if hasattr(self, 'thread'):
            self.thread.join()

    def _monitor(self):
        while self.monitoring:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            self.cpu_samples.append(cpu_percent)

            # Get GPU usage and VRAM using nvidia-smi
            try:
                result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used', '--format=csv,noheader,nounits'],
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

    def get_stats(self):
        avg_gpu = sum(self.gpu_samples) / len(self.gpu_samples) if self.gpu_samples else 0
        avg_cpu = sum(self.cpu_samples) / len(self.cpu_samples) if self.cpu_samples else 0
        avg_vram = sum(self.vram_samples) / len(self.vram_samples) if self.vram_samples else 0
        return avg_gpu, avg_cpu, avg_vram


def benchmark_inference(prompt: str):
    """Run single inference and collect metrics"""
    monitor = GPUMonitor()

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": MAX_TOKENS,
        "temperature": TEMPERATURE,
        "stream": True
    }

    monitor.start()
    start_time = time.time()
    first_token_time = None
    tokens_received = 0
    full_response = ""

    try:
        response = requests.post(API_URL, json=payload, stream=True, timeout=60)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
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
        monitor.stop()
        avg_gpu, avg_cpu, avg_vram = monitor.get_stats()

        ttft = first_token_time - start_time if first_token_time else 0
        throughput = tokens_received / total_time if total_time > 0 else 0

        return {
            "success": True,
            "ttft": ttft,
            "total_time": total_time,
            "tokens_generated": tokens_received,
            "throughput": throughput,
            "gpu_util": avg_gpu,
            "cpu_util": avg_cpu,
            "vram_used": avg_vram,
            "response": full_response
        }
    except Exception as e:
        monitor.stop()
        return {"success": False, "error": str(e)}


def calculate_statistics(values):
    """Calculate mean, median, and standard deviation"""
    if not values:
        return {"mean": 0, "median": 0, "std_dev": 0}

    return {
        "mean": statistics.mean(values),
        "median": statistics.median(values),
        "std_dev": statistics.stdev(values) if len(values) > 1 else 0
    }


def main():
    print("="*70)
    print("llama.cpp Benchmark for Qolda Model")
    print("="*70)
    print(f"API Endpoint: {API_URL}")
    print(f"Number of test questions: {len(TEST_QUESTIONS)}")
    print(f"Max tokens per response: {MAX_TOKENS}\n")

    all_results = []

    # Run benchmark for each question
    for i, question in enumerate(TEST_QUESTIONS, 1):
        print(f"\n[{i}/{len(TEST_QUESTIONS)}] Testing: {question}")
        result = benchmark_inference(question)

        if result["success"]:
            all_results.append(result)
            print(f"  ✓ TTFT: {result['ttft']:.3f}s | Total: {result['total_time']:.3f}s | "
                  f"Tokens: {result['tokens_generated']} | Throughput: {result['throughput']:.2f} tok/s")
            print(f"  ✓ GPU: {result['gpu_util']:.1f}% | CPU: {result['cpu_util']:.1f}% | VRAM: {result['vram_used']:.0f} MB")
            print(f"  Response: {result['response']}")
        else:
            print(f"  ❌ FAILED: {result['error']}")

    # Calculate statistics
    if all_results:
        print(f"\n{'='*70}")
        print("STATISTICAL SUMMARY")
        print(f"{'='*70}\n")

        metrics = {
            "TTFT (seconds)": [r["ttft"] for r in all_results],
            "Total Time (seconds)": [r["total_time"] for r in all_results],
            "Tokens Generated": [r["tokens_generated"] for r in all_results],
            "Throughput (tok/s)": [r["throughput"] for r in all_results],
            "GPU Utilization (%)": [r["gpu_util"] for r in all_results],
            "CPU Utilization (%)": [r["cpu_util"] for r in all_results],
            "VRAM Used (MB)": [r["vram_used"] for r in all_results]
        }

        print(f"{'Metric':<25} {'Mean':<12} {'Median':<12} {'Std Dev':<12}")
        print("-" * 70)

        for metric_name, values in metrics.items():
            stats = calculate_statistics(values)
            print(f"{metric_name:<25} {stats['mean']:<12.3f} {stats['median']:<12.3f} {stats['std_dev']:<12.3f}")

        print(f"\n{'='*70}")
        print(f"Successfully completed {len(all_results)}/{len(TEST_QUESTIONS)} benchmarks")
        print(f"{'='*70}")
    else:
        print("\n❌ No successful benchmarks completed")


if __name__ == "__main__":
    main()
