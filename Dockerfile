# Use an official Node.js LTS image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install system dependencies required for Node.js
RUN apt-get update && apt-get install -y wget && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies first (optimizes caching)
COPY package.json package-lock.json ./
RUN npm install

# Define a build argument to enable or disable embedding insertion
ARG ENABLE_EMBEDDING=false

# Copy the application source code
COPY . .

# Only run this logic if we need to insert new embeddings into the database
# and save memory resources on the server
RUN if [ "$ENABLE_EMBEDDING" = "true" ]; then \
      echo "🚀 Setting up embedding dependencies..."; \
      \
      # Install Python and required dependencies
      apt-get update && apt-get install -y python3-pip python3-venv && rm -rf /var/lib/apt/lists/* && \
      \
      # Set Hugging Face cache path
      export HF_HOME=/root/.cache/huggingface && \
      \
      # Create model directory and download necessary files
      mkdir -p $HF_HOME/hub/BAAI_bge-large-en-v1.5 && \
      cd $HF_HOME/hub/BAAI_bge-large-en-v1.5 && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/config.json && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer.json && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/tokenizer_config.json && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/special_tokens_map.json && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/vocab.txt && \
      wget -nc https://huggingface.co/BAAI/bge-large-en-v1.5/resolve/main/model.safetensors && \
      \
      # Install Python dependencies inside a virtual environment
      python3 -m venv /opt/venv && \
      export PATH="/opt/venv/bin:$PATH" && \
      pip install --no-cache-dir torch onnx onnxruntime transformers && \
      \
      # Run ONNX conversion
      python3 /usr/src/app/onnx_model_converter/script.py && \
      \
      # Validate that the ONNX model exists
      if [ ! -f $HF_HOME/hub/BAAI_bge-large-en-v1.5/onnx/model.onnx ]; then \
        echo "❌ ONNX model was not created successfully" && exit 1; \
      else \
        echo "✅ ONNX model was created successfully"; \
      fi \
    else \
      echo "⚠️ Skipping embedding setup (ENABLE_EMBEDDING=false)"; \
    fi

# Expose the necessary port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
