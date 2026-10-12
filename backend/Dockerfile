# ==============================================================================
# Etapa 1: Compilación de TypeScript y generación de Prisma
# ==============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Instalar OpenSSL (requerido por el motor de Prisma)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src
RUN npm run build

# ==============================================================================
# Etapa 2: Imagen ligera de ejecución en producción
# ==============================================================================
FROM node:20-slim AS runner

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Carpeta para archivos y comprobantes locales
RUN mkdir -p uploads

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
