// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
    // for ganache-gui
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '5777'
    },
    ropsten: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*' // Match any network id
    }
  }
}
