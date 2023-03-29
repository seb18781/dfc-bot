import * as Helper from './helper'
import Text from './text.json'
import Parameter from './parameter.json'
//import * as Settings from 'c:/Users/Sebastian Behnisch/Workspace/Defichain/dfc-bot-settings/settings.json'
import * as Settings from 'C:/Users/z001njsm/defichain/dfc-bot-settings/settings.json'
import { MainNet, Network, TestNet } from '@defichain/jellyfish-network'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet'
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic'
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet'
import { Transaction } from './transaction'
import { Sequencer } from './sequencer'
import { BigNumber } from 'bignumber.js'
import { Context, Telegraf } from 'telegraf';
import { Update } from 'typegram';

if (require.main === module) {
  main();
}

export async function main(): Promise<void> {
  await Helper.delay(100) //initialisation time

  const telegramBot: Telegraf<Context<Update>> = new Telegraf(Settings.T_TOKEN)

  var oldConsole = {...console}
  console.log = function(msg: string){
    telegramBot.telegram.sendMessage(Settings.T_CHAT_ID, msg)
    oldConsole.log(Helper.getISODate() + ' ' + msg)
  } 
  console.log(Text.BOT_VERSION + ': ' + Parameter.VERSION)
  const network: Network = TestNet

  const client = new WhaleApiClient({
    url: Parameter.OCEAN_URL[0],
    version: 'v0',
    network: network.name
  })

  const wallet = new JellyfishWallet(MnemonicHdNodeProvider.fromWords(Helper.decryptMnemonic(Settings.M_ENCRYPTED, 24, 
    Helper.hash256(Settings.M_KEY), Settings.INITIALIZATION_VECTOR), bip32Options(network)), new WhaleWalletAccountProvider(client, network))

  console.log(Text.ADDRESS + ': ' + Text.DEFISCAN_URL + Text.DEFISCAN_ADDRESS + await wallet.get(0).getAddress() + Text.DEFISCAN_NETWORK + Parameter.NETWORK)
  const bot = new Bot(wallet)
  await bot.run()
}

export function bip32Options(network: Network): Bip32Options {
    return {
      bip32: {
        public: network.bip32.publicPrefix,
        private: network.bip32.privatePrefix,
      },
      wif: network.wifPrefix,
    }
  }

export class Bot{
  readonly transaction: Transaction
  readonly sequencer: Sequencer
  constructor(wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>) {
    this.transaction = new Transaction(wallet)
    this.sequencer = new Sequencer(this.transaction)
  }

  async run():Promise<void> {
    const task = async () => {
    //Task: Collect crypto dust and reinvest in pool
    //----------------------------------------------
    console.log("<<<task started>>>")
    //1) Check and recharge UTXO Balance
    await this.sequencer.rechargeUTXOBalance(new BigNumber(Number(Parameter.UTXO_LL)),new BigNumber(Number(Parameter.UTXO_UL)))
    //2) Swap UTXO to account
    let utxoBalance: BigNumber = await this.sequencer.transaction.getUTXOBalance()
    await this.sequencer.sendTx(() => {return this.transaction.utxoToAccount(utxoBalance,new BigNumber(Number(Parameter.UTXO_UL)))},Text.UTXO_TO_ACCOUNT)
    //3) Swap Crypto dust to Token A
    await this.sequencer.collectCryptoDust(Parameter.CRYPTO_DUST_SYMBOLS,Parameter.CRYPTO_DUST_MIN_BALANCE,'DFI',Text.COLLECT_CRYPTO_DUST)
    //4) Swap 50% of DFI to Token B & Add Token A and Token B to Pool
    
    await this.sequencer.swapTokenToAddPoolLiquidity(Parameter.LP_REINVEST_SYMBOL_A,Parameter.LP_REINVEST_SYMBOL_B,
      new BigNumber(Number(Parameter.LP_REINVEST_SWAP_A_TO_B_AMOUNT)),new BigNumber(Number(Parameter.LP_REINVEST_SYMBOL_A_MIN_BALANCE)),Text.SWAP + ' ' + Parameter.LP_REINVEST_SYMBOL_A + ' to ' + Parameter.LP_REINVEST_SYMBOL_B)
    let TokenABalance: BigNumber = await this.sequencer.transaction.getTokenBalance(Parameter.LP_REINVEST_SYMBOL_A,new BigNumber(0))
    await this.sequencer.addPoolLiquidity(Parameter.LP_REINVEST_SYMBOL_A,Parameter.LP_REINVEST_SYMBOL_B,TokenABalance,
      new BigNumber(Number(Parameter.LP_REINVEST_SYMBOL_A_MIN_BALANCE)*0.45),Text.ADD_LIQUIDITY + ' ' + Parameter.LP_REINVEST_SYMBOL_A + '-' + Parameter.LP_REINVEST_SYMBOL_B)
    console.log("<<<task finished>>>")
    }

    let intervalID: NodeJS.Timeout = setInterval(() => {task()}, 600000)
  }
}
