# dfc-bot
Example program for automation methods on the Defichain

# Installation of Typescript
For the latest stable version: npm install -g typescript
If tsc does not run, input in admin mode: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned

# Command
tsc -p tsconfig.json;node dfc-bot.js

# Installation
- settings.json must be filled in correctly and stored separately
- the encryptMnemonic and decryptMnemonic functions can be used to encrypt the mnemonic

# Get DFI on Testnet
https://mydeficha.in/en/index.php?site=faucet

# Get Token ID
https://ocean.defichain.com/v0/mainnet/tokens?size=200

# Get Pool ID
https://ocean.defichain.com/v0/mainnet/poolpairs?size=200

# Package Telegraf
If you have problems with Telegraf, try the following: npm i github:telegraf/telegraf
