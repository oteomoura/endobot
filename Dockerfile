# Use an official Node.js LTS image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (optimizes caching)
COPY package.json package-lock.json ./

# Install dependencies
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

# Copy the entire source code (including /src and server.js)
COPY . .

# Expose the necessary port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
