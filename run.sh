#!/bin/bash

set -xeu

IMAGE=sauloal/emscripten:sdk-tag-1.36.1-64bit
#sdk-tag-1.35.4-64bit
#IMAGE=trzeci/emscripten:sdk-tag-1.35.4-64bit

USER_UID=`id -u ${USER}`

docker run --rm -it --env USER_UID=${USER_UID} -v ${PWD}:/src ${IMAGE} bash -xeu make.sh "$@"

#emcc helloworld.cpp -o helloworld.js
