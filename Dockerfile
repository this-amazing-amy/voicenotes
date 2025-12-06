FROM node:20-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && apt-get clean

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./

# Install all dependencies including dev dependencies for building
RUN npm ci

# Copy source code
COPY tsconfig.json build.js ./
COPY src/ ./src/

# Set Docker environment flag
ENV DOCKER_ENVIRONMENT=true

# Build the application
RUN npm run build && npm run bundle

# Prune dev dependencies
RUN npm prune --omit=dev

# Create directories for mounting volumes
RUN mkdir -p /app/config

# Create a volume for env file and service account json
VOLUME /app/config

# Start the application
CMD ["node", "out/main.js"] 