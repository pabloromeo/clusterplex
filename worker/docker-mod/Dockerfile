FROM alpine as buildstage

LABEL maintainer="pabloromeo"

RUN mkdir -p /root-layer/app

# copy local files
COPY /docker-mod/root/ /root-layer/
COPY /app /root-layer/app

FROM scratch

# Add files from buildstage
COPY --from=buildstage /root-layer/ /