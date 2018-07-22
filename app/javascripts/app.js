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

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function (err, accs) {
      if (accs && accs.length === 0 && !readOnly) {
        if (web3.currentProvider.isMetaMask === true) {
          alert('Please log in to MetaMask and refresh this page in order to record new data.')
        } else {
          alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
        }
        readOnly = true
        console.log(err)
      } else {
        accounts = accs
        account = accounts ? accounts[0] : null
      }

      document.getElementById('activity').value = getQueryVariable('activity')
      document.getElementById('complexity').value = getQueryVariable('complexity')
      document.getElementById('effort').value = getQueryVariable('effort')
      document.getElementById('weight').value = getQueryVariable('weight')
      document.getElementById('points').value = getQueryVariable('points')
      document.getElementById('weightedPoints').value = getQueryVariable('weightedPoints')

      self.refreshStudents(getQueryVariable('studentID'))
      self.refreshEvaluations()

      if (readOnly) { document.getElementById('readonlymessage').style.display = 'block' }
    })
  },

  setStatus: function (message) {
    var status = document.getElementById('status')
    status.innerHTML = message
  },

  refreshEvaluations: async function () {
    var evaluationTable = document.getElementById('evaluations')
    if (!evaluationTable) {
      return
    }

    var evals = await edublocs.getEvaluations()

    for (let i = 0; i < evals.length; i++) {
      var row = evaluationTable.insertRow(-1)
      // Recorder ID not currently shown
      // row.insertCell(0).innerHTML = evaluation[0].toNumber()
      row.insertCell(0).innerHTML = '<a href="https://ropsten.etherscan.io/address/' +
      evals[i][2] + '">' +
      evals[i][2].substring(0, 8) + '…</a>'
      // Student ID not currently shown
      // row.insertCell(1).innerHTML = evaluation[2].toNumber()
      row.insertCell(1).innerHTML = web3.utils.toUtf8(evals[i][4])
      row.insertCell(2).innerHTML = evals[i][5]
      row.insertCell(3).innerHTML = evals[i][6] / 10
      row.insertCell(4).innerHTML = evals[i][7] / 10
      row.insertCell(5).innerHTML = evals[i][8] / 10
      row.insertCell(6).innerHTML = evals[i][9] / 10
      row.insertCell(7).innerHTML = evals[i][10] / 10
    }
  },

  refreshStudents: async function (selectedStudent) {
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
    }).catch(function (e) {
      console.log(e)
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
  if (window.location.search === '?localhost') {
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
    readOnly = false
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  } else if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
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
