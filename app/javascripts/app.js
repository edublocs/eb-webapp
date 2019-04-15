// eslint warnings
/* global web3, alert, App */

// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'

// Import libraries we need.
import { default as Web3 } from 'web3'
import ZeroClientProvider from 'web3-provider-engine/zero.js'
import { default as contract } from 'truffle-contract'
import { default as edublocs } from './edublocs.js'

// Import our contract artifacts and turn them into usable abstractions.
import gradeBookArtifacts from '../../build/contracts/GradeBook.json'

// rampant globalism
window.edublocs = edublocs

// GradeBook is our usable abstraction, which we'll use through the code below.
var GradeBook = contract(gradeBookArtifacts)

var accounts
var account
var readOnly = false
var refreshingEvaluations = false

// handle URL arguments
function getQueryVariable (variable) {
  var query = window.location.search.substring(1)
  var vars = query.split('&')
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=')
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1])
    }
  }
  return ''
}

window.App = {

  gradeBook: async function () {
    return edublocs.gradeBook()
  },

  start: async function () {
    const self = this
    const fileName = window.location.pathname.split('/').slice(-1)[0]

    // Bootstrap the GradeBook abstraction for use
    GradeBook.setProvider(web3.currentProvider)
    GradeBook.defaults({ gas: '350000' })

    // workaround https://github.com/trufflesuite/truffle-contract/issues/57
    if (typeof GradeBook.currentProvider.sendAsync !== 'function') {
      GradeBook.currentProvider.sendAsync = function () {
        return GradeBook.currentProvider.send.apply(GradeBook.currentProvider, arguments)
      }
    }

    // get the deployed contract
    window.gradebook = await GradeBook.deployed()

    // when not running in read-only mode due to our provider...
    if (!readOnly) {
      // get the account we'll use to make transactions
      try {
        accounts = await web3.eth.getAccounts()
      } catch (error) {
        console.log(error)
      }
      if (accounts.length === 0) {
        if (web3.currentProvider.isMetaMask === true) {
          alert('Please log in to MetaMask and refresh this page in order to record new data.')
        } else {
          alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
        }
        readOnly = true
      }
    }
    account = accounts ? accounts[0] : null

    // set default values (if passed in)
    if (document.getElementById('record_evaluation')) {
      document.getElementById('studentIDText').value = getQueryVariable('studentIDText')
      document.getElementById('activity').value = getQueryVariable('activity')
      document.getElementById('complexity').value = getQueryVariable('complexity')
      document.getElementById('effort').value = getQueryVariable('effort')
      document.getElementById('weight').value = getQueryVariable('weight')
      document.getElementById('points').value = getQueryVariable('points')
      document.getElementById('weightedPoints').value = getQueryVariable('weightedPoints')
    }

    // allow them to pass in the student text or the student ID
    // as default for the student and for filtering the evaluations
    var filters = []
    var studentIDText = ''
    if (getQueryVariable('student')) {
      studentIDText = getQueryVariable('student')
      filters.studentID = [(await window.gradebook.getStudentID(studentIDText)).toNumber()]
    } else if (getQueryVariable('studentID')) {
      filters.studentID = getQueryVariable('studentID').split(',').map(Number)
      if (filters.studentID.length === 1) {
        studentIDText = web3.utils.toUtf8(await window.gradebook.getStudentIDText(filters.studentID[0]))
      }
    }

    // if there was only one student specified, use it as the default value
    if (studentIDText && document.getElementById('studentIDText')) {
      document.getElementById('studentIDText').value = studentIDText
    }

    // apply other filters: convert string list of numbers to array of numbers
    if (getQueryVariable('recorderAddress')) {
      filters.recorderID = [(await window.gradebook.getRecorderID(getQueryVariable('recorderAddress'))).toNumber()]
    } else if (getQueryVariable('recorderID')) {
      filters.recorderID = getQueryVariable('recorderID').split(',').map(Number)
    }
    if (getQueryVariable('activity')) {
      filters.activity = getQueryVariable('activity').split(',').map(Number)
    }
    if (getQueryVariable('evaluationID')) {
      filters.evaluationID = getQueryVariable('evaluationID').split(',').map(Number)
    }

    if (fileName === 'csv.html') {
      let delimiter = getQueryVariable('delimiter')
      // URL encoding will work (such as %09 for tab), but to be friendly...
      if (delimiter === 'tab') delimiter = '\t'
      if (delimiter === 'comma') delimiter = ','
      if (delimiter === 'semicolon') delimiter = ';'
      await edublocs.exportAndDownloadCSV(filters, delimiter)
    }

    // load the evaluations into the table
    self.refreshEvaluations(filters)

    // for pages that have the read-only warning, turn it on if appropriate
    if (readOnly && document.getElementById('read_only_message')) {
      document.getElementById('read_only_message').style.display = 'block'
    }
  },

  setStatus: function (message) {
    var status = document.getElementById('status')
    status.innerHTML = message
  },

  refreshEvaluations: async function (filters = []) {
    // prevent re-entry
    if (refreshingEvaluations) {
      return
    } else {
      refreshingEvaluations = true
    }

    // if there's no table to fill in, there's nothing to do
    var evaluationTable = document.getElementById('evaluationTable')
    if (!evaluationTable) {
      return
    }

    // get an array of results
    var evals = await edublocs.getEvaluations(filters)

    // walk the array, populating the table.
    for (let i = 0; i < evals.length; i++) {
      var row = evaluationTable.insertRow(-1)
      row.insertCell(0).innerHTML = '<a href="https://rinkeby.etherscan.io/tx/' + evals[i].transactionHash + '">' +
      new Date(evals[i].timestamp * 1000).toLocaleString() + '</a>'
      row.insertCell(1).innerHTML = '<a href="https://rinkeby.etherscan.io/address/' +
      evals[i].recorderAddress + '">' +
      evals[i].recorderAddress.substring(0, 8) + '…</a>'
      row.insertCell(2).innerHTML = evals[i].studentIDText
      row.insertCell(3).innerHTML = evals[i].activity
      row.insertCell(4).innerHTML = evals[i].complexity / 10
      row.insertCell(5).innerHTML = evals[i].effort / 10
      row.insertCell(6).innerHTML = evals[i].weight / 10
      row.insertCell(7).innerHTML = evals[i].points / 10
      row.insertCell(8).innerHTML = evals[i].weightedPoints / 10
    }

    refreshingEvaluations = false
  },

  // Create a student ID from the text
  makeStudentID: async function () {
    var self = this

    const studentID = document.getElementById('studentIDText')
    var studentIDText = studentID.value.trim()
    studentID.value = studentIDText
    if (studentIDText === '') {
      self.setStatus('Student ID must not be blank')
      studentID.focus()
      return
    }

    this.setStatus('Initiating transaction... (please wait)')

    try {
      var gb = await self.gradeBook()
      await gb.makeStudentID(Web3.utils.utf8ToHex(studentIDText), { from: account })
      self.setStatus('Created student ID ' + studentIDText)
      // when Create Evaluation is available, move on
      if (document.getElementById('activity')) {
        document.getElementById('activity').focus()
      } else {
        // otherwise blank out the value
        document.getElementById('studentIDText').value = ''
      }
    } catch (error) {
      console.log(error)
      self.setStatus('Error creating student ID; see log.')
    }
  },

  // Record the evaluation
  recordEvaluation: async function () {
    var self = this

    var studentIDText = document.getElementById('studentIDText').value
    var activity = document.getElementById('activity').value
    var complexity = document.getElementById('complexity').value * 10
    var effort = document.getElementById('effort').value * 10
    var weight = document.getElementById('weight').value * 10
    var points = document.getElementById('points').value * 10
    var weightedPoints = document.getElementById('weightedPoints').value * 10

    this.setStatus('Initiating transaction... (please wait)')

    try {
      var gb = await self.gradeBook()

      // get the student ID if any
      let studentID = (await gb.getStudentID(studentIDText)).toNumber()
      // zero-based student ID seemed great until this bug...
      let studentCount = await gb.getStudentCount()
      if (studentCount > 0 && studentID !== 0) {
        // if it already exists, record it (saves some gas to use the student ID)
        await gb.recordEvaluation(
          studentID, activity, complexity, effort, weight, points, weightedPoints, { from: account })
      } else {
        // otherwise create the student ID and make the evaluation
        await gb.recordEvaluationForStudentIDText(
          studentIDText, activity, complexity, effort, weight, points, weightedPoints, { from: account })
      }

      self.setStatus('Transaction complete!')
      // set the values to blank so they won't accidentally submit again
      document.getElementById('activity').value = ''
      document.getElementById('complexity').value = ''
      document.getElementById('effort').value = ''
      document.getElementById('weight').value = ''
      document.getElementById('points').value = ''
      document.getElementById('weightedPoints').value = ''
    } catch (error) {
      console.log(error)
      self.setStatus('Error recording evaluation; see log.')
    }

    self.refreshEvaluations()
  }
}

window.addEventListener('load', async () => {
  if (getQueryVariable('localhost')) {
    var lhport = getQueryVariable('localhost')
    var lhurl = 'http://localhost:' + (lhport === 'undefined' ? '8551' : lhport)
    window.web3 = new Web3(new Web3.providers.HttpProvider(lhurl))
    readOnly = false
  // Checking if Web3 has been injected by the browser (MetaMask)
  } else if (typeof web3 !== 'undefined' && web3.currentProvider.isMetaMask) {
    console.log('MetaMask detected')
    // Use MetaMask's provider
    window.web3 = new Web3(web3.currentProvider)
    // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
    await window.ethereum.enable()
    readOnly = false
  } else {
    // fallback to infura
    window.web3 = new Web3(
      ZeroClientProvider({
        static: {
          eth_syncing: false,
          web3_clientVersion: 'ZeroClientProvider'
        },
        pollingInterval: 99999999, // not interested in polling for new blocks
        rpcUrl: 'https://rinkeby.infura.io/v3/e7d4f2bbbc454af2be410252249b787a',
        // account mgmt
        getAccounts: (cb) => cb(null, [])
      }))
    readOnly = true
  }

  App.start()
})
