import * as Helper from './helper'
import Text from './text.json'
import Parameter from './parameter.json'
//import Mnemonic from 'c:/Users/Sebastian Behnisch/Workspace/Defichain/dfc-bot-mnemonic/mnemonic.json'
import Mnemonic from 'C:/Users/z001njsm/defichain/dfc-bot-mnemonics/mnemonic.json'
import { MainNet, Network, TestNet } from '@defichain/jellyfish-network'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { JellyfishWallet, WalletHdNode } from '@defichain/jellyfish-wallet'
import { Bip32Options, MnemonicHdNodeProvider } from '@defichain/jellyfish-wallet-mnemonic'
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet'
import { Transaction } from './transaction'
import { Sequencer } from './sequencer'
import { BigNumber } from 'bignumber.js'
import { AddressToken } from '@defichain/whale-api-client/dist/api/address'

if (require.main === module) {
  main();
}

export async function main(): Promise<void> {
  await Helper.delay(100) //initialisation time
  await console.log(Helper.getISODate() + ' ' + Text.BOT_VERSION + ': ' + Parameter.VERSION)
  const network: Network = TestNet

  const client = new WhaleApiClient({
    url: Parameter.OCEAN_URL[0],
    version: 'v0',
    network: network.name
  })
  const wallet = new JellyfishWallet(MnemonicHdNodeProvider.fromWords(Mnemonic.MNEMONIC,
    bip32Options(network)),
    new WhaleWalletAccountProvider(client, network))
  
  await console.log(Helper.getISODate() + ' ' + Text.ADDRESS + ': ' + await wallet.get(0).getAddress())
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
  constructor(wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>
  ) {
    this.transaction = new Transaction(wallet)
    this.sequencer = new Sequencer(this.transaction)
  }

  async run():Promise<void> {
    const task = async () => {
    //Task: Collect crypto dust and reinvest in pool
    //----------------------------------------------
    console.log(Helper.getISODate() + ' ' + "<<<task started>>>")
    //1) Check and recharge UTXO Balance
    await this.sequencer.rechargeUTXOBalance(new BigNumber(0.1),new BigNumber(1))
    //2) Swap UTXO to account
    let utxoBalance: BigNumber = await this.sequencer.transaction.getUTXOBalance()
    await this.sequencer.sendTx(() => {return this.transaction.utxoToAccount(utxoBalance,new BigNumber(1))},Text.UTXO_TO_ACCOUNT)
    //3) Swap Crypto dust to Token A
    await this.sequencer.collectCryptoDust(['EUROC'],[new BigNumber(10)],'DFI',Text.COLLECT_CRYPTO_DUST)
    //4) Swap 50% of DFI to Token B & Add Token A and Token B to Pool
    await this.sequencer.swapTokenToAddPoolLiquidity('DFI','DUSD',new BigNumber(10000),new BigNumber(100),Text.SWAP + ' DFI to DUSD')
    let accountDFIBalance: BigNumber = await this.sequencer.transaction.getTokenBalance('DFI',new BigNumber(0))
    await this.sequencer.addPoolLiquidity('DFI','DUSD',accountDFIBalance,new BigNumber(45),Text.ADD_LIQUIDITY + ' DFI-DUSD')
    console.log(Helper.getISODate() + ' ' + "<<<task finished>>>")
    }

    let intervalID: NodeJS.Timeout = setInterval(() => {task()}, 600000)
  }
}
