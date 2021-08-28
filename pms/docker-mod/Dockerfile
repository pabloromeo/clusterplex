FROM node:lts-slim as buildstage

LABEL maintainer="pabloromeo"

WORKDIR /app
COPY /app/package*.json ./
RUN npm install

RUN mkdir -p /root-layer/app

# copy local files
COPY /docker-mod/root/ /root-layer/

COPY app /root-layer/app

FROM scratch

# Add files from buildstage
COPY --from=buildstage /root-layer/ /