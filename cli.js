const {bootstrap} = require("oc-tools/cli");

bootstrap({
    tsconfig: "./tsconfig.json",
    main: "./dist/build.js",
    useTsConfigBuild: true,
});
