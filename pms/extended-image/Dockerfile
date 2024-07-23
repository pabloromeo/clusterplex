FROM linuxserver/plex:latest

LABEL maintainer="pabloromeo"

COPY /docker-mod/root/etc/ /etc/
COPY /app /app

RUN bash /etc/s6-overlay/s6-rc.d/1-install-dependencies/run && \
    bash /etc/s6-overlay/s6-rc.d/2-npm-install/run && \
    rm -rf /etc/s6-overlay/s6-rc.d/1-install-dependencies && \
    rm -rf /etc/s6-overlay/s6-rc.d/2-npm-install && \
    rm -rf /etc/s6-overlay/s6-rc.d/3-install-transcoder-shim/dependencies.d && \
    rm -rf /etc/s6-overlay/s6-rc.d/4-setup-nginx/dependencies.d && \
    rm /etc/s6-overlay/s6-rc.d/user/contents.d/1-install-dependencies && \
    rm /etc/s6-overlay/s6-rc.d/user/contents.d/2-npm-install && \
    echo "**** cleanup ****" && \
    rm -rf \
    /tmp/* \
    /var/lib/apt/lists/* \
    /var/tmp/*

WORKDIR /
