GCC?=gcc
EXT?=
LIBS?=-lz -lpthread -lm

OPTS?=-O3 -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE -D_GNU_SOURCE -DMACHTYPE_x86_64

#LINKS?=-L./libs -L./global -L./extra -L/lib -L/usr/lib/x86_64-linux-gnu 
#INCLUDES?=-I./libs -I./global -I./extra -I/lib -I/usr/lib/x86_64-linux-gnu

LINKS?=-L./libs -L/lib -L/usr/include/ -L/usr/lib/x86_64-linux-gnu 

INCLUDES?=-I./libs -I/lib -I/usr/include/ -I/usr/lib/x86_64-linux-gnu

WARNINGS?=-Wall -Wformat -Wimplicit -Wreturn-type

ZLIB=zlib-1.2.8/



HEADERS?=$(wildcard global/*.h global/*/*.h)

SRC=$(wildcard *.c)
OBS=$(patsubst %.c,%.o,$(SRC))
EXE=$(patsubst %.c,%$(EXT),$(SRC))
STA=$(patsubst %.c,%_static$(EXT),$(SRC))
STAB=$(patsubst %.c,%_static,$(SRC))
STAD=$(patsubst %.c,%_static$(EXT)$(EXT),$(SRC))

HTML=$(patsubst %,%.html,$(EXE) $(STA))
MEM=$(patsubst %,%.mem,$(EXE) $(STA) $(HTML))

CS=$(wildcard libs/*.c)
OS=$(patsubst %.c,%.o,$(CS))



all: exes statics

exes: $(EXE)

statics: $(STA)

clean:
	rm -f $(OS)   || true
	rm -f $(OBS)  || true
	rm -f $(EXE)  || true
	rm -f $(STA)  || true
	rm -f $(STAB) || true
	rm -f $(STAD) || true
	rm -f $(HTML) || true
	rm -f $(MEM)  || true

print:
	@echo "$(EXE)"
	@echo "$(STA)"


#zlib:
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN $(OPTS) -O -g $(WARNINGS) -fPIC -DPIC $(LINKS) $(INCLUDES) -o adler32.o  adler32.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o crc32.o    crc32.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o deflate.o  deflate.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o infback.o  infback.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o inffast.o  inffast.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o inflate.o  inflate.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o inftrees.o inftrees.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o trees.o    trees.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o zutil.o    zutil.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o compress.o compress.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o uncompr.o  uncompr.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o gzclose.o  gzclose.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o gzlib.o    gzlib.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o gzread.o   gzread.c
#$(GCC) -D_LARGEFILE64_SOURCE=1 -DHAVE_HIDDEN     -c -o gzwrite.o  gzwrite.c

ZLIBCS=$(ZLIB)adler32.c $(ZLIB)crc32.c $(ZLIB)deflate.c $(ZLIB)infback.c $(ZLIB)inffast.c $(ZLIB)inflate.c $(ZLIB)inftrees.c $(ZLIB)trees.c $(ZLIB)zutil.c $(ZLIB)compress.c $(ZLIB)uncompr.c $(ZLIB)gzclose.c $(ZLIB)gzlib.c $(ZLIB)gzread.c $(ZLIB)gzwrite.c



%.o: %.c
	$(GCC) $(OPTS) -O -g         $(WARNINGS) -fPIC -DPIC $(LINKS) $(INCLUDES) -o $@ -c   $^




$(OBS): %.o : %.c
	$(GCC) $(OPTS) -O -g         $(WARNINGS) -fPIC -DPIC $(LINKS) $(INCLUDES) -o $@ -c   $^

$(EXE): %$(EXT) : %.o $(OS)
	$(GCC) $(OPTS) -O -g         $(WARNINGS) -fPIC -DPIC $(LINKS) $(INCLUDES) -o $@      $^ $(LIBS)



ifeq ($(EXT),.js)
$(STA): %_static$(EXT) : %.c $(CS) $(ZLIBCS)
	$(GCC) $(OPTS) -O -g -static $(WARNINGS)             $(LINKS) $(INCLUDES) -I$(ZLIB) -o $@      $^ $(LIBS) $(ZLIBCS)
	$(GCC) $(OPTS) -O -g -static $(WARNINGS)             $(LINKS) $(INCLUDES) -I$(ZLIB) -o $@.html $^ $(LIBS) $(ZLIBCS)
else
$(STA): %_static$(EXT) : %.c $(CS)
	$(GCC) $(OPTS) -O -g -static $(WARNINGS)             $(LINKS) $(INCLUDES) -o $@      $^ $(LIBS)
	$(GCC) $(OPTS) -O -g -static $(WARNINGS)             $(LINKS) $(INCLUDES) -o $@.html $^ $(LIBS)
endif








