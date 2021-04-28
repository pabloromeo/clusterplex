FROM node:lts-slim

LABEL maintainer="pabloromeo"

RUN apt-get update && apt-get install curl -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3500

CMD ["node", "server.js"]

