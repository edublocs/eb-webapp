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
var students = []
var previousEvaluationCount = 0
var evaluations = new Map()
var prevEvaluationCount = new Map()
prevEvaluationCount['none'] = 0
prevEvaluationCount['recorderID'] = 0
prevEvaluationCount['studentID'] = 0

function getQueryVariable(variable) {
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
  start: function () {
    var self = this

    // Bootstrap the GradeBook abstraction for Use.
    GradeBook.setProvider(web3.currentProvider)
    GradeBook.defaults({ gas: '220000' })

    // workaround https://github.com/trufflesuite/truffle-contract/issues/57
    if (typeof GradeBook.currentProvider.sendAsync !== 'function') {
      GradeBook.currentProvider.sendAsync = function () {
        return GradeBook.currentProvider.send.apply(GradeBook.currentProvider, arguments)
      }
    }

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function (err, accs) {
      if (accs.length === 0 && !readOnly) {
        if (web3.currentProvider.isMetaMask === true) {
          alert('Please log in to MetaMask and refresh this page in order to record new data.')
        } else {
          alert('No accounts found! Make sure your Ethereum client is configured correctly.')
        }
        readOnly = true
        console.log(err)
      } else {
        accounts = accs
        account = accounts[0]
      }

      document.getElementById('activity').value = getQueryVariable('activity')
      document.getElementById('complexity').value = getQueryVariable('complexity')
      document.getElementById('effort').value = getQueryVariable('effort')
      document.getElementById('weight').value = getQueryVariable('weight')
      document.getElementById('points').value = getQueryVariable('points')
      document.getElementById('weightedPoints').value = getQueryVariable('weightedPoints')

      self.refreshStudents(getQueryVariable('studentID'))
      self.refreshEvaluations()
      self.getEvaluations()
      self.getEvaluations('recorderID', 1)
      self.getEvaluations('studentID', 1)

      if (readOnly) { document.getElementById('readonlymessage').style.display = 'block' }
    })
  },

  setStatus: function (message) {
    var status = document.getElementById('status')
    status.innerHTML = message
  },

  getEvaluations: function (filter = 'none', filterValue = 0) {
    var self = this
    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return (filter === 'recorderID' ? gb.getEvaluationCountByRecorderID.call(filterValue)
        : (filter === 'studentID' ? gb.getEvaluationCountByStudentID.call(filterValue)
          : gb.getEvaluationCount.call()))
    }).then(function (value) {
      var evaluationCount = value.valueOf()
      evaluations[filter] = []
      let current
      let promiseChain = Promise.resolve()
      for (let i = prevEvaluationCount[filter]; i < evaluationCount; i++) {
        const makeNextPromise = (current) => () => {
          return (filter === 'recorderID' ? gb.getEvaluationByRecorderID(filterValue, i)
            : (filter === 'studentID' ? gb.getEvaluationByStudentID(filterValue, i)
              : gb.getEvaluation(i)))
            .then((evaluation) => {
              var offset = filter === 'none' ? 2 : 0
              evaluations[filter].push([
                (filter !== 'recorderID' ? evaluation[0].toNumber() : filterValue.valueOf()),
                (filter !== 'recorderID' ? evaluation[1] : ''),
                (filter !== 'studentID' ? evaluation[0 + offset].toNumber() : filterValue.valueOf()),
                (filter !== 'studentID' ? web3.utils.toUtf8(evaluation[1 + offset]) : students[filterValue - 1]),
                evaluation[2 + offset].toNumber(),
                evaluation[3 + offset].toNumber(),
                evaluation[4 + offset].toNumber(),
                evaluation[5 + offset].toNumber(),
                evaluation[6 + offset].toNumber(),
                evaluation[7 + offset].toNumber()
              ])
              if (evaluationCount - 1 === i) {
                console.log(filter)
                console.log(evaluations[filter])
              }
            })
        }
        promiseChain = promiseChain.then(makeNextPromise(current))
      }
      // next time start loading from here
      prevEvaluationCount[filter] = evaluationCount
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error getting evaluations; see log.')
    })
  },

  refreshEvaluations: function () {
    var self = this

    var evaluationTable = document.getElementById('evaluations')
    if (!evaluationTable) {
      return
    }

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.getEvaluationCount.call()
    }).then(function (value) {
      var evaluationCount = value.valueOf()
      var evaluationCountElement = document.getElementById('EvaluationCount')
      evaluationCountElement.innerHTML = evaluationCount
      let current
      let promiseChain = Promise.resolve()
      for (let i = previousEvaluationCount; i < evaluationCount; i++) {
        const makeNextPromise = (current) => () => {
          return gb.getEvaluation(i)
            .then((evaluation) => {
              var row = evaluationTable.insertRow(-1)
              // Recorder ID not currently shown
              // row.insertCell(0).innerHTML = evaluation[0].toNumber()
              row.insertCell(0).innerHTML = '<a href="https://ropsten.etherscan.io/address/' +
                evaluation[1] + '">' + evaluation[1].substring(0, 8) + '…</a>'
              // Student ID not currently shown
              // row.insertCell(1).innerHTML = evaluation[2].toNumber()
              row.insertCell(1).innerHTML = web3.utils.toUtf8(evaluation[3])
              row.insertCell(2).innerHTML = evaluation[4].toNumber()
              row.insertCell(3).innerHTML = evaluation[5].toNumber() / 10
              row.insertCell(4).innerHTML = evaluation[6].toNumber() / 10
              row.insertCell(5).innerHTML = evaluation[7].toNumber() / 10
              row.insertCell(6).innerHTML = evaluation[8].toNumber() / 10
              row.insertCell(7).innerHTML = evaluation[9].toNumber() / 10
            })
        }
        promiseChain = promiseChain.then(makeNextPromise(current))
      }
      // next time start loading from here
      previousEvaluationCount = evaluationCount
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error getting evaluations; see log.')
    })
  },

  refreshStudents: function (selectedStudent) {
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

  makeStudentID: function () {
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

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.makeStudentID(studentIDText, { from: account })
    }).then(function () {
      self.setStatus('Created student ID ' + studentIDText)
      self.refreshStudents(studentIDText)
      document.getElementById('activity').focus()
    }).catch(function (e) {
      console.log(e)
      self.setStatus('Error creating student ID; see log.')
    })
  },

  recordEvaluation: function () {
    var self = this

    var studentID = document.getElementById('student').value
    var activity = document.getElementById('activity').value
    var complexity = document.getElementById('complexity').value * 10
    var effort = document.getElementById('effort').value * 10
    var weight = document.getElementById('weight').value * 10
    var points = document.getElementById('points').value * 10
    var weightedPoints = document.getElementById('weightedPoints').value * 10

    this.setStatus('Initiating transaction... (please wait)')

    var gb
    GradeBook.deployed().then(function (instance) {
      gb = instance
      return gb.recordEvaluation(
        studentID, activity, complexity, effort, weight, points, weightedPoints, { from: account })
    }).then(function () {
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
    window.web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/nxqvLpMcFgty1XUFr67x'))
    readOnly = true
  }

  App.start()
})
