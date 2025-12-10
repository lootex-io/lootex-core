"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreCollection = void 0;
var poetry_1 = require("./poetry");
console.log('Running "poetry install"...');
(0, poetry_1.initPoetry)();
console.log('Completed execution of "poetry install"');
var scores_1 = require("./scores");
Object.defineProperty(exports, "scoreCollection", { enumerable: true, get: function () { return scores_1.scoreCollection; } });
//# sourceMappingURL=index.js.map