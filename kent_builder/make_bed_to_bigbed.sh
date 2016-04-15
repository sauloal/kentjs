./make.sh bash -c "pwd; \
mkdir -p /src/bin ; \
ln -s /src/bin /root/bin ; \
export USER=root; \
mkdir -p /usr/local/apache/cgi-bin-root/; \
USER=root make clean; \
rm -f /src/bin/x86_64/*; \
USER=root make -C lib x86_64/jkweb.a; \
USER=root make -C hg/lib ../../lib/x86_64/jkhgap.a; \
USER=root make -C /src/utils/bedToBigBed/"
