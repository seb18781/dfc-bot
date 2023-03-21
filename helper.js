"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISODate = exports.delay = void 0;
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.delay = delay;
function getISODate() {
    let date = new Date();
    return date.toISOString();
}
exports.getISODate = getISODate;
