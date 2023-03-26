import Text from './text.json'
import { Transaction } from './transaction'
import * as Helper from './helper'
import { BigNumber } from "bignumber.js";
import { AddressToken } from "@defichain/whale-api-client/dist/api/address";

/**
 * Aims to provide common used subsequences or sequence related logics
 */
export class Sequencer {
    readonly transaction: Transaction
    constructor(transaction: Transaction) {
        this.transaction = transaction
    }

    /**
     * 
     * @param transaction Corresponding function reference of transaction
     * @param text Output to Console
     * @returns Transaction sent
     */
    public async sendTx(transaction: () => Promise<string>, text: string = undefined): Promise<boolean> {
        let txid = await transaction()
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text)
        }
        if (txid === undefined) {
            console.log(Helper.getISODate() + ' ' + Text.TRANSACTION_NOT_SENT + ': ' + txid)
            return false
        }
        else {
            if (await this.transaction.waitForTx(txid)) {
                console.log(Helper.getISODate() + ' ' + Text.TRANSACTION_SENT + ': ' + txid)
                return true
            }
            else {
                console.log(Helper.getISODate() + ' ' + Text.TRANSACTION_NOT_SENT + ': ' + txid)
                return false
            }
        }

    }

    /**
     * Adds liquidity to a pool
     * @param tokenASymbol Token A symbol
     * @param tokenBSymbol Token A symbol
     * @param tokenAAmount Amount ofToken A to add to Pool (if amount > balance --> maxmimum balance is added to pool)
     * @returns Transaction sent
     */
    public async addPoolLiquidity(tokenASymbol: string, tokenBSymbol: string, tokenAAmount: BigNumber): Promise<boolean> {
        const tokenABalance = await this.transaction.getTokenBalance(tokenASymbol, new BigNumber(0))
        const tokenBBalance = await this.transaction.getTokenBalance(tokenBSymbol, new BigNumber(0))
        let tokenBAmount: BigNumber
        if (tokenAAmount.toNumber() > tokenABalance.toNumber()) {
            tokenAAmount = tokenABalance
        }
        let poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol)
        if (tokenASymbol === poolData.tokenA.symbol) {
            tokenBAmount = new BigNumber(tokenAAmount.toNumber() * Number(poolData.priceRatio.ba))
            console.log(tokenAAmount + ' ' + tokenBAmount)
            if (tokenBAmount.toNumber() > tokenBBalance.toNumber()) {
                tokenBAmount = tokenBBalance
                tokenAAmount = new BigNumber(tokenBAmount.toNumber() * Number(poolData.priceRatio.ab))
            }
            return await this.sendTx(() => {
                return this.transaction.addPoolLiquidity(
                    tokenASymbol, tokenAAmount, tokenBSymbol, tokenBAmount)
            },
                Text.ADD_LIQUIDITY + ' ' + tokenASymbol + '-' + tokenBSymbol + ' with ' +
                tokenAAmount + ' ' + tokenASymbol + ' and ' + tokenBAmount + ' ' + tokenBSymbol)
        }
        else if (tokenASymbol === poolData.tokenB.symbol) {
            tokenBAmount = new BigNumber(tokenAAmount.toNumber() * Number(poolData.priceRatio.ab))
            if (tokenBAmount.toNumber() > tokenBBalance.toNumber()) {
                tokenBAmount = tokenBBalance
                tokenAAmount = new BigNumber(tokenBAmount.toNumber() * Number(poolData.priceRatio.ba))
            }
            console.log(Text.ADD_LIQUIDITY + ' ' + tokenBSymbol + '-' + tokenASymbol + ' with ' +
            tokenBAmount + ' ' + tokenBSymbol + ' and ' + tokenAAmount + ' ' + tokenASymbol)
            return await this.sendTx(() => {
                return this.transaction.addPoolLiquidity(
                    tokenBSymbol, tokenBAmount, tokenASymbol, tokenAAmount)
            },
                Text.ADD_LIQUIDITY + ' ' + tokenBSymbol + '-' + tokenASymbol + ' with ' +
                tokenBAmount + ' ' + tokenBSymbol + ' and ' + tokenAAmount + ' ' + tokenASymbol)
        }
        else {
            return false
        }
    }

    public async collectCryptoDust(dustTokenSymbols: string[], dustTokenMinBalance: BigNumber[], outputTokenSymbol: string, text: string = undefined): Promise<boolean>{
        let returnValue = true
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text)
        }
        const dustTokenList: AddressToken[] = await this.transaction.getAddressTokenData(dustTokenSymbols)
        if (dustTokenList === undefined){
            console.log(Helper.getISODate() + ' ' + Text.NO_CRYPTO_DUST_COLLECTED)
            returnValue = false
            return returnValue
        } 
        for (let i=0;i<dustTokenList.length;i++){
            let dustToken: AddressToken = dustTokenList[i]
            if (Number(dustToken.amount) < Number(dustTokenMinBalance[i])){
                console.log(Helper.getISODate() + ' ' + Text.NO_ENOUGH_BALANCE + ' of token ' + dustToken.symbol)
            }
            else if (dustToken.isDAT && Number(dustToken.amount) > dustTokenMinBalance[i].toNumber()){
                returnValue = returnValue && await this.sendTx(() => {return this.transaction.swapToken(dustToken.symbol,new BigNumber(0.0001),outputTokenSymbol)},
                Text.SWAP + ' ' + dustToken.symbol + ' to ' + outputTokenSymbol)
            }
        }
        return returnValue
    }

}