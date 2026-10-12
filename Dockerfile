# Multi-stage Docker build for ultra-lean production container with FFmpeg
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies (npm install - no lockfile strictly required)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install FFmpeg for video processing and aspect ratio conversions
RUN apk update && apk add --no-cache ffmpeg

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./.env.example

# Create storage directory for uploaded videos & data
RUN mkdir -p uploads data && chmod -R 777 uploads data

# Render injects PORT dynamically (defaulting to 10000 if not specified)
ENV PORT=10000
EXPOSE 10000

CMD ["node", "dist/server/index.js"]
