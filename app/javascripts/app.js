// eslint warnings
/* global web3, alert, App */

// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'

// Import libraries we need.
import { default as Web3 } from 'web3'
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import gradeBookArtifacts from '../../build/contracts/GradeBook.json'

// GradeBook is our usable abstraction, which we'll use through the code below.
var GradeBook = contract(gradeBookArtifacts)

var accounts
var account
var readOnly = false

window.App = {
  start: function () {
    var self = this

    // Bootstrap the GradeBook abstraction for Use.
    GradeBook.setProvider(web3.currentProvider)

    // workaround https://github.com/trufflesuite/truffle-contract/issues/57
    if (typeof GradeBook.currentProvider.sendAsync !== "function") {
      GradeBook.currentProvider.sendAsync = function() {
        return GradeBook.currentProvider.send.apply( GradeBook.currentProvider, arguments);
      }
    }

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function (err, accs) {
      if (accs.length === 0 && !readOnly) {
        if (web3.currentProvider.isMetaMask === true) {
          alert('Please log in to MetaMask and refresh this page in order to record new data.')
        } else {
          alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.")
        }
        readOnly = true
      } else {
        accounts = accs
        account = accounts[0]
      }

      self.refreshStudents()
      self.refreshEvaluations()

      if (readOnly) { document.getElementById('readonlymessage').style.display = 'block' }
    })
  },

  setStatus: function (message) {
    var status = document.getElementById('status')
    status.innerHTML = message
  },

  refreshEvaluations: function () {
    var self = this

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.getEvaluationCount.call()
    }).then(function (value) {
      var evaluationCount = value.valueOf()
      var evaluationCountElement = document.getElementById('EvaluationCount')
      evaluationCountElement.innerHTML = evaluationCount
      var evaluationTable = document.getElementById('evaluations')
      let current
      let promiseChain = Promise.resolve()
      for (let i = 0; i < evaluationCount; i++) {
        const makeNextPromise = (current) => () => {
          return gb.getEvaluation(i)
            .then((evaluation) => {
              var row = evaluationTable.insertRow(-1)
              row.insertCell(0).innerHTML=evaluation[0].toNumber()
              row.insertCell(1).innerHTML=evaluation[1]
              row.insertCell(2).innerHTML=evaluation[2].toNumber()
              row.insertCell(3).innerHTML=web3.utils.toUtf8(evaluation[3])
              row.insertCell(4).innerHTML=evaluation[4].toNumber()
              row.insertCell(5).innerHTML=evaluation[5].toNumber()
              row.insertCell(6).innerHTML=evaluation[6].toNumber()
              row.insertCell(7).innerHTML=evaluation[7].toNumber()
              row.insertCell(8).innerHTML=evaluation[8].toNumber()
              row.insertCell(9).innerHTML=evaluation[9].toNumber()
            })
        }
        promiseChain = promiseChain.then(makeNextPromise(current))
      }
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error getting evaluations; see log.')
    })
  },

  refreshStudents: function () {
    var self = this

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.getStudentCount.call()
    }).then(function (value) {
      var studentElement = document.getElementById('student')
      let current
      let promiseChain = Promise.resolve()
      for (let i = 1; i <= value.toNumber(); i++) {
        const makeNextPromise = (current) => () => {
          return gb.getStudentIDText.call(i)
            .then((text) => {
              var option = document.createElement('option')
              option.text = web3.utils.toUtf8(text)
              option.value = i
              studentElement.add(option)
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

  makeStudentID: function () {
    var self = this

    var studentIDText = document.getElementById('studentIDText').value

    this.setStatus('Initiating transaction... (please wait)')

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.makeStudentID(studentIDText, { from: account })
    }).then(function () {
      self.setStatus('Transaction complete!')
      self.refreshStudents()
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error creating student ID; see log.')
    })
  },

  recordEvaluation: function () {
    var self = this

    var studentID = document.getElementById('student').value
    var activity = document.getElementById('activity').value
    var complexity = document.getElementById('complexity').value
    var effort = document.getElementById('effort').value
    var weight = document.getElementById('weight').value
    var points = document.getElementById('points').value
    var weightedPoints = document.getElementById('weightedPoints').value

    this.setStatus('Initiating transaction... (please wait)')

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.recordEvaluation(
        studentID, activity, complexity, effort, weight, points, weightedPoints, { from: account })
    }).then(function () {
      self.setStatus('Transaction complete!')
      self.refreshEvaluations()
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error recording evaluation; see log.')
    })
  }
}

window.addEventListener('load', function () {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider)
    readOnly = false
  } else {
    // fallback to infura
    window.web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/nxqvLpMcFgty1XUFr67x'))
    readOnly = true
  }

  App.start()
})
