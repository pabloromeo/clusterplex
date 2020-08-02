FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

RUN echo "**** install runtime packages ****" && \
    curl -sL https://deb.nodesource.com/setup_10.x | bash - && \
    apt-get update && \
    echo "**** install Node.js ****" && \
    apt-get install -y nodejs && \
    echo "**** install binutils ****" && \
    apt-get install -y binutils && \
    echo "**** cleanup ****" && \
    rm -rf \
        /tmp/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN chmod +x start.sh

ENTRYPOINT []

EXPOSE 3501

ENV PLEX_MEDIA_SERVER_INFO_MODEL="x86_64"

VOLUME /codecs

CMD ["/bin/sh", "-c", "/app/start.sh"]

