import Text from './text.json'
import { Transaction } from './transaction'
import * as Helper from './helper'

/**
 * Aims to provide common used subsequences or sequence related logics
 */
export class Sequencer{
    readonly transaction: Transaction
    constructor(transaction: Transaction){
        this.transaction=transaction
    }
    public async sendTx(transaction: () => Promise<string>,text: string = undefined):Promise<boolean>{
        let txid = await transaction()
        if (text !== undefined){
            console.log(Helper.getISODate() + ' ' + text)}
        if (txid === undefined){
            return false
        }
        else {
            if (await this.transaction.waitForTx(txid)){
                console.log(Helper.getISODate() + ' ' + Text.TRANSACTION_SENT + ': ' + txid)
                return true
              }
              else
              {
                console.log(Helper.getISODate() + ' ' + Text.TRANSACTION_NOT_SENT + ': ' + txid)
                return false
              }
        }
        
    }
}