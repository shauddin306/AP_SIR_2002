FROM python:3.12-slim

# Install system dependencies for OpenCV and other libraries
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    wget \
    tar \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Download and install llama.cpp prebuilt binaries for Surya OCR
RUN mkdir -p /opt/llama && \
    wget -qO- https://github.com/ggml-org/llama.cpp/releases/download/b9581/llama-b9581-bin-ubuntu-x64.tar.gz | \
    tar -xz --strip-components=1 -C /opt/llama && \
    chmod +x /opt/llama/llama-server

ENV LLAMA_CPP_BINARY=/opt/llama/llama-server
ENV LD_LIBRARY_PATH=/opt/llama:$LD_LIBRARY_PATH

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
# Using --no-cache-dir reduces image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Railway provides the PORT environment variable
EXPOSE 8000

# Start via Python so PORT env var is read properly (shell expansion is unreliable in Docker)
CMD ["python", "main.py"]
