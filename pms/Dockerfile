FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

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

RUN echo "**** Rename Plex's transcoder ****" && \
    mv /usr/lib/plexmediaserver/'Plex Transcoder' /usr/lib/plexmediaserver/originalTranscoder

COPY ["transcoder-shim.sh", "/usr/lib/plexmediaserver/Plex Transcoder"]

RUN chmod +x /usr/lib/plexmediaserver/'Plex Transcoder'

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

WORKDIR /

ENV PLEX_MEDIA_SERVER_INFO_MODEL="x86_64"
