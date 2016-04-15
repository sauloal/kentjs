#!/bin/bash

set -xeu

IMAGE=sauloal/emscripten:sdk-tag-1.35.4-64bit
#IMAGE=trzeci/emscripten:sdk-tag-1.35.4-64bit

docker run --rm -it -v ${PWD}:/src ${IMAGE} bash -xeu make.sh "$@"

#emcc helloworld.cpp -o helloworld.js
