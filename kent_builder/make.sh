#!/bin/bash

set -xeu

#( cd docker && ./build.sh )

docker run -it --rm -v ${PWD}/kent/src:/src -w /src sauloal/kent_builder "$@"
