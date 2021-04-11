FROM node:slim

LABEL maintainer="pabloromeo"

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3500

CMD ["node", "server.js"]

