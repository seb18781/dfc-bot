import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet'
import { AddressToken } from '@defichain/whale-api-client/dist/api/address'
import { WhaleWalletAccount } from '@defichain/whale-api-wallet'
import { BigNumber } from 'bignumber.js'
import { CTransactionSegWit } from '@defichain/jellyfish-transaction'
import { TokenData } from '@defichain/whale-api-client/dist/api/tokens'

export class Transaction {
    private wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>
    constructor (wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>){
        this.wallet = wallet
    }

    /**
     * Returns the UTXO balance
     * @returns UTXO balance
     */
    public async getUTXOBalance(): Promise<BigNumber> {
        const address: string = await this.wallet.get(0).getAddress()
        return new BigNumber(await this.wallet.get(0).client.address.getBalance(address))
      }

    /**
     * Get balance of specified token
     * @param symbol Symbol of the dToken
     * @param minBalance dToken with less amount will not be evaluated
     * @returns first appearance of the dToken will be returned
     */
    public async getTokenBalance(symbol: string, minBalance: BigNumber): Promise<BigNumber | undefined> {
        const address: string = await this.wallet.get(0).getAddress()
        const tokenList: AddressToken[] = await this.wallet.get(0).client.address.listToken(address)
        const token: AddressToken = tokenList.find((token) => {return token.isDAT && token.symbol === symbol && new BigNumber(token.amount).gte(minBalance)})
        if (token === undefined){
          return undefined
        }else{
          return new BigNumber(token.amount)
        }
    }

    /**
     * Convert token from UTXO model to account model
     * @param amount Amount of native token 
     * @param minBalance minimum of native which should be left as UTXO balance
     * @returns Transaction ID
     */
    public async utxoToAccount(amount: BigNumber,minBalance: BigNumber): Promise<string | undefined> {
        const saveHeaven: BigNumber = new BigNumber(0.1)
        const utxoBalance: BigNumber = await this.getUTXOBalance()
        if (utxoBalance.lte(minBalance) || utxoBalance.lte(saveHeaven) || utxoBalance.lte(amount)){
            return undefined
        }
        const script  = await this.wallet.get(0).getScript()
        const txn = await this.wallet.get(0).withTransactionBuilder().account.utxosToAccount({
            to: [
              {
                script,
                balances: [
                  {
                    token: 0,
                    amount,
                  },
                ],
              },
            ],
        },
        script)
        const txid: string = await this.wallet.get(0).client.rawtx.send({hex: new CTransactionSegWit(txn).toHex()})
        return txid
    }

    /**
     * Convert token from account model to UTXO model
     * @param amount Amount of token to be swapped to utxo
     * @param minBalance Minimum token balance which should be kept in account
     * @returns transaction id
     */
    public async accountToUTXO(amount: BigNumber, minBalance: BigNumber): Promise<string | undefined>{
      const accountBalance: BigNumber = await this.getTokenBalance('DFI',new BigNumber(0))
      if (accountBalance.lt(amount)){
        return undefined
      }
      const script  = await this.wallet.get(0).getScript()
      const txn = await this.wallet.get(0).withTransactionBuilder().account.accountToUtxos({
        from: script,
        balances: [
          {
            token: 0,
            amount: amount
          }
        ],
        mintingOutputsStart: 2 // 0: DfTx, 1: change, 2: minted utxos (mandated by jellyfish SDK)
      },
      script)
      const txid: string = await this.wallet.get(0).client.rawtx.send({hex: new CTransactionSegWit(txn).toHex()})
      return txid 
    }
    public async swapToken(fromTokenSymbol: string, fromAmount: BigNumber, toTokenSymbol: string,
      maxPrice: BigNumber = new BigNumber(999999999)): Promise<string | undefined>{
        const fromTokenBalance: BigNumber = await this.getTokenBalance(fromTokenSymbol,new BigNumber(0))
        if (fromAmount.gt(fromTokenBalance)){
          return undefined
        }
        const fromTokenID = await this.getTokenID(fromTokenSymbol)
        const toTokenID = await this.getTokenID(toTokenSymbol)
        if(fromTokenID === undefined || toTokenID === undefined){
          return undefined
        }
        const script  = await this.wallet.get(0).getScript()
        const txn = await this.wallet.get(0).withTransactionBuilder().dex.poolSwap({
          fromScript: script,
          toScript: script,
          fromTokenId: fromTokenID,
          toTokenId: toTokenID,
          fromAmount: fromAmount,
          maxPrice: new BigNumber('9223372036854775807')
        },
        script)
        const txid: string = await this.wallet.get(0).client.rawtx.send({hex: new CTransactionSegWit(txn).toHex()})
        return txid
    }

    public async getTokenID(symbol:string): Promise<number | undefined>
    {
      let id = undefined
      let tokenList = await this.wallet.get(0).client.tokens.list(400)
      for (const item of tokenList) {
        console.log(item)
      }
      //const token = tokenList.find(tokenData => {return tokenData.symbol === 'ETH'})
      //if (token === undefined){
        return undefined
      //}
      //else{
      //  return Number(token.id)
      //}
    }
}