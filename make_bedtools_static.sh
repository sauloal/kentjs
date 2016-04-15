#!/bin/bash

set -xeu

make -C bedTools statics "$@"

#/emsdk_portable/emscripten/tag-1.35.4/system/include/libc

#LIBS="-lz -lpthread -lm" LINKS="-L./libs -L./global" INCLUDES="-I./libs -I./global" 

#emcc -Iinc/ bedToBigBed.c -o bedToBigBed.js
