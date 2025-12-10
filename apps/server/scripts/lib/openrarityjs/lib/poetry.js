"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPoetry = void 0;
var child_process_1 = require("child_process");
var constants_1 = require("./constants");
function initPoetry() {
    (0, child_process_1.spawnSync)("poetry", ["install"], {
        cwd: constants_1.BASE_PATH,
        stdio: ["inherit", "inherit", "inherit"],
    });
}
exports.initPoetry = initPoetry;
//# sourceMappingURL=poetry.js.map