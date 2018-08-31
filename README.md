[![Build Status](https://travis-ci.org/edublocs/eb-webapp.svg?branch=master)](https://travis-ci.org/edublocs/eb-webapp)
[![Coverage Status](https://coveralls.io/repos/github/edublocs/eb-webapp/badge.svg?branch=master)](https://coveralls.io/github/edublocs/eb-webapp?branch=master)

# eb-webapp

The [Edublocs](http://edublocs.org) web app is an [Ethereum](https://www.ethereum.org/) ÐApp (Distributed Application) for recording [grade information](https://en.wikipedia.org/wiki/Grading_in_education) on an Ethereum blockchain.  The web application is written in Javascript, compiled into a single-page application through [Webpack](https://webpack.js.org/), deployed on [GitHub Pages](https://pages.github.com/) at [edublocs.github.io/eb-webapp](https://edublocs.github.io/eb-webapp/). It uses the [Truffle framework](https://truffleframework.com/) to deploy the Edublocs Solidity smart contracts (in [eb-contracts](https://github.com/edublocs/eb-contracts)) to the Ropsten Ethereum testnet, where it is deployed at [0x4a4201b2f4231e419661e34d3d92e55c775c6899](https://ropsten.etherscan.io/address/0x4a4201b2f4231e419661e34d3d92e55c775c6899).

# Local installation
## Prerequisites
* [Node.js](https://www.nodejs.org/)
* [npm](https://www.npmjs.com/)
* [Truffle framework](hhtps://truffleframework.com) `npm i -g truffle`

# Development
With the command `npm run dev` the Webpack development server runs at http://localhost:8080/.

# Deployment
The application is deployed in two stages: the smart contract (code residing in eb-contracts) and the web application.
## Smart Contract
To compile the smart contract and deploy to the Ropsten test network
* Install a local instance of [geth](https://geth.ethereum.org/install/) 
* [Create a new account](https://github.com/ethereum/go-ethereum/wiki/Managing-your-accounts) (and make a safe backup of your private key)
* allow it to sync to the Ropsten network (a "light sync" is recommended)
`geth --rpc --rpcaddr \"0.0.0.0\" --rpcport \"8545\" --rpcapi \"web3,eth,net,debug\" --rpccorsdomain \"*\" --light --testnet`
* Unlock your account (adding the option `--unlock 0xYOUR_ACCOUNT` to geth above) and enter your password when prompted.
* Deploy the contract
`npm run migrate-ropsten`
* Commit the changes to the deployment information in `./build`
## Web application
To compile and deploy the web pages to GitHub Pages:
`npm run build-deploy`


Copyright © 2018 [Universitat de Barcelona](http://www.ub.edu)
Published under the [AGPL 3.0](https://opensource.org/licenses/AGPL-3.0).
