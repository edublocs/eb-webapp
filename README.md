[![Build Status](https://travis-ci.org/edublocs/eb-webapp.svg?branch=master)](https://travis-ci.org/edublocs/eb-webapp)
[![Coverage Status](https://coveralls.io/repos/github/edublocs/eb-webapp/badge.svg?branch=master)](https://coveralls.io/github/edublocs/eb-webapp?branch=master)

# eb-webapp

# Overview
The Edublocs Grade Book allows for the permanent recording of grade information in a way that is verifiable, universally accessible, and resistant to modification or deletion. It is a part of the [Edublocs](http://edublocs.org) project which explores the use of blockchain technologies in education.

# Usage
Anyone can record new entries in the grade book. All that is necessary is to have an Ethereum account with the necessary ETH to pay for the transaction.  We currently recommend [MetaMask](https://metamask.io/) to manage your account and its private keys.

As the project is still experimental and the cost per transaction on the Ethereum network remains high, the project is deployed on a test network (called "Ropsten"). As a result, you will not need "real" ETH to make transactions, but you will need test ETH to pay for the transaction which can be acquired here: https://faucet.ropsten.be/

## Terminology
The account which pays the ETH to write to the blockchain is the "recorder" of the evaluation. Each account which writes to the grade book is assigned a different `recorderID`, which can be used to query for the evaluations recorded by that account.

Students are uniquely identifed by the `studentID`, which must be assigned for each unique `studentIDText` before an evaluation can be recorded (using `newstudent.html`).

The coursework is identified by the `activity`, an integer from 0 to 4,294,967,295.

The `complexity`, `effort`, `weight`, `points`, and `weightedPoints` are decimal values between 0 and 10, with up to one decimal point of precision.  On the blockchain these are stored as integers from 0 to 100, and although the smart contract allows values up to 255, these are restricted through the web interface.

## Pages

### default (index.html)
Combination page which shows all evaluations (URL filter parameters apply), allows creation of new student IDs (`studentIDText` for pre-population), and creation of new evaluations (pre-population URL parameters apply).
Standard query filters apply.

Example: https://edublocs.github.io/eb-webapp/neweval.html?recorderID=1&studentIDText=niub2001&activity=14&complexity=100&effort=90&weight=80&points=70&weightedPoints=60

### csv.html
Read-only page which downloads a file containing all specified evaluations; standard URL filter parameters apply (see below).
Special parameter: `delimiter` to specify the character used to separate fields in the resulting file. Can be any URL encoded character (such as `%09` for tab) or the specific strings `comma` (the default), `semicolon`, or `tab`.

Example: https://edublocs.github.io/eb-webapp/csv.html?delimiter=semicolon&activity=14&recorderID=1

### neweval.html
Allows creation of new evaluations (pre-population URL parameters apply).

Example: https://edublocs.github.io/eb-webapp/neweval.html?studentIDText=niub2001&activity=14&complexity=100&effort=90&weight=80&points=70&weightedPoints=60

### newstudent.html
Allows creation of new student IDs (URL parameter `studentIDText` for pre-population).

Example: https://edublocs.github.io/eb-webapp/newstudent.html?studentIDText=niub2001

### view.html
Read-only page which shows all evaluations (URL filter parameters apply).

Example: https://edublocs.github.io/eb-webapp/view.html?recorderID=1&activity=11

## URL Parameters
* Filters: `activity`, `evaluationID`, `recorderID`, `studentID`
* Pre-population: `activity`, `complexity`, `effort`, `weight`, `points`, `weightedPoints`

# Technical implementation details
The [Edublocs](http://edublocs.org) web app is an [Ethereum](https://www.ethereum.org/) ÐApp (Distributed Application) for recording [grade information](https://en.wikipedia.org/wiki/Grading_in_education) on an Ethereum blockchain.  The web application is written in Javascript with [Node.JS](https://nodejs.org/), dependencies managed with [npm](https://www.npmjs.com/), compiled into a single-page application using [Webpack](https://webpack.js.org/), deployed on [GitHub Pages](https://pages.github.com/) at [edublocs.github.io/eb-webapp](https://edublocs.github.io/eb-webapp/). It uses the [Truffle framework](https://truffleframework.com/) to deploy the Edublocs Solidity smart contracts (in [eb-contracts](https://github.com/edublocs/eb-contracts)) to the Ropsten Ethereum testnet, where it is deployed at [0x4a4201b2f4231e419661e34d3d92e55c775c6899](https://ropsten.etherscan.io/address/0x4a4201b2f4231e419661e34d3d92e55c775c6899).

# Local installation
## Prerequisites
* [Node.js](https://www.nodejs.org/)
* [npm](https://www.npmjs.com/)
* [Truffle framework](hhtps://truffleframework.com) `npm i -g truffle`

# Development
With the command `npm run dev` the Webpack development server runs at [http://localhost:8080](http://localhost:8080/). To use the RPC interface to a local instance of Geth use [http://localhost:8080/?localhost](http://localhost:8080/?localhost).

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
