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
import { BigNumber } from 'bignumber.js'
import { AddressToken } from '@defichain/whale-api-client/dist/api/address'

if (require.main === module) {
  main();
}

export async function main(): Promise<void> {
  await Helper.delay(100) //initialisation time
  await console.log(Helper.getISODate() + ' ' + Text.BOT_VERSION + Parameter.VERSION)
  const network: Network = TestNet

  const client = new WhaleApiClient({
    url: 'https://ocean.defichain.com',
    version: 'v0',
    network: network.name
  })
  const wallet = new JellyfishWallet(MnemonicHdNodeProvider.fromWords(Mnemonic.MNEMONIC,
    bip32Options(network)),
    new WhaleWalletAccountProvider(client, network))
  
  await console.log(Helper.getISODate() + ' ' + Text.ADDRESS + await wallet.get(0).getAddress())
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
  constructor(wallet: JellyfishWallet<WhaleWalletAccount, WalletHdNode>
  ) {
    this.transaction = new Transaction(wallet)
  }

  async run():Promise<void> {
    console.log(Helper.getISODate() + ' ' + Text.UTXO_BALANCE + await this.transaction.getUTXOBalance()) //Output UTXO balance
    console.log(Helper.getISODate() + ' ' + Text.TOKEN_BALANCE + await this.transaction.getTokenBalance('ETH',new BigNumber(0))) //Output token balance
    //console.log(Helper.getISODate() + ' ' + Text.UTXO_TO_ACCOUNT + await this.transaction.utxoToAccount(new BigNumber(500),new BigNumber(0.1))) //UTXO to Account
    console.log(Helper.getISODate() + ' ' + Text.ACCOUNT_TO_UTXO + await this.transaction.accountToUTXO(new BigNumber(500),new BigNumber(0))) //ACCOUNT to UTXO
  }
}
