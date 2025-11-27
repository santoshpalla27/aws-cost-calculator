FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

# Install serve to serve the static files
RUN npm install -g serve

# Copy the build output from the previous step
COPY --from=builder /app/out ./out

EXPOSE 3001

CMD ["serve", "-s", "out", "-l", "3001"]