#!/bin/bash

export LD_LIBRARY_PATH="/usr/lib"

externalTranscoder="/app/transcoder.js"

echo "Calling external transcoder: $externalTranscoder"
exec node $externalTranscoder "$@"
