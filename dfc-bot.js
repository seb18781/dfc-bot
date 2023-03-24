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
exports.Bot = exports.bip32Options = exports.main = void 0;
const Helper = __importStar(require("./helper"));
const text_json_1 = __importDefault(require("./text.json"));
const parameter_json_1 = __importDefault(require("./parameter.json"));
//import Mnemonic from 'c:/Users/Sebastian Behnisch/Workspace/Defichain/dfc-bot-mnemonic/mnemonic.json'
const mnemonic_json_1 = __importDefault(require("C:/Users/z001njsm/defichain/dfc-bot-mnemonics/mnemonic.json"));
const jellyfish_network_1 = require("@defichain/jellyfish-network");
const whale_api_client_1 = require("@defichain/whale-api-client");
const jellyfish_wallet_1 = require("@defichain/jellyfish-wallet");
const jellyfish_wallet_mnemonic_1 = require("@defichain/jellyfish-wallet-mnemonic");
const whale_api_wallet_1 = require("@defichain/whale-api-wallet");
const transaction_1 = require("./transaction");
const bignumber_js_1 = require("bignumber.js");
if (require.main === module) {
    main();
}
async function main() {
    await Helper.delay(100); //initialisation time
    await console.log(Helper.getISODate() + ' ' + text_json_1.default.BOT_VERSION + parameter_json_1.default.VERSION);
    const network = jellyfish_network_1.TestNet;
    const client = new whale_api_client_1.WhaleApiClient({
        url: 'https://ocean.defichain.com',
        version: 'v0',
        network: network.name
    });
    const wallet = new jellyfish_wallet_1.JellyfishWallet(jellyfish_wallet_mnemonic_1.MnemonicHdNodeProvider.fromWords(mnemonic_json_1.default.MNEMONIC, bip32Options(network)), new whale_api_wallet_1.WhaleWalletAccountProvider(client, network));
    await console.log(Helper.getISODate() + ' ' + text_json_1.default.ADDRESS + await wallet.get(0).getAddress());
    const bot = new Bot(wallet);
    await bot.run();
}
exports.main = main;
function bip32Options(network) {
    return {
        bip32: {
            public: network.bip32.publicPrefix,
            private: network.bip32.privatePrefix,
        },
        wif: network.wifPrefix,
    };
}
exports.bip32Options = bip32Options;
class Bot {
    constructor(wallet) {
        this.transaction = new transaction_1.Transaction(wallet);
    }
    async run() {
        console.log(Helper.getISODate() + ' ' + text_json_1.default.UTXO_BALANCE + await this.transaction.getUTXOBalance()); //Output UTXO balance
        console.log(Helper.getISODate() + ' ' + text_json_1.default.TOKEN_BALANCE + await this.transaction.getTokenBalance('DFI', new bignumber_js_1.BigNumber(0))); //Output token balance
        //console.log(Helper.getISODate() + ' ' + Text.UTXO_TO_ACCOUNT + await this.transaction.utxoToAccount(new BigNumber(500),new BigNumber(0.1))) //UTXO to Account
        //console.log(Helper.getISODate() + ' ' + Text.ACCOUNT_TO_UTXO + await this.transaction.accountToUTXO(new BigNumber(500),new BigNumber(0))) //ACCOUNT to UTXO
        //console.log(Helper.getISODate() + ' ' + Text.SWAP + await this.transaction.swapToken('DFI',new BigNumber(229.65380233),'EUROC')) //Swap DFI to EUROC
        let txid = await this.transaction.addPoolLiquidity('DFI', new bignumber_js_1.BigNumber(1), 'EUROC', new bignumber_js_1.BigNumber(1)); //Add liquidity to pool DFI-EUROC
        if (await this.transaction.waitForTx(txid)) {
            console.log(Helper.getISODate() + ' ' + text_json_1.default.TRANSACTION_VERIFIED + txid);
        }
        else {
            console.log(Helper.getISODate() + ' ' + text_json_1.default.TRANSACTION_NOT_VERIFIED + txid);
        }
    }
}
exports.Bot = Bot;
