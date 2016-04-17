var Module = {
    'preRun': function() {
        if (ENVIRONMENT_IS_NODE) {
            console.log("preRun");
            FS.mkdir('/PWD');
            FS.mount(NODEFS,{root:'.'},'/PWD');
            console.log("PREFIX YOUR FILE NAMES WITH /PWD");
        }
    }
};
