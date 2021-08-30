FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

RUN echo "**** install runtime packages ****" && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
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

RUN echo "**** Rename Plex's executable ****" && \
    mv /usr/lib/plexmediaserver/'Plex Media Server' /usr/lib/plexmediaserver/pms_original

COPY ["/app/start.sh", "/usr/lib/plexmediaserver/Plex Media Server"]

RUN chmod +x /usr/lib/plexmediaserver/'Plex Media Server'

WORKDIR /app

COPY /app/package*.json ./
RUN npm install

COPY /app .

EXPOSE 3501

VOLUME /codecs

