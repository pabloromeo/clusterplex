#!/bin/bash

cd /usr/lib/plexmediaserver

CLUSTERPLEX_PLEX_VERSION=$(strings "pms_original" | grep -P '^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)-[0-9a-f]{9}')
CLUSTERPLEX_PLEX_CODECS_VERSION=$(strings "Plex Transcoder" | grep -Po '[0-9a-f]{7}-[0-9]{4}$')
CLUSTERPLEX_PLEX_EAE_VERSION=$(printf "eae-`strings "pms_original" | grep -P '^EasyAudioEncoder-eae-[0-9a-f]{7}-$' | cut -d- -f3`-42")

echo "CLUSTERPLEX_PLEX_VERSION => '${CLUSTERPLEX_PLEX_VERSION}'"
echo "CLUSTERPLEX_PLEX_CODECS_VERSION => '${CLUSTERPLEX_PLEX_CODECS_VERSION}'"
echo "CLUSTERPLEX_PLEX_EAE_VERSION => '${CLUSTERPLEX_PLEX_EAE_VERSION}'"
echo "PLEX_ARCH => '${PLEX_ARCH}'"

CLUSTERPLEX_PLEX_CODEC_ARCH="${PLEX_ARCH}"
INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL=""

case "${PLEX_ARCH}" in
  amd64)
    CLUSTERPLEX_PLEX_CODEC_ARCH="linux-x86_64-standard"
    INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL="x86_64"
    ;;
  armhf)
    CLUSTERPLEX_PLEX_CODEC_ARCH="linux-armv7neon-standard"
    INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL="armv7l"
    ;;
esac

echo "CLUSTERPLEX_PLEX_CODEC_ARCH => ${CLUSTERPLEX_PLEX_CODEC_ARCH}"

CODEC_PATH="/codecs/${CLUSTERPLEX_PLEX_CODECS_VERSION}-${CLUSTERPLEX_PLEX_CODEC_ARCH}"
echo "Codec location => ${CODEC_PATH}"

mkdir -p ${CODEC_PATH}
cd ${CODEC_PATH}

#original list: libhevc_decoder libh264_decoder libdca_decoder libac3_decoder libmp3_decoder libaac_decoder libaac_encoder libmpeg4_decoder libmpeg2video_decoder liblibmp3lame_encoder liblibx264_encoder; do
cat /app/codecs.txt | while read line 
do
  codec=${line//[$'\t\r\n']}
  if [ -f "${codec}.so" ]; then
    echo "Codec ${codec}.so already exists. Skipping"
  else 
    echo "Codec ${codec}.so does not exist. Downloading..."
    wget https://downloads.plex.tv/codecs/${CLUSTERPLEX_PLEX_CODECS_VERSION}/${CLUSTERPLEX_PLEX_CODEC_ARCH}/${codec}.so
  fi
done

export FFMPEG_EXTERNAL_LIBS="/codecs/${CLUSTERPLEX_PLEX_CODECS_VERSION}-${CLUSTERPLEX_PLEX_CODEC_ARCH}/"
export PLEX_MEDIA_SERVER_INFO_MODEL="${INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL}"

cd /app

node worker.js
