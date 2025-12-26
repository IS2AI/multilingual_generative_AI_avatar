@echo off
REM Run the full pipeline benchmark using the mangisoz_tts virtual environment

echo ================================================================================
echo FULL PIPELINE BENCHMARK
echo ================================================================================
echo.
echo Setting up CUDA environment...
echo.

REM Add CUDA to PATH for GPU inference
set "CUDA_PATH=C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.6"
set "PATH=%CUDA_PATH%\bin;%CUDA_PATH%\libnvvp;%PATH%"

echo Activating mangisoz_tts virtual environment...
echo.

cd /d C:\Users\slumi\Desktop\ISSAI_workspace\mangisoz_tts

REM Activate the virtual environment and run the benchmark
call .venv\Scripts\activate.bat

REM Change back to the benchmark directory
cd /d C:\Users\slumi\Desktop\ISSAI_workspace\small_llm_avatar

REM Run the benchmark script
python benchmark_pipeline\benchmark_full_pipeline.py

REM Deactivate virtual environment
call deactivate

echo.
echo ================================================================================
echo BENCHMARK COMPLETE
echo ================================================================================

pause
