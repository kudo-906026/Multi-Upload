# Multi-stage Docker build for ultra-lean production container
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env.example ./.env.example

# Create storage directory for uploaded videos
RUN mkdir -p uploads data && chmod -R 777 uploads data

EXPOSE 8080

CMD ["node", "dist/server/index.js"]
