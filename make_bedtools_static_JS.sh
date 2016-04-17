#!/bin/bash

set -xeu

GCC=emcc   \
EXT=.js    \
LIBS=""    \
LINKS=""   \
INCLUDES="-I/emsdk_portable/emscripten/tag-1.35.4/system/include/libc \
-I./global \
-I./libs"  \
make -C bedTools "$@"

chown -R ${USER_UID}:${USER_UID} .

#-I/usr/include/x86_64-linux-gnu/" \


#/emsdk_portable/emscripten/tag-1.35.4/system/include/libc

#LIBS="-lz -lpthread -lm" LINKS="-L./libs -L./global" INCLUDES="-I./libs -I./global"

#emcc -Iinc/ bedToBigBed.c -o bedToBigBed.js
