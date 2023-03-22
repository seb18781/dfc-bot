"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const bignumber_js_1 = require("bignumber.js");
const jellyfish_transaction_1 = require("@defichain/jellyfish-transaction");
class Transaction {
    constructor(wallet) {
        this.wallet = wallet;
    }
    /**
     * Returns the UTXO balance
     * @returns UTXO balance
     */
    async getUTXOBalance() {
        const address = await this.wallet.get(0).getAddress();
        return new bignumber_js_1.BigNumber(await this.wallet.get(0).client.address.getBalance(address));
    }
    /**
     * Get balance of specified token
     * @param symbol Symbol of the dToken
     * @param minBalance dToken with less amount will not be evaluated
     * @returns first appearance of the dToken will be returned
     */
    async getTokenBalance(symbol, minBalance) {
        const address = await this.wallet.get(0).getAddress();
        const tokenList = await this.wallet.get(0).client.address.listToken(address);
        const token = tokenList.find((token) => { return token.isDAT && token.symbol === symbol && new bignumber_js_1.BigNumber(token.amount).gte(minBalance); });
        if (token === undefined) {
            return undefined;
        }
        else {
            return new bignumber_js_1.BigNumber(token.amount);
        }
    }
    /**
     *
     * @param amount Amount of native token
     * @param minBalance minimum of native which should be left as UTXO balance
     * @returns Transaction ID
     */
    async utxoToAccount(amount, minBalance) {
        const saveHeaven = new bignumber_js_1.BigNumber(0.1);
        const utxoBalance = await this.getUTXOBalance();
        if (utxoBalance.lte(minBalance) || utxoBalance.lte(saveHeaven) || utxoBalance.lte(amount)) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
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
        }, script);
        const txid = await this.wallet.get(0).client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
        return txid;
    }
    async accountToUTXO(amount, minBalance) {
        const accountBalance = await this.getTokenBalance('DFI', new bignumber_js_1.BigNumber(0));
        if (accountBalance.lt(amount)) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
        const txn = await this.wallet.get(0).withTransactionBuilder().account.accountToUtxos({
            from: script,
            balances: [
                {
                    token: 0,
                    amount: amount
                }
            ],
            mintingOutputsStart: 2 // 0: DfTx, 1: change, 2: minted utxos (mandated by jellyfish SDK)
        }, script);
        const txid = await this.wallet.get(0).client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
        return txid;
    }
}
exports.Transaction = Transaction;
