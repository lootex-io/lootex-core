"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCORES_PATH = exports.METADATA_PATH = exports.DUMP_FOLDER = exports.SCRIPT_PATH = exports.BASE_PATH = void 0;
var path = __importStar(require("path"));
var SCRIPT_NAME = "score_collection.py";
var DUMP_NAME = "metadata.json";
var SCORES_NAME = "scores.json";
exports.BASE_PATH = path.normalize(path.join(__dirname, ".."));
exports.SCRIPT_PATH = path.join(exports.BASE_PATH, "scripts", SCRIPT_NAME);
exports.DUMP_FOLDER = path.join(exports.BASE_PATH, "dumps");
exports.METADATA_PATH = path.join(exports.DUMP_FOLDER, DUMP_NAME);
exports.SCORES_PATH = path.join(exports.DUMP_FOLDER, SCORES_NAME);
//# sourceMappingURL=constants.js.map