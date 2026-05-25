FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Cài đặt package.json
COPY package*.json ./
RUN npm ci || npm install

# Copy source code và build
COPY . .
RUN npm run build

# Runner: chạy NextJS ở chế độ standalone (vì đã setup trong next.config.ts)
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy các file public và file build standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

# Chạy Next.js server bằng standalone
CMD ["node", "server.js"]
