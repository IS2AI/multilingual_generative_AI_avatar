"""
ASR Benchmarking Script for http://localhost:8002/
Tests audio files from benchmark_audio folder
"""

import asyncio
import aiohttp
import time
import json
import os
from pathlib import Path
from typing import List, Dict
import pandas as pd
from tqdm.asyncio import tqdm as async_tqdm
from aiofiles import open as aio_open


class ASRBenchmark:
    """Benchmark ASR API with audio files from benchmark_audio folder."""

    def __init__(self,
                 api_url: str = "http://localhost:8002/v1/audio/transcriptions",
                 audio_folder: str = "benchmark_audio",
                 max_concurrent: int = 5,
                 model: str = "issai/faster-whisper-mangisoz-best-10july2025-fp16"):
        """
        Initialize the ASR benchmark.

        Args:
            api_url: The ASR API endpoint URL
            audio_folder: Path to folder containing benchmark audio files
            max_concurrent: Maximum number of concurrent API requests
            model: Model name to use for transcription
        """
        self.api_url = api_url
        self.audio_folder = Path(audio_folder)
        self.max_concurrent = max_concurrent
        self.model = model
        self.semaphore = asyncio.Semaphore(max_concurrent)

        # Results storage
        self.results = []
        self.errors = []

    def get_audio_files(self) -> List[Path]:
        """Get all audio files from the benchmark folder."""
        audio_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
        audio_files = []

        for ext in audio_extensions:
            audio_files.extend(self.audio_folder.glob(f'*{ext}'))

        return sorted(audio_files)

    async def transcribe_audio(self, session: aiohttp.ClientSession,
                               audio_path: Path) -> Dict:
        """
        Transcribe a single audio file.

        Args:
            session: aiohttp client session
            audio_path: Path to the audio file

        Returns:
            Dictionary with transcription results and metrics
        """
        async with self.semaphore:
            start_time = time.time()

            try:
                # Read audio file
                async with aio_open(audio_path, 'rb') as f:
                    audio_data = await f.read()

                # Prepare form data
                form = aiohttp.FormData()
                form.add_field('model', self.model)
                form.add_field('file',
                             audio_data,
                             filename=audio_path.name,
                             content_type='audio/wav')

                # Make API request
                async with session.post(self.api_url, data=form) as response:
                    end_time = time.time()
                    latency = end_time - start_time

                    if response.status == 200:
                        result = await response.json()
                        transcription = result.get('text', '')

                        return {
                            'filename': audio_path.name,
                            'status': 'success',
                            'transcription': transcription,
                            'latency_seconds': latency,
                            'file_size_bytes': len(audio_data),
                            'language': self._extract_language(audio_path.name),
                            'error': None
                        }
                    else:
                        error_text = await response.text()
                        return {
                            'filename': audio_path.name,
                            'status': 'failed',
                            'transcription': '',
                            'latency_seconds': latency,
                            'file_size_bytes': len(audio_data),
                            'language': self._extract_language(audio_path.name),
                            'error': f"HTTP {response.status}: {error_text}"
                        }

            except Exception as e:
                end_time = time.time()
                latency = end_time - start_time

                return {
                    'filename': audio_path.name,
                    'status': 'error',
                    'transcription': '',
                    'latency_seconds': latency,
                    'file_size_bytes': 0,
                    'language': self._extract_language(audio_path.name),
                    'error': str(e)
                }

    def _extract_language(self, filename: str) -> str:
        """Extract language code from filename (e.g., en_sentence_01.wav -> en)."""
        parts = filename.split('_')
        if len(parts) > 0:
            return parts[0]
        return 'unknown'

    async def run_benchmark(self) -> pd.DataFrame:
        """
        Run the benchmark on all audio files.

        Returns:
            DataFrame with benchmark results
        """
        # Get all audio files
        audio_files = self.get_audio_files()

        if not audio_files:
            print(f"No audio files found in {self.audio_folder}")
            return pd.DataFrame()

        print(f"Found {len(audio_files)} audio files")
        print(f"API URL: {self.api_url}")
        print(f"Max concurrent requests: {self.max_concurrent}")
        print(f"\nStarting benchmark...\n")

        # Create aiohttp session
        timeout = aiohttp.ClientTimeout(total=300)  # 5 minutes per request
        connector = aiohttp.TCPConnector(limit=self.max_concurrent)

        async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
            # Create tasks for all audio files
            tasks = [
                self.transcribe_audio(session, audio_file)
                for audio_file in audio_files
            ]

            # Process with progress bar
            results = []
            for coro in async_tqdm(asyncio.as_completed(tasks),
                                  total=len(tasks),
                                  desc="Processing audio files"):
                result = await coro
                results.append(result)

        # Store results
        self.results = results

        # Create DataFrame
        df = pd.DataFrame(results)

        return df

    def print_summary(self, df: pd.DataFrame):
        """Print benchmark summary statistics."""
        print("\n" + "="*80)
        print("BENCHMARK SUMMARY")
        print("="*80)

        if df.empty:
            print("No results to display")
            return

        # Overall statistics
        total_files = len(df)
        successful = len(df[df['status'] == 'success'])
        failed = len(df[df['status'] == 'failed'])
        errors = len(df[df['status'] == 'error'])

        print(f"\nOverall Statistics:")
        print(f"  Total files: {total_files}")
        print(f"  Successful: {successful} ({successful/total_files*100:.1f}%)")
        print(f"  Failed: {failed} ({failed/total_files*100:.1f}%)")
        print(f"  Errors: {errors} ({errors/total_files*100:.1f}%)")

        # Latency statistics (only for successful requests)
        success_df = df[df['status'] == 'success']
        if not success_df.empty:
            print(f"\nLatency Statistics (successful requests only):")
            print(f"  Mean: {success_df['latency_seconds'].mean():.3f}s")
            print(f"  Median: {success_df['latency_seconds'].median():.3f}s")
            print(f"  Min: {success_df['latency_seconds'].min():.3f}s")
            print(f"  Max: {success_df['latency_seconds'].max():.3f}s")
            print(f"  Std Dev: {success_df['latency_seconds'].std():.3f}s")

        # Per-language statistics
        if 'language' in df.columns:
            print(f"\nPer-Language Statistics:")
            lang_stats = df.groupby('language').agg({
                'status': lambda x: (x == 'success').sum(),
                'latency_seconds': ['mean', 'median']
            }).round(3)
            print(lang_stats)

        # Show errors if any
        error_df = df[df['error'].notna()]
        if not error_df.empty:
            print(f"\nErrors encountered:")
            for idx, row in error_df.iterrows():
                print(f"  {row['filename']}: {row['error']}")

        # Transcription samples
        print(f"\nSample Transcriptions:")
        sample_df = success_df.head(5)
        for idx, row in sample_df.iterrows():
            print(f"  [{row['language']}] {row['filename']}:")
            print(f"    {row['transcription'][:100]}...")

        print("\n" + "="*80)

    def save_results(self, df: pd.DataFrame, output_file: str = "benchmark_results.csv"):
        """Save benchmark results to CSV file."""
        df.to_csv(output_file, index=False, encoding='utf-8-sig')
        print(f"\nResults saved to: {output_file}")

        # Also save detailed JSON
        json_file = output_file.replace('.csv', '.json')
        df.to_json(json_file, orient='records', indent=2, force_ascii=False)
        print(f"Detailed results saved to: {json_file}")


async def main():
    """Main function to run the benchmark."""
    # Initialize benchmark
    benchmark = ASRBenchmark(
        api_url="http://localhost:8002/v1/audio/transcriptions",
        audio_folder="benchmark_audio",
        max_concurrent=5,  # Adjust based on your server capacity
        model="issai/faster-whisper-mangisoz-best-10july2025-fp16"
    )

    # Run benchmark
    start_time = time.time()
    results_df = await benchmark.run_benchmark()
    total_time = time.time() - start_time

    # Print summary
    benchmark.print_summary(results_df)

    # Print total time
    print(f"\nTotal benchmark time: {total_time:.2f}s")
    if len(results_df) > 0:
        print(f"Average time per file: {total_time/len(results_df):.2f}s")
        print(f"Throughput: {len(results_df)/total_time:.2f} files/second")

    # Save results
    benchmark.save_results(results_df)

    return results_df


if __name__ == "__main__":
    # Run the benchmark
    results = asyncio.run(main())
