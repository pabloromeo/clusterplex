#!/bin/bash

cd /usr/lib/plexmediaserver

CLUSTERPLEX_PLEX_VERSION=$(strings "pms_original" | grep -P '^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)-[0-9a-f]{9}')
CLUSTERPLEX_PLEX_CODECS_VERSION=$(strings "Plex Transcoder" | grep -Po '[0-9a-f]{7}-[0-9]{4}$')
CLUSTERPLEX_PLEX_EAE_VERSION=$(printf "eae-`strings "pms_original" | grep -P '^EasyAudioEncoder-eae-[0-9a-f]{7}-$' | cut -d- -f3`-42")

EAE_VERSION="${EAE_VERSION_NUMBER:=1983}" # default fixed for now

echo "CLUSTERPLEX_PLEX_VERSION => '${CLUSTERPLEX_PLEX_VERSION}'"
echo "CLUSTERPLEX_PLEX_CODECS_VERSION => '${CLUSTERPLEX_PLEX_CODECS_VERSION}'"
echo "CLUSTERPLEX_PLEX_EAE_VERSION (extracted) => '${CLUSTERPLEX_PLEX_EAE_VERSION}'"
echo "PLEX_ARCH => '${PLEX_ARCH}'"
echo "EAE_VERSION => '${EAE_VERSION}'"

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
  arm64)
    CLUSTERPLEX_PLEX_CODEC_ARCH="linux-aarch64-standard"
    INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL="aarch64"
    ;;
esac

echo "CLUSTERPLEX_PLEX_CODEC_ARCH => ${CLUSTERPLEX_PLEX_CODEC_ARCH}"

CODEC_PATH="/codecs/${CLUSTERPLEX_PLEX_CODECS_VERSION}-${CLUSTERPLEX_PLEX_CODEC_ARCH}"
echo "Codec location => ${CODEC_PATH}"

mkdir -p ${CODEC_PATH}
cd ${CODEC_PATH}

if [ "$EAE_SUPPORT" == "0" ] || [ "$EAE_SUPPORT" == "false" ]
then
  echo "EAE_SUPPORT is turned off => ${EAE_SUPPORT}, skipping EasyAudioEncoder download"
else
  # Check if the EAE_VERSION.txt file exists
  if [[ -f "EAE_VERSION.txt" ]]; then
    # Read the contents of the file into a variable
    eae_version_file=$(cat EAE_VERSION.txt)
    echo "Found EAE_VERSION.txt => ${eae_version_file}"
  else
    # Set eae_version_file to an empty string
    eae_version_file=""
    echo "EAE_VERSION.txt not found"
  fi

  # Compare the eae_version_file contents with the variable
  if [[ "$eae_version_file" == "$EAE_VERSION" ]]; then
    echo "EAE is up to date"
  else
    echo "EAE is not the latest version"

    # Check if the directory exists
    if [[ -d "${CODEC_PATH}/EasyAudioEncoder" ]]; then
        # Remove the directory recursively
        echo "Deleting Old EAE"
        rm -rf "${CODEC_PATH}/EasyAudioEncoder"
    else
        echo "EasyAudioEncoder directory does not exist, skipped deletion"
    fi

    echo "Downloading EasyAudioEncoder version => ${EAE_VERSION}"
    UUID=$(cat /proc/sys/kernel/random/uuid)
    # download eae definition to eae.xml
    EAE_XML="https://plex.tv/api/codecs/easyaudioencoder?build=${CLUSTERPLEX_PLEX_CODEC_ARCH}&deviceId=${UUID}&oldestPreviousVersion=${CLUSTERPLEX_PLEX_VERSION}&version=${EAE_VERSION}"
    echo "Downloading EAE_XML => ${EAE_XML}"
    curl -s -o eae.xml "${EAE_XML}"

    # extract codec url
    EAE_CODEC_URL=$(grep -Pio 'Codec url="\K[^"]*' eae.xml)
    echo "EAE_CODEC_URL => ${EAE_CODEC_URL}"
    echo "Downloading EasyAudioEncoder"
    curl -s -o "EasyAudioEncoder-${EAE_VERSION}-${CLUSTERPLEX_PLEX_CODEC_ARCH}.zip" "${EAE_CODEC_URL}"
    echo "Decompressing EasyAudioEncoder"
    unzip -o "EasyAudioEncoder-${EAE_VERSION}-${CLUSTERPLEX_PLEX_CODEC_ARCH}.zip" -d "EasyAudioEncoder"
    # extract license key
    echo "Extracting License Key"
    EAE_LICENSE_KEY=$(grep -Po 'license="\K([A-Za-z0-9]{10}\s[A-Za-z0-9]{60}\s[A-Za-z0-9]{64})' eae.xml)
    EAE_LICENSE_CONTENT="${EAE_LICENSE_KEY}"
    EAE_LICENSE_PATH="${CODEC_PATH}/EasyAudioEncoder/EasyAudioEncoder/eae-license.txt"
    echo "License Path output => ${EAE_LICENSE_PATH}"
    echo $EAE_LICENSE_CONTENT >> $EAE_LICENSE_PATH
    
    # save eae version to file
    echo $EAE_VERSION > EAE_VERSION.txt
    echo "EAE_VERSION.txt saved"
  fi
fi

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

export FFMPEG_EXTERNAL_LIBS="${CODEC_PATH}/"
export PLEX_MEDIA_SERVER_INFO_MODEL="${INTERNAL_PLEX_MEDIA_SERVER_INFO_MODEL}"
export EAE_EXECUTABLE="${CODEC_PATH}/EasyAudioEncoder/EasyAudioEncoder/EasyAudioEncoder"

cd /app

node worker.js
