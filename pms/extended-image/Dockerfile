FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

COPY /docker-mod/root/etc/ /etc/
COPY /app /app

RUN bash /etc/cont-init.d/92-install-dependencies && \
    bash /etc/cont-init.d/93-npm-install && \
    rm /etc/cont-init.d/92-install-dependencies && \
    rm /etc/cont-init.d/93-npm-install && \
    echo "**** cleanup ****" && \
    rm -rf \
        /tmp/* \
        /var/lib/apt/lists/* \
        /var/tmp/*

WORKDIR /
