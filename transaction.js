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
        const tokenList = await this.wallet
            .get(0)
            .client.address.listToken(address);
        const token = tokenList.find((token) => {
            return (token.isDAT &&
                token.symbol === symbol &&
                new bignumber_js_1.BigNumber(token.amount).gte(minBalance));
        });
        if (token === undefined) {
            return undefined;
        }
        else {
            return new bignumber_js_1.BigNumber(token.amount);
        }
    }
    /**
     * Convert token from UTXO model to account model
     * @param amount Amount of native token
     * @param minBalance minimum of native which should be left as UTXO balance
     * @returns Transaction ID
     */
    async utxoToAccount(amount, minBalance) {
        const saveHeaven = new bignumber_js_1.BigNumber(0.1);
        const utxoBalance = await this.getUTXOBalance();
        if (utxoBalance.lte(minBalance) ||
            utxoBalance.lte(saveHeaven) ||
            utxoBalance.lte(amount)) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
        const txn = await this.wallet
            .get(0)
            .withTransactionBuilder()
            .account.utxosToAccount({
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
        const txid = await this.wallet
            .get(0)
            .client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
        return txid;
    }
    /**
     * Convert token from account model to UTXO model
     * @param amount Amount of token to be swapped to utxo
     * @param minBalance Minimum token balance which should be kept in account
     * @returns Transaction ID
     */
    async accountToUTXO(amount, minBalance) {
        const accountBalance = await this.getTokenBalance("DFI", new bignumber_js_1.BigNumber(0));
        if (accountBalance.lt(amount)) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
        const txn = await this.wallet
            .get(0)
            .withTransactionBuilder()
            .account.accountToUtxos({
            from: script,
            balances: [
                {
                    token: 0,
                    amount: amount,
                },
            ],
            mintingOutputsStart: 2, // 0: DfTx, 1: change, 2: minted utxos (mandated by jellyfish SDK)
        }, script);
        const txid = await this.wallet
            .get(0)
            .client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
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
    async swapToken(fromTokenSymbol, fromAmount, toTokenSymbol, maxPrice = new bignumber_js_1.BigNumber(999999999)) {
        const fromTokenBalance = await this.getTokenBalance(fromTokenSymbol, new bignumber_js_1.BigNumber(0));
        if (fromAmount.gt(fromTokenBalance)) {
            return undefined;
        }
        const fromTokenID = await this.getTokenID(fromTokenSymbol);
        const toTokenID = await this.getTokenID(toTokenSymbol);
        if (fromTokenID === undefined || toTokenID === undefined) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
        const txn = await this.wallet
            .get(0)
            .withTransactionBuilder()
            .dex
            .poolSwap({
            fromScript: script,
            fromTokenId: fromTokenID,
            fromAmount: fromAmount,
            toScript: script,
            toTokenId: toTokenID,
            maxPrice: maxPrice,
        }, script);
        const txid = await this.wallet
            .get(0)
            .client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
        return txid;
    }
    async addPoolLiquidity(A_Symbol, A_Amount, B_Symbol, B_Amount) {
        const A_ID = await this.getTokenID(A_Symbol);
        const B_ID = await this.getTokenID(B_Symbol);
        if (A_ID === undefined || B_ID === undefined) {
            return undefined;
        }
        const A_Balance = await this.getTokenBalance(A_Symbol, new bignumber_js_1.BigNumber(0));
        const B_Balance = await this.getTokenBalance(B_Symbol, new bignumber_js_1.BigNumber(0));
        if (A_Balance.lt(A_Amount) || B_Balance.lt(B_Amount)) {
            return undefined;
        }
        const script = await this.wallet.get(0).getScript();
        const txn = await this.wallet
            .get(0)
            .withTransactionBuilder()
            .liqPool.addLiquidity({
            from: [{ script: script,
                    balances: [{ token: A_ID, amount: A_Amount }, { token: B_ID, amount: B_Amount }] }],
            shareAddress: script
        }, script);
        const txid = await this.wallet
            .get(0)
            .client.rawtx.send({ hex: new jellyfish_transaction_1.CTransactionSegWit(txn).toHex() });
        return txid;
    }
    async getTokenID(symbol) {
        const tokenList = await this.aggregatePagedResponse(() => this.wallet.get(0).client.tokens.list(200));
        const token = tokenList.find(tokenData => { return tokenData.symbol === symbol; });
        if (token === undefined) {
            return undefined;
        }
        else {
            return Number(token.id);
        }
    }
    /**
     * Function to aggregate a page response from Ocean API
     * @param call Function call
     * @returns Aggregated Response
     */
    async aggregatePagedResponse(call) {
        const pages = [await call()];
        while (pages[pages.length - 1].hasNext) {
            try {
                pages.push(await this.wallet.get(0).client.paginate(pages[pages.length - 1]));
            }
            catch (e) {
                break;
            }
        }
        return pages.flatMap((page) => page);
    }
}
exports.Transaction = Transaction;
