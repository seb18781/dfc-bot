import Text from './text.json'
import { Transaction } from './transaction'
import * as Helper from './helper'
import { BigNumber } from "bignumber.js";

/**
 * Aims to provide common used subsequences or sequence related logics
 */
export class Sequencer {
    readonly transaction: Transaction
    constructor(transaction: Transaction) {
        this.transaction = transaction
    }
    public async sendTx(transaction: () => Promise<string>, text: string = undefined): Promise<boolean> {
        let txid = await transaction()
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text)
        }
        if (txid === undefined) {
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

    public async addPoolLiquidity(tokenASymbol: string, tokenBSymbol: string, tokenAAmount: BigNumber): Promise<boolean> {
        const tokenABalance = await this.transaction.getTokenBalance(tokenASymbol, new BigNumber(0))
        const tokenBBalance = await this.transaction.getTokenBalance(tokenBSymbol, new BigNumber(0))
        let tokenBAmount: BigNumber
        if (tokenAAmount > tokenABalance) {
            tokenAAmount = tokenABalance
        }
        let poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol)
        if (tokenASymbol === poolData.tokenA.symbol) {
            tokenBAmount = new BigNumber(tokenAAmount.toNumber() * Number(poolData.priceRatio.ba))
            if (tokenBAmount > tokenBBalance) {
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
            if (tokenBAmount > tokenBBalance) {
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
}