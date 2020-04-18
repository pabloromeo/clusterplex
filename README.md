# ClusterPlex

## What is it?

ClusterPlex is basically an extended version of Plex, which supports distributed Workers across a cluster to handle transcoding requests.

[Plex](https://plex.tv) organizes video, music and photos from personal media libraries and streams them to smart TVs, streaming boxes and mobile devices.

[![plex](http://the-gadgeteer.com/wp-content/uploads/2015/10/plex-logo-e1446990678679.png)](https://plex.tv)

## How it works

In order to be able to use multiple nodes for transcoding, it's made up of 3 parts:

1. A custom Docker image based on the official linuxserver ARM image, in which Plex’s own transcoder is renamed and a shim is put in its place which calls a small Node.js app that communicates with the Orchestrator container over websockets.

2. An Orchestrator (Node.js application which receives all transcoding requests from PMS and forwards it to one of the active Workers available over websockets.

3. Worker docker image based on the PMS image as well, with a Node.js app running on it, which receives requests from the Orchestrator and kicks off the transcoding and reports progress back. Workers can come online or go offline and the Orchestrator manages their registrations and availability. These Workers can run as replicated services managed by the cluster.

Upgrading Plex when a new version comes out is basically just rebuilding the docker images to get the latest update.

**Important:** Plex’s Application Data and transcoding folders should be ideally in shared storage over NFS or similar and the Media Libraries should all be mounted as volumes both in PMS and each worker node under the same paths. The Worker will invoke the transcoder using the original path arguments so the content should be available to every worker as well. 

## Example Docker Swarm Deployment

Docker swarm stack example:

```
---
version: '3.4'

services:
  plex:
    image: pabloromeo/clusterplex:pms-armhf-latest
    deploy:
      mode: replicated
      replicas: 1
    environment:
      VERSION: docker
      PUID: 1000
      PGID: 1000
      TZ: Europe/London
      ORCHESTRATOR_URL: http://plex-orchestrator:3500
      PMS_IP: 192.168.2.1
      TRANSCODE_OPERATING_MODE: both #(local|remote|both)
      TRANSCODER_VERBOSE: "1"   # 1=verbose, 0=silent
    healthcheck:
      test: curl -fsS http://localhost:32400/identity > /dev/null || exit 1
      interval: 15s
      timeout: 15s
      retries: 5
      start_period: 30s
    volumes:
      - /path/to/config:/config
      - /path/to/backups:/backups
      - /path/to/tv:/data/tv
      - /path/to/movies:/data/movies
      - /path/to/transcodedata:/transcode
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 32469:32469
      - 32400:32400
      - 3005:3005
      - 8324:8324
      - 1900:1900/udp
      - 32410:32410/udp
      - 32412:32412/udp
      - 32413:32413/udp
      - 32414:32414/udp

  plex-orchestrator:
    image: pabloromeo/clusterplex:orchestrator-armhf-latest
    deploy:
      mode: replicated
      replicas: 1
      update_config:
        order: start-first
    healthcheck:
      test: curl -fsS http://localhost:3500/health > /dev/null || exit 1
      interval: 15s
      timeout: 15s
      retries: 5
      start_period: 30s
    environment:
      TZ: Europe/London
      STREAM_SPLITTING: "OFF" # ON | OFF (default)
      LISTENING_PORT: 3500
      WORKER_SELECTION_STRATEGY: "LOAD_CPU" # RR | LOAD_CPU | LOAD_TASKS
    volumes:
      - /etc/localtime:/etc/localtime:ro
    ports:
      - 3500:3500

  plex-worker:
    image: pabloromeo/clusterplex:worker-armhf-latest
    hostname: "plex-worker-{{.Node.Hostname}}"
    deploy:
      mode: global
      update_config:
        order: start-first
    environment:
      VERSION: docker
      PUID: 1000
      PGID: 1000
      TZ: Europe/London
      LISTENING_PORT: 3501      # used by the healthcheck
      STAT_CPU_INTERVAL: 2000   # interval for reporting worker load metrics
      ORCHESTRATOR_URL: http://plex-orchestrator:3500
    healthcheck:
      test: curl -fsS http://localhost:3501/health > /dev/null || exit 1
      interval: 15s
      timeout: 15s
      retries: 5
      start_period: 30s
    volumes:
      - /path/to/config:/config
      - /path/to/backups:/backups
      - /path/to/tv:/data/tv
      - /path/to/movies:/data/movies
      - /path/to/transcodedata:/transcode
      - /etc/localtime:/etc/localtime:ro

```