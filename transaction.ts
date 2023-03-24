import { JellyfishWallet, WalletHdNode } from "@defichain/jellyfish-wallet";
import { AddressToken } from "@defichain/whale-api-client/dist/api/address";
import { WhaleWalletAccount } from "@defichain/whale-api-wallet";
import { ApiPagedResponse } from "@defichain/whale-api-client";
import { BigNumber } from "bignumber.js";
import { CTransactionSegWit } from "@defichain/jellyfish-transaction";
import { TokenData } from "@defichain/whale-api-client/dist/api/tokens";
import { resolve } from "path";
import Text from './text.json'

export class Transaction {
  private wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>;
  constructor(wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>) {
    this.wallet = wallet;
  }

  /**
   * Returns the UTXO balance
   * @returns UTXO balance
   */
  public async getUTXOBalance(): Promise<BigNumber> {
    const address: string = await this.wallet.get(0).getAddress();
    return new BigNumber(
      await this.wallet.get(0).client.address.getBalance(address)
    );
  }

  /**
   * Get balance of specified token
   * @param symbol Symbol of the dToken
   * @param minBalance dToken with less amount will not be evaluated
   * @returns first appearance of the dToken will be returned
   */
  public async getTokenBalance(
    symbol: string,
    minBalance: BigNumber
  ): Promise<BigNumber | undefined> {
    const address: string = await this.wallet.get(0).getAddress();
    const tokenList: AddressToken[] = await this.wallet
      .get(0)
      .client.address.listToken(address);
    const token: AddressToken = tokenList.find((token) => {
      return (
        token.isDAT &&
        token.symbol === symbol &&
        new BigNumber(token.amount).gte(minBalance)
      );
    });
    if (token === undefined) {
      return undefined;
    } else {
      return new BigNumber(token.amount);
    }
  }

