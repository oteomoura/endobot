# Use an official Node.js LTS image
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /app

# Install minimal dependencies
RUN apt-get update -y && \
    apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript files
RUN npm run build

# Expose port
EXPOSE 3000

# Show directory structure for debugging
RUN echo "TypeScript compiled files:" && ls -la dist

# Start the application
CMD ["npm", "start"]