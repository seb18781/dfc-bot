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
//import * as Settings from 'c:/Users/Sebastian Behnisch/Workspace/Defichain/dfc-bot-settings/settings.json'
const Settings = __importStar(require("C:/Users/z001njsm/defichain/dfc-bot-settings/settings.json"));
const jellyfish_network_1 = require("@defichain/jellyfish-network");
const whale_api_client_1 = require("@defichain/whale-api-client");
const jellyfish_wallet_1 = require("@defichain/jellyfish-wallet");
const jellyfish_wallet_mnemonic_1 = require("@defichain/jellyfish-wallet-mnemonic");
const whale_api_wallet_1 = require("@defichain/whale-api-wallet");
const transaction_1 = require("./transaction");
const sequencer_1 = require("./sequencer");
const bignumber_js_1 = require("bignumber.js");
const telegraf_1 = require("telegraf");
if (require.main === module) {
    main();
}
async function main() {
    await Helper.delay(100); //initialisation time
    const telegramBot = new telegraf_1.Telegraf(Settings.T_TOKEN);
    var oldConsole = Object.assign({}, console);
    console.log = function (msg) {
        telegramBot.telegram.sendMessage(Settings.T_CHAT_ID, '' + msg);
        oldConsole.log(Helper.getISODate() + ' ' + msg);
    };
    await Helper.delay(2000);
    console.log(text_json_1.default.BOT_VERSION + ': ' + parameter_json_1.default.VERSION);
    var network = jellyfish_network_1.TestNet;
    if (parameter_json_1.default.NETWORK === 'MainNet') {
        network = jellyfish_network_1.MainNet;
    }
    const client = new whale_api_client_1.WhaleApiClient({
        url: parameter_json_1.default.OCEAN_URL[0],
        version: 'v0',
        network: network.name
    });
    const wallet = new jellyfish_wallet_1.JellyfishWallet(jellyfish_wallet_mnemonic_1.MnemonicHdNodeProvider.fromWords(Helper.decryptMnemonic(Settings.M_ENCRYPTED, 24, Helper.hash256(Settings.M_KEY), Settings.INITIALIZATION_VECTOR), bip32Options(network)), new whale_api_wallet_1.WhaleWalletAccountProvider(client, network));
    await Helper.delay(2000);
    console.log(text_json_1.default.ADDRESS + ': ' + text_json_1.default.DEFISCAN_URL + text_json_1.default.DEFISCAN_ADDRESS + await wallet.get(0).getAddress() + text_json_1.default.DEFISCAN_NETWORK + parameter_json_1.default.NETWORK);
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
        this.sequencer = new sequencer_1.Sequencer(this.transaction);
    }
    async run() {
        //    const task = async () => {
        //Task: Collect crypto dust and reinvest in pool
        //----------------------------------------------
        await Helper.delay(2000);
        console.log('<<< task started >>>');
        //1) Check and recharge UTXO Balance
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        await this.sequencer.rechargeUTXOBalance(new bignumber_js_1.BigNumber(Number(parameter_json_1.default.UTXO_LL)), new bignumber_js_1.BigNumber(Number(parameter_json_1.default.UTXO_UL)));
        //2) Swap UTXO to account
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        let utxoBalance = await this.sequencer.transaction.getUTXOBalance();
        if (utxoBalance.toNumber() > Number(parameter_json_1.default.UTXO_UL)) {
            await this.sequencer.sendTx(() => { return this.transaction.utxoToAccount(utxoBalance, new bignumber_js_1.BigNumber(Number(parameter_json_1.default.UTXO_UL))); }, text_json_1.default.UTXO_TO_ACCOUNT);
        }
        else {
            console.log(text_json_1.default.UTXO_BELOW_MINIMUM_BALANCE_NO_TRANSFER_TO_ACCOUNT);
        }
        //3) Swap Crypto dust to Token A
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        await this.sequencer.collectCryptoDust(parameter_json_1.default.CRYPTO_DUST_SYMBOLS, parameter_json_1.default.CRYPTO_DUST_MIN_BALANCE, 'DFI', text_json_1.default.COLLECT_CRYPTO_DUST);
        //4) Swap 50% of DFI to Token B
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        await this.sequencer.swapTokenToAddPoolLiquidity(parameter_json_1.default.LP_REINVEST_SYMBOL_A, parameter_json_1.default.LP_REINVEST_SYMBOL_B, new bignumber_js_1.BigNumber(Number(parameter_json_1.default.LP_REINVEST_SWAP_A_TO_B_AMOUNT)), new bignumber_js_1.BigNumber(Number(parameter_json_1.default.LP_REINVEST_SYMBOL_A_SWAP_THRESHOLD)), text_json_1.default.SWAP + ' ' + parameter_json_1.default.LP_REINVEST_SYMBOL_A + ' to ' + parameter_json_1.default.LP_REINVEST_SYMBOL_B);
        //5) Add Token A and Token B to Pool
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        let TokenABalance = await this.sequencer.transaction.getTokenBalance(parameter_json_1.default.LP_REINVEST_SYMBOL_A, new bignumber_js_1.BigNumber(0));
        await this.sequencer.addPoolLiquidity(parameter_json_1.default.LP_REINVEST_SYMBOL_A, parameter_json_1.default.LP_REINVEST_SYMBOL_B, TokenABalance, new bignumber_js_1.BigNumber(Number(parameter_json_1.default.LP_REINVEST_SYMBOL_A_ADD_LM_THRESHOLD)), new bignumber_js_1.BigNumber(Number(parameter_json_1.default.LP_REINVEST_SYMBOL_B_ADD_LM_THRESHOLD)), text_json_1.default.ADD_LIQUIDITY + ' ' + parameter_json_1.default.LP_REINVEST_SYMBOL_A + '-' + parameter_json_1.default.LP_REINVEST_SYMBOL_B);
        await Helper.taskSpacer(2000, "--------------------------------------------------------------");
        console.log('<<< task finished >>>');
        //    }
        //    let intervalID: NodeJS.Timeout = setInterval(() => {task()}, 600000)
    }
}
exports.Bot = Bot;
