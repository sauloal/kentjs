
all: hello hello.js hello.html

clean:
	rm hello hello.js hello.js.mem hello.html hello.html.mem || true

hello: hello.c
	gcc      -o $@ $^

hello.js: hello.c
	emcc -Oz -o $@ $^ -s EXPORTED_FUNCTIONS="['_main']"

hello.html: hello.c
	emcc -Oz -o $@ $^ -s EXPORTED_FUNCTIONS="['_main']"
