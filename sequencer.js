"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sequencer = void 0;
const text_json_1 = __importDefault(require("./text.json"));
const bignumber_js_1 = require("bignumber.js");
const parameter_json_1 = __importDefault(require("./parameter.json"));
/**
 * Aims to provide common used subsequences or sequence related logics
 */
class Sequencer {
    constructor(transaction) {
        this.transaction = transaction;
    }
    /**
     *
     * @param transaction Corresponding function reference of transaction
     * @param text Output to Console
     * @returns Transaction sent
     */
    async sendTx(transaction, text = undefined) {
        let txid = await transaction();
        if (text !== undefined) {
            console.log(text);
        }
        if (txid === undefined) {
            console.log(text_json_1.default.TRANSACTION_NOT_SENT);
            return false;
        }
        else {
            if (await this.transaction.waitForTx(txid)) {
                console.log(text_json_1.default.TRANSACTION_SENT + ': ' + console.log(text_json_1.default.ADDRESS + ': ' + text_json_1.default.DEFISCAN_URL + text_json_1.default.DEFISCAN_TRANSACTIONS + txid + text_json_1.default.DEFISCAN_NETWORK + parameter_json_1.default.NETWORK));
                return true;
            }
            else {
                console.log(text_json_1.default.TRANSACTION_NOT_SENT);
                return false;
            }
        }
    }
    /**
     * Adds liquidity to a pool without a swap
     * @param tokenASymbol Token A symbol
     * @param tokenBSymbol Token A symbol
     * @param tokenAAmount Amount ofToken A to add to Pool (if amount > balance --> maxmimum balance is added to pool)
     * @returns Transaction sent
     */
    async addPoolLiquidity(tokenASymbol, tokenBSymbol, tokenAAmount, tokenAMinBalance, text = undefined) {
        if (text !== undefined) {
            console.log(text);
        }
        const tokenABalance = await this.transaction.getTokenBalance(tokenASymbol, new bignumber_js_1.BigNumber(0));
        const tokenBBalance = await this.transaction.getTokenBalance(tokenBSymbol, new bignumber_js_1.BigNumber(0));
        let tokenBAmount;
        if (tokenAAmount.toNumber() > tokenABalance.toNumber()) {
            tokenAAmount = tokenABalance;
        }
        if (tokenABalance.toNumber() < tokenAMinBalance.toNumber()) {
            console.log(text_json_1.default.NOT_ENOUGH_BALANCE + ' of token ' + tokenASymbol);
            return false;
        }
        const poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol);
        if (tokenASymbol === poolData.tokenA.symbol) {
            tokenBAmount = new bignumber_js_1.BigNumber(tokenAAmount.toNumber() * Number(poolData.priceRatio.ba));
            console.log(tokenAAmount + ' ' + tokenBAmount);
            if (tokenBAmount.toNumber() > tokenBBalance.toNumber()) {
                tokenBAmount = tokenBBalance;
                tokenAAmount = new bignumber_js_1.BigNumber(tokenBAmount.toNumber() * Number(poolData.priceRatio.ab));
            }
            return await this.sendTx(() => {
                return this.transaction.addPoolLiquidity(tokenASymbol, tokenAAmount, tokenBSymbol, tokenBAmount);
            }, text_json_1.default.ADD_LIQUIDITY + ' ' + tokenASymbol + '-' + tokenBSymbol + ' with ' +
                tokenAAmount + ' ' + tokenASymbol + ' and ' + tokenBAmount + ' ' + tokenBSymbol);
        }
        else if (tokenASymbol === poolData.tokenB.symbol) {
            tokenBAmount = new bignumber_js_1.BigNumber(tokenAAmount.toNumber() * Number(poolData.priceRatio.ab));
            if (tokenBAmount.toNumber() > tokenBBalance.toNumber()) {
                tokenBAmount = tokenBBalance;
                tokenAAmount = new bignumber_js_1.BigNumber(tokenBAmount.toNumber() * Number(poolData.priceRatio.ba));
            }
            return await this.sendTx(() => {
                return this.transaction.addPoolLiquidity(tokenBSymbol, tokenBAmount, tokenASymbol, tokenAAmount);
            }, text_json_1.default.ADD_LIQUIDITY + ' ' + tokenBSymbol + '-' + tokenASymbol + ' with ' +
                tokenBAmount + ' ' + tokenBSymbol + ' and ' + tokenAAmount + ' ' + tokenASymbol);
        }
        else {
            return false;
        }
    }
    async collectCryptoDust(dustTokenSymbols, dustTokenMinBalance, outputTokenSymbol, text = undefined) {
        let returnValue = true;
        if (text !== undefined) {
            console.log(text);
        }
        const dustTokenList = await this.transaction.getAddressTokenData(dustTokenSymbols);
        if (dustTokenList === undefined) {
            console.log(text_json_1.default.NO_CRYPTO_DUST_COLLECTED);
            returnValue = false;
            return returnValue;
        }
        for (let i = 0; i < dustTokenList.length; i++) {
            let dustToken = dustTokenList[i];
            if (Number(dustToken.amount) < Number(dustTokenMinBalance[i])) {
                console.log(text_json_1.default.NOT_ENOUGH_BALANCE + ' of token ' + dustToken.symbol);
            }
            else if (dustToken.isDAT && Number(dustToken.amount) > Number(dustTokenMinBalance[i])) {
                const dustTokenAmount = new bignumber_js_1.BigNumber(Number(dustToken.amount) - Number(dustTokenMinBalance[i]));
                returnValue = returnValue && await this.sendTx(() => { return this.transaction.swapToken(dustToken.symbol, dustTokenAmount, outputTokenSymbol); }, text_json_1.default.SWAP + ' ' + dustTokenAmount + ' ' + dustToken.symbol + ' to ' + outputTokenSymbol);
            }
        }
        return returnValue;
    }
    async swapTokenToAddPoolLiquidity(tokenASymbol, tokenBSymbol, tokenAAmount, tokenAMinBalance, text = undefined) {
        if (text !== undefined) {
            console.log(text);
        }
        let returnValue = true;
        let tokenABalance = 0;
        const tokenAData = await this.transaction.getAddressTokenData([tokenASymbol]);
        if (tokenAData !== undefined) {
            tokenABalance = Number(tokenAData[0].amount);
        }
        let tokenBBalance = 0;
        const tokenBData = await this.transaction.getAddressTokenData([tokenBSymbol]);
        if (tokenBData !== undefined) {
            tokenBBalance = Number(tokenBData[0].amount);
        }
        if (tokenABalance < tokenAMinBalance.toNumber()) {
            console.log(text_json_1.default.NOT_ENOUGH_BALANCE + ' of token ' + tokenASymbol);
            return false;
        }
        if (tokenAAmount.toNumber() > Number(tokenABalance)) {
            tokenAAmount = new bignumber_js_1.BigNumber(Number(tokenABalance));
        }
        const poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol);
        if (tokenASymbol === poolData.tokenA.symbol) {
            if (tokenAAmount.toNumber() * Number(poolData.priceRatio.ba) < Number(tokenBBalance)) {
                return returnValue;
            }
            else {
                const tokenAAmountToSwap = (tokenAAmount.toNumber() - Number(tokenBBalance) * Number(poolData.priceRatio.ab)) * 0.5;
                returnValue = returnValue && await this.sendTx(() => { return this.transaction.swapToken(tokenASymbol, new bignumber_js_1.BigNumber(tokenAAmountToSwap.valueOf()), tokenBSymbol); }, text_json_1.default.SWAP + ' ' + tokenAAmountToSwap + ' ' + tokenASymbol + ' to ' + tokenBSymbol);
            }
        }
        else if (tokenASymbol === poolData.tokenB.symbol) {
            if (tokenAAmount.toNumber() * Number(poolData.priceRatio.ab) < Number(tokenBBalance)) {
                return returnValue;
            }
            else {
                const tokenAAmountToSwap = (tokenAAmount.toNumber() - Number(tokenBBalance) * Number(poolData.priceRatio.ba)) * 0.5;
                returnValue = returnValue && await this.sendTx(() => { return this.transaction.swapToken(tokenASymbol, new bignumber_js_1.BigNumber(tokenAAmountToSwap.valueOf()), tokenBSymbol); }, text_json_1.default.SWAP + ' ' + tokenAAmountToSwap + ' ' + tokenASymbol + ' to ' + tokenBSymbol);
            }
        }
        return returnValue;
    }
    async rechargeUTXOBalance(lowerLimit = new bignumber_js_1.BigNumber(0.1), upperLimit = new bignumber_js_1.BigNumber(1)) {
        let returnValue = true;
        const UTXOBalance = await this.transaction.getUTXOBalance();
        let rechargeValue = new bignumber_js_1.BigNumber(0);
        if (UTXOBalance.toNumber() < lowerLimit.toNumber()) {
            rechargeValue = (0, bignumber_js_1.BigNumber)(upperLimit.toNumber() - UTXOBalance.toNumber());
            returnValue = returnValue && await this.sendTx(() => { return this.transaction.accountToUTXO(rechargeValue, new bignumber_js_1.BigNumber(0)); }, text_json_1.default.RECHARGE_UTXO + ' with ' + rechargeValue.toNumber().toString() + ' DFI');
        }
        else {
            console.log(text_json_1.default.UTXO_BALANCED_VERIFIED + '; ' + text_json_1.default.UTXO_BALANCE + ': '
                + UTXOBalance.toNumber().toString() + ' DFI');
        }
        return returnValue;
    }
}
exports.Sequencer = Sequencer;