  /**
   * Convert token from UTXO model to account model
   * @param amount Amount of native token
   * @param minBalance minimum of native which should be left as UTXO balance
   * @returns Transaction ID
   */
  public async utxoToAccount(
    amount: BigNumber,
    minBalance: BigNumber
  ): Promise<string | undefined> {
    const saveHeaven: BigNumber = new BigNumber(0.1);
    const utxoBalance: BigNumber = await this.getUTXOBalance();
    if (
      utxoBalance.lte(minBalance) ||
      utxoBalance.lte(saveHeaven) ||
      utxoBalance.lte(amount)
    ) {
      return undefined;
    }
    const script = await this.wallet.get(0).getScript();
    const txn = await this.wallet
      .get(0)
      .withTransactionBuilder()
      .account.utxosToAccount(
        {
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
        script
      );
    const txid: string = await this.wallet
      .get(0)
      .client.rawtx.send({ hex: new CTransactionSegWit(txn).toHex() });
    return txid;
  }

  /**
   * Convert token from account model to UTXO model
   * @param amount Amount of token to be swapped to utxo
   * @param minBalance Minimum token balance which should be kept in account
   * @returns Transaction ID
   */
  public async accountToUTXO(
    amount: BigNumber,
    minBalance: BigNumber
  ): Promise<string | undefined> {
    const accountBalance: BigNumber = await this.getTokenBalance(
      "DFI",
      new BigNumber(0)
    );
    if (accountBalance.lt(amount)) {
      return undefined;
    }
    const script = await this.wallet.get(0).getScript();
    const txn = await this.wallet
      .get(0)
      .withTransactionBuilder()
      .account.accountToUtxos(
        {
          from: script,
          balances: [
            {
              token: 0,
              amount: amount,
            },
          ],
          mintingOutputsStart: 2, // 0: DfTx, 1: change, 2: minted utxos (mandated by jellyfish SDK)
        },
        script
      );
    const txid: string = await this.wallet
      .get(0)
      .client.rawtx.send({ hex: new CTransactionSegWit(txn).toHex() });
    return txid;
  }

  /**
   * Swap token A to token B
   * @param fromTokenSymbol Token A
   * @param fromAmount Amount of Token A
   * @param toTokenSymbol  Token B
   * @param maxPrice Maximum Price of Token A
   * @returns Transaction ID
   */
  public async swapToken(
    fromTokenSymbol: string,
    fromAmount: BigNumber,
    toTokenSymbol: string,
    maxPrice: BigNumber = new BigNumber(999999999)
  ): Promise<string | undefined> {
    const fromTokenBalance: BigNumber = await this.getTokenBalance(
      fromTokenSymbol,
      new BigNumber(0)
    );
    if (fromAmount.gt(fromTokenBalance)) {
      return undefined;
    }
    const fromTokenID = await this.getTokenID(fromTokenSymbol);
    const toTokenID = await this.getTokenID(toTokenSymbol);
    if (fromTokenID === undefined || toTokenID === undefined) {
      return undefined;
    }
    const script = await this.wallet.get(0).getScript();
    const txn = await this.wallet.get(0).withTransactionBuilder().dex.poolSwap(
      {
        fromScript: script,
        fromTokenId: fromTokenID,
        fromAmount: fromAmount,
        toScript: script,
        toTokenId: toTokenID,
        maxPrice: maxPrice,
      },
      script
    );
    const txid: string = await this.wallet
      .get(0)
      .client.rawtx.send({ hex: new CTransactionSegWit(txn).toHex() });
    return txid;
  }

  /**
   * Add liquidity to a pool
   * @param A_Symbol Token A
   * @param A_Amount Amount of Token A
   * @param B_Symbol Token B
   * @param B_Amount Amount of Token B
   * @returns Transaction ID
   */
  public async addPoolLiquidity(
    A_Symbol: string,
    A_Amount: BigNumber,
    B_Symbol: string,
    B_Amount: BigNumber
  ): Promise<string | undefined> {
    const A_ID = await this.getTokenID(A_Symbol);
    const B_ID = await this.getTokenID(B_Symbol);
    if (A_ID === undefined || B_ID === undefined) {
      return undefined;
    }
    const A_Balance: BigNumber = await this.getTokenBalance(
      A_Symbol,
      new BigNumber(0)
    );
    const B_Balance: BigNumber = await this.getTokenBalance(
      B_Symbol,
      new BigNumber(0)
    );
    if (A_Balance.lt(A_Amount) || B_Balance.lt(B_Amount)) {
      return undefined;
    }
    const script = await this.wallet.get(0).getScript();
    const txn = await this.wallet
      .get(0)
      .withTransactionBuilder()
      .liqPool.addLiquidity(
        {
          from: [
            {
              script: script,
              balances: [
                { token: A_ID, amount: A_Amount },
                { token: B_ID, amount: B_Amount },
              ],
            },
          ],
          shareAddress: script,
        },
        script
      );
    const txid: string = await this.wallet
      .get(0)
      .client.rawtx.send({ hex: new CTransactionSegWit(txn).toHex() });
    return txid;
  }

  public async getTokenID(symbol: string): Promise<number | undefined> {
    const tokenList = await this.aggregatePagedResponse(() =>
      this.wallet.get(0).client.tokens.list(200)
    );
    const token = tokenList.find((tokenData) => {
      return tokenData.symbol === symbol;
    });
    if (token === undefined) {
      return undefined;
    } else {
      return Number(token.id);
    }
  }

  /**
   * 
   * @param txid Transaction ID
   * @param startBlock Start Block (waitingBlocks is set to 2 by default!)
   * @returns Tx sent to defichain 
   */
public async waitForTx(txid: string, startBlock: number = 0): Promise<boolean>{
  if (startBlock == 0){
    startBlock = await this.wallet.get(0).client.stats.get().then((result) => {return result.count.blocks})
  }
  let waitingBlocks = 5
  return await new Promise((resolve) => {
    let intervalID: NodeJS.Timeout
    const callBackFunction = (): void => {
      this.wallet.get(0).client.transactions
      .get(txid)
      .then((tx) => {
        if (intervalID !== undefined){
          clearInterval(intervalID)
        }
        resolve(true)
      })
      .catch((e) => {
        this.wallet.get(0).client.stats.get()
        .then((result) => {return result.count.blocks})
        .then((block) => {
          if (block > (startBlock + waitingBlocks)){
            console.error(Text.TX_WAITING_TIME_EXCEEDED)
            if (intervalID !== undefined) {
              clearInterval(intervalID)
            }
            resolve(false)
          }
        })
      })
    }
    setTimeout(()=>{
      callBackFunction()
      intervalID = setInterval(() => {
        callBackFunction()
      },15000)
    },15000)
    })
  }

  /**
   * Function to aggregate a page response from Ocean API
   * @param call Function call
   * @returns Aggregated Response
   */
  private async aggregatePagedResponse<T>(
    call: () => Promise<ApiPagedResponse<T>>
  ): Promise<T[]> {
    const pages = [await call()];
    while (pages[pages.length - 1].hasNext) {
      try {
        pages.push(
          await this.wallet.get(0).client.paginate(pages[pages.length - 1])
        );
      } catch (e) {
        break;
      }
    }
    return pages.flatMap((page) => page as T[]);
  }
}
