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
var students = []
var refreshingEvaluations = false
var refreshingStudents = false
var alreadyStarted = false

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
    // handle multiple start events
    if (alreadyStarted) {
      return
    } else {
      alreadyStarted = true
    }

    var self = this

    // Bootstrap the GradeBook abstraction for Use.
    GradeBook.setProvider(web3.currentProvider)
    GradeBook.defaults({ gas: '250000' })

    // workaround https://github.com/trufflesuite/truffle-contract/issues/57
    if (typeof GradeBook.currentProvider.sendAsync !== 'function') {
      GradeBook.currentProvider.sendAsync = function () {
        return GradeBook.currentProvider.send.apply(GradeBook.currentProvider, arguments)
      }
    }

    window.gradebook = await GradeBook.deployed()
 
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
    document.getElementById('activity').value = getQueryVariable('activity')
    document.getElementById('complexity').value = getQueryVariable('complexity')
    document.getElementById('effort').value = getQueryVariable('effort')
    document.getElementById('weight').value = getQueryVariable('weight')
    document.getElementById('points').value = getQueryVariable('points')
    document.getElementById('weightedPoints').value = getQueryVariable('weightedPoints')

    // allow them to pass in the student text or the student ID.
    var filters = []
    var studentIDText = ''
    if (getQueryVariable('studentID')) {
      filters.studentID = getQueryVariable('studentID')
      studentIDText = web3.utils.toUtf8(await window.gradebook.getStudentIDText(filters.studentID))
    } else if (getQueryVariable('student')) {
      studentIDText = getQueryVariable('student')
      filters.studentID = await window.gradebook.getStudentID(studentIDText)
    }

    self.refreshStudents(studentIDText)

    if (getQueryVariable('recorderID')){
      filters.recorderID = getQueryVariable('recorderID')
    }
    if (getQueryVariable('activity')){
      filters.activity = getQueryVariable('activity')
    }
    if (getQueryVariable('evaluationID')){
      filters.evaluationID = getQueryVariable('evaluationID')
    }
    self.refreshEvaluations(filters)

    if (readOnly) { document.getElementById('read_only_message').style.display = 'block' }
  },

  setStatus: function (message) {
    var status = document.getElementById('status')
    status.innerHTML = message
  },

  refreshEvaluations: async function (filters = []) {
    // handle multiple start events
    if (refreshingEvaluations) {
      return
    } else {
      refreshingEvaluations = true
    }

    var evaluationTable = document.getElementById('evaluationTable')
    if (!evaluationTable) {
      return
    }

    var evals = await edublocs.getEvaluations(filters)

    for (let i = 0; i < evals.length; i++) {
      var row = evaluationTable.insertRow(-1)
      row.insertCell(0).innerHTML = '<a href="https://ropsten.etherscan.io/tx/' + evals[i][12] + '">' +
      new Date(evals[i][13] * 1000).toLocaleString() + '</a>'
      row.insertCell(1).innerHTML = '<a href="https://ropsten.etherscan.io/address/' +
      evals[i][2] + '">' +
      evals[i][2].substring(0, 8) + '…</a>'
      row.insertCell(2).innerHTML = web3.utils.toUtf8(evals[i][4])
      row.insertCell(3).innerHTML = evals[i][5]
      row.insertCell(4).innerHTML = evals[i][6] / 10
      row.insertCell(5).innerHTML = evals[i][7] / 10
      row.insertCell(6).innerHTML = evals[i][8] / 10
      row.insertCell(7).innerHTML = evals[i][9] / 10
      row.insertCell(8).innerHTML = evals[i][10] / 10
    }

    refreshingEvaluations = false
  },

  refreshStudents: async function (selectedStudent) {
    // handle multiple start events
    if (refreshingStudents) {
      return
    } else {
      refreshingStudents = true
    }

    var self = this

    var gb = await self.gradeBook()
    gb.getStudentCount.call().then(function (value) {
      var studentElement = document.getElementById('student')
      let current
      let promiseChain = Promise.resolve()
      for (let i = 1; i <= value.toNumber(); i++) {
        const makeNextPromise = (current) => () => {
          return gb.getStudentIDText.call(i)
            .then((text) => {
              var option = document.createElement('option')
              const textUTF8 = web3.utils.toUtf8(text)
              option.text = textUTF8
              option.value = i
              option.selected = (textUTF8 === selectedStudent)
              studentElement.add(option)
              students.push(textUTF8)
            })
        }
        promiseChain = promiseChain.then(makeNextPromise(current))
      };
      studentElement.innerHTML = value.valueOf()
      refreshingStudents = false
    }).catch(function (e) {
      console.log(e)
      refreshingStudents = false
      self.setStatus('Error getting evaluation count; see log.')
    })
  },

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

    // If a duplicate is entered, just select it and continue
    const index = students.indexOf(studentIDText)
    if (students.indexOf(studentIDText) > -1) {
      self.setStatus('Student ID already exists, so you may proceed to record an evaluation.')
      const student = document.getElementById('student')
      student.selectedIndex = index
      student.focus()
      return
    }

    this.setStatus('Initiating transaction... (please wait)')

    var gb = await self.gradeBook()
    gb.makeStudentID(studentIDText, { from: account }).then(async function () {
      self.setStatus('Created student ID ' + studentIDText)
      await self.refreshStudents(studentIDText)
      document.getElementById('activity').focus()
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error creating student ID; see log.')
    })
  },

  recordEvaluation: async function () {
    var self = this

    var studentID = document.getElementById('student').value
    var activity = document.getElementById('activity').value
    var complexity = document.getElementById('complexity').value * 10
    var effort = document.getElementById('effort').value * 10
    var weight = document.getElementById('weight').value * 10
    var points = document.getElementById('points').value * 10
    var weightedPoints = document.getElementById('weightedPoints').value * 10

    this.setStatus('Initiating transaction... (please wait)')

    var gb = await self.gradeBook()
    gb.recordEvaluation(
      studentID, activity, complexity, effort, weight, points, weightedPoints, { from: account }).then(function () {
      self.setStatus('Transaction complete!')
      document.getElementById('activity').value = ''
      document.getElementById('complexity').value = ''
      document.getElementById('effort').value = ''
      document.getElementById('weight').value = ''
      document.getElementById('points').value = ''
      document.getElementById('weightedPoints').value = ''
      self.refreshEvaluations()
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error recording evaluation; see log.')
    })
  }
}

window.addEventListener('load', function () {

  if (getQueryVariable('localhost')) {
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
    readOnly = false
  // Checking if Web3 has been injected by the browser (MetaMask)
  } else if (typeof web3 !== 'undefined' && web3.currentProvider.isMetaMask) {
    // Use MetaMask's provider
    window.web3 = new Web3(web3.currentProvider)
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
        rpcUrl: 'https://ropsten.infura.io/nxqvLpMcFgty1XUFr67x',
        // account mgmt
        getAccounts: (cb) => cb(null, [])
      }))
    readOnly = true
  }

  App.start()
})
