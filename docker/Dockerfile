FROM trzeci/emscripten:sdk-tag-1.35.4-64bit

RUN apt-get update &&         \
    apt-get install -y        \
    libmysqlclient-dev        \
    build-essential           \
    zlib1g-dev                \
    libc6-dev libc-dev        \
    gcc-multilib g++-multilib \
    gcc g++ cpp               \
    libpng-dev libpng12-dev   \
    libsdl-image1.2-dev libssl-dev \
    rsync

