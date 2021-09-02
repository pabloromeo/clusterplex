FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

RUN echo "**** install runtime packages ****" && \
    echo "**** apt-get update ****" && \
    apt-get update && \
    echo "**** install binutils ****" && \
    apt-get install -y binutils libatomic1 && \
    echo "**** install 'n' ****" && \
    curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o n && \
    echo "**** install nodejs ****" && \
    bash n lts && \
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

