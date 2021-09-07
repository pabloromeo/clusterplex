FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

RUN echo "**** install runtime packages ****" && \
    echo "**** apt-get update ****" && \
    apt-get update && \
    echo "**** install binutils ****" && \
    apt-get install -y libatomic1 && \
    echo "**** install 'n' ****" && \
    curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n && \
    echo "**** install nodejs ****" && \
    bash n lts && \
    echo "**** cleanup ****" && \
    rm -rf \
        /tmp/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

RUN echo "**** Rename Plex's transcoder ****" && \
    mv /usr/lib/plexmediaserver/'Plex Transcoder' /usr/lib/plexmediaserver/originalTranscoder

COPY ["/app/transcoder-shim.sh", "/usr/lib/plexmediaserver/Plex Transcoder"]

RUN chmod +x /usr/lib/plexmediaserver/'Plex Transcoder'

WORKDIR /app
COPY /app/package*.json ./
RUN npm install

COPY /app .

WORKDIR /
