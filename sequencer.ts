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
     * Adds liquidity to a pool without a swap 
     * @param tokenASymbol Token A symbol
     * @param tokenBSymbol Token A symbol
     * @param tokenAAmount Amount ofToken A to add to Pool (if amount > balance --> maxmimum balance is added to pool)
     * @returns Transaction sent
     */
    public async addPoolLiquidity(tokenASymbol: string, tokenBSymbol: string, tokenAAmount: BigNumber, tokenAMinBalance: BigNumber, text: string = undefined): Promise<boolean> {
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text)
        }
        const tokenABalance = await this.transaction.getTokenBalance(tokenASymbol, new BigNumber(0))
        const tokenBBalance = await this.transaction.getTokenBalance(tokenBSymbol, new BigNumber(0))
        let tokenBAmount: BigNumber
        if (tokenAAmount.toNumber() > tokenABalance.toNumber()) {
            tokenAAmount = tokenABalance
        }
        if (tokenABalance.toNumber() < tokenAMinBalance.toNumber()){
            console.log(Helper.getISODate() + ' ' + Text.NOT_ENOUGH_BALANCE + ' of token ' + tokenASymbol)
            return false
        }
        const poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol)
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
                console.log(Helper.getISODate() + ' ' + Text.NOT_ENOUGH_BALANCE + ' of token ' + dustToken.symbol)
            }
            else if (dustToken.isDAT && Number(dustToken.amount) > dustTokenMinBalance[i].toNumber()){
                const dustTokenAmount: BigNumber = new BigNumber(Number(dustToken.amount)-dustTokenMinBalance[i].toNumber())
                returnValue = returnValue && await this.sendTx(() => {return this.transaction.swapToken(dustToken.symbol,dustTokenAmount,outputTokenSymbol)},
                Text.SWAP + ' ' + dustTokenAmount + ' ' + dustToken.symbol + ' to ' + outputTokenSymbol)
            }
        }
        return returnValue
    }

    public async swapTokenToAddPoolLiquidity(tokenASymbol: string, tokenBSymbol: string, tokenAAmount: BigNumber, tokenAMinBalance: BigNumber, text: string = undefined): Promise<boolean>{
        if (text !== undefined) {
            console.log(Helper.getISODate() + ' ' + text)
        }
        let returnValue = true
        let tokenABalance: Number = 0
        const tokenAData: AddressToken[] = await this.transaction.getAddressTokenData([tokenASymbol])
        if (tokenAData !== undefined){
            tokenABalance = Number(tokenAData[0].amount)
        }
        let tokenBBalance: Number = 0
        const tokenBData: AddressToken[] = await this.transaction.getAddressTokenData([tokenBSymbol])
        if (tokenBData !== undefined){
            tokenBBalance = Number(tokenBData[0].amount)
        }
        if (tokenABalance < tokenAMinBalance.toNumber()){
            console.log(Helper.getISODate() + ' ' + Text.NOT_ENOUGH_BALANCE + ' of token ' + tokenASymbol)
            return false
        }
        if (tokenAAmount.toNumber() > Number(tokenABalance)) {
            tokenAAmount = new BigNumber(Number(tokenABalance))
        }
        const poolData = await this.transaction.getPoolData(tokenASymbol, tokenBSymbol)
        if (tokenASymbol === poolData.tokenA.symbol){
            if (tokenAAmount.toNumber() * Number(poolData.priceRatio.ba) < Number(tokenBBalance)){
                return returnValue
            }
            else {
                const tokenAAmountToSwap: Number = (tokenAAmount.toNumber() - Number(tokenBBalance) * Number(poolData.priceRatio.ab)) * 0.5
                returnValue = returnValue && await this.sendTx(() => {return this.transaction.swapToken(tokenASymbol,new BigNumber(tokenAAmountToSwap.valueOf()),tokenBSymbol)},
                Text.SWAP + ' ' + tokenAAmountToSwap + ' ' + tokenASymbol + ' to ' + tokenBSymbol)
            }
        }
        else if (tokenASymbol === poolData.tokenB.symbol){
            if (tokenAAmount.toNumber() * Number(poolData.priceRatio.ab) < Number(tokenBBalance)){
                return returnValue
            }
            else {
                const tokenAAmountToSwap: Number = (tokenAAmount.toNumber() - Number(tokenBBalance) * Number(poolData.priceRatio.ba)) * 0.5
                returnValue = returnValue && await this.sendTx(() => {return this.transaction.swapToken(tokenASymbol,new BigNumber(tokenAAmountToSwap.valueOf()),tokenBSymbol)},
                Text.SWAP + ' ' + tokenAAmountToSwap + ' ' + tokenASymbol + ' to ' + tokenBSymbol)
            }
        }
        return returnValue
    }

    public async rechargeUTXOBalance(lowerLimit: BigNumber = new BigNumber(0.1), upperLimit: BigNumber = new BigNumber(1)): Promise<boolean>{
        let returnValue = true
        const UTXOBalance: BigNumber = await this.transaction.getUTXOBalance()
        let rechargeValue: BigNumber = new BigNumber(0)
        if (UTXOBalance.toNumber() < lowerLimit.toNumber()){
            rechargeValue = BigNumber(upperLimit.toNumber() - UTXOBalance.toNumber())
            returnValue = returnValue && await this.sendTx(() => {return this.transaction.accountToUTXO(rechargeValue,new BigNumber(0))},
            Text.RECHARGE_UTXO + ' with ' + rechargeValue.toNumber().toString() + ' DFI')
        }
        else{
            console.log(Helper.getISODate() + ' ' + Text.UTXO_BALANCED_VERIFIED + '; ' + Text.UTXO_BALANCE + ': '
             + UTXOBalance.toNumber().toString() + ' DFI')
        }
        return returnValue
    }
}