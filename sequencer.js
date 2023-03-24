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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sequencer = void 0;
const text_json_1 = __importDefault(require("./text.json"));
const Helper = __importStar(require("./helper"));
/**
 * Aims to provide common used subsequences or sequence related logics
 */
class Sequencer {
    constructor(transaction) {
        this.transaction = transaction;
    }
    async sendTx(transaction, text = undefined) {
        let txid = await transaction();
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text);
        }
        if (txid === undefined) {
            return false;
        }
        else {
            if (await this.transaction.waitForTx(txid)) {
                console.log(Helper.getISODate() + ' ' + text_json_1.default.TRANSACTION_SENT + ': ' + txid);
                return true;
            }
            else {
                console.log(Helper.getISODate() + ' ' + text_json_1.default.TRANSACTION_NOT_SENT + ': ' + txid);
                return false;
            }
        }
    }
}
exports.Sequencer = Sequencer;
