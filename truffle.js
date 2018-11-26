// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    // for ganache-gui
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '5777'
    },
    ropsten: {
      host: '127.0.0.1',
      port: 8549,
      network_id: '3',
      from: '0x00c8bc664147389328cb56f0b1edc391c591191f',
      gas: 4700000
    }
  }
}
