# Use an official Node.js LTS image as the base
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (optimizes caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the entire source code (including /src and server.js)
COPY . .

# Expose the necessary port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
