FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 4000

# On boot: apply migrations, seed (idempotent), then start
CMD sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/index.ts"
