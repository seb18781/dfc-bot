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
exports.hash256 = exports.decrypt = exports.encrypt = exports.getISODate = exports.delay = void 0;
const crypto_1 = __importStar(require("crypto"));
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
function getISODate() {
    let date = new Date();
    return date.toISOString();
}
exports.getISODate = getISODate;
function encrypt(data, key, initialization_vector) {
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', key, initialization_vector);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}
exports.encrypt = encrypt;
function decrypt(data, key, initialization_vector) {
    let decipher = crypto_1.default.createDecipheriv('aes-256-cbc', key, initialization_vector);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    return decrypted + decipher.final('utf8');
}
exports.decrypt = decrypt;
function hash256(data) {
    return (0, crypto_1.createHash)('md5').update(data).digest('hex');
}
exports.hash256 = hash256;
