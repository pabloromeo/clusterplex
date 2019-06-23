FROM linuxserver/plex:arm32v7-latest

LABEL maintainer="pabloromeo"

COPY qemu-arm-static /usr/bin/

RUN echo "**** install runtime packages ****" && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get update && \
    echo "**** install Node.js ****" && \
    apt-get install -y nodejs && \
    echo "**** cleanup ****" && \
    rm -rf \
        /tmp/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENTRYPOINT []

CMD ["node", "worker.js"]

