# Use an official Node.js LTS image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies, including python3-venv
RUN apt-get update && apt-get install -y python3-pip python3-venv wget && \
rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies first (optimizes caching)
COPY package.json package-lock.json ./
RUN npm install

# Set Hugging Face model cache path
ENV TRANSFORMERS_CACHE=/root/.cache/huggingface

# Create model directory and download necessary files
RUN mkdir -p $TRANSFORMERS_CACHE/hub/BAAI_bge-large-en-v1.5 && \
    cd $TRANSFORMERS_CACHE/hub/BAAI_bge-large-en-v1.5 && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/config.json && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer.json && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer_config.json && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/special_tokens_map.json && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/vocab.txt && \
    wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/model.safetensors

# Install Python and ONNX dependencies inside a virtual environment
RUN python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir \
    torch==2.6.0+cpu \
    onnx \
    onnxruntime \
    transformers \
    --extra-index-url https://download.pytorch.org/whl/cpu
# Copy the application source code
COPY . .

# Convert the model to ONNX format
RUN python3 /usr/src/app/onnx_model_converter/script.py

# Validate that the ONNX model exists
RUN if [ ! -f $TRANSFORMERS_CACHE/hub/BAAI_bge-large-en-v1.5/onnx/model.onnx ]; then \
  echo "❌ ONNX model was not created successfully" && exit 1; \
  else \
  echo "✅ ONNX model was created successfully"; \
  fi

# Expose the necessary port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
