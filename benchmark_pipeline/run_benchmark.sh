#!/bin/bash
# Run the full pipeline benchmark using the mangisoz_tts virtual environment

echo "================================================================================"
echo "FULL PIPELINE BENCHMARK"
echo "================================================================================"
echo ""
echo "Activating mangisoz_tts virtual environment..."
echo ""

cd /c/Users/slumi/Desktop/ISSAI_workspace/mangisoz_tts

# Activate the virtual environment
source .venv/Scripts/activate

# Change back to the benchmark directory
cd /c/Users/slumi/Desktop/ISSAI_workspace/small_llm_avatar

# Run the benchmark script
python benchmark_pipeline/benchmark_full_pipeline.py

# Deactivate virtual environment
deactivate

echo ""
echo "================================================================================"
echo "BENCHMARK COMPLETE"
echo "================================================================================"
