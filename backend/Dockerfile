# Base image suitable for Puppeteer
FROM node:20-alpine

# Install Chromium and its OS dependencies required by whatsapp-web.js
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm

# Tell Puppeteer to skip downloading its own Chrome and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set Working Directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies (including whatsapp-web.js, express, etc)
RUN npm install

# Copy application source code
COPY . .

# Create the data and session directories expected by the app so volume mounting works cleanly
RUN mkdir -p data .wwebjs_auth

# Expose backend port
EXPOSE 8080

# Start server
CMD ["node", "src/index.js"]
