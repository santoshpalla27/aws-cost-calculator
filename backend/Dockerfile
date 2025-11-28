FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm nstall

COPY . .

RUN mkdir -p uploads logs

EXPOSE 3000

CMD ["node", "src/app.js"]