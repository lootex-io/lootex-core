"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCollection = void 0;
var child_process_1 = require("child_process");
var constants_1 = require("./constants");
var dump_1 = require("./dump");
function scoreCollection(metadata) {
    try {
        (0, dump_1.dumpMetadata)(metadata);
    }
    catch (error) {
        console.log("Could not dump metadata. Original error:\n%j", error);
        return null;
    }
    // Run script sync to ensure execution
    (0, child_process_1.spawnSync)("poetry", ["run", "python", constants_1.SCRIPT_PATH, constants_1.METADATA_PATH, constants_1.SCORES_PATH], { cwd: constants_1.BASE_PATH, stdio: ["inherit", "inherit", "inherit"] });
    var scores;
    try {
        scores = (0, dump_1.readScores)();
    }
    catch (error) {
        console.log("Could not read generated scores. Original error:\n%j", error);
        return null;
    }
    try {
        (0, dump_1.clearDumps)();
    }
    catch (error) {
        console.log("Could not clear dumps. Original error:\n%j", error);
        return null;
    }
    return scores;
}
exports.scoreCollection = scoreCollection;
//# sourceMappingURL=scores.js.map