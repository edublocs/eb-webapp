// eslint warnings
/* global web3 */

// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'

// Import libraries we need.
import { default as contract } from 'truffle-contract'
import { Parser as Json2csvParser } from 'json2csv'
import { default as Blob } from 'blob'

// Import our contract artifacts and turn them into usable abstractions.
import gradeBookArtifacts from '../../build/contracts/GradeBook.json'

// GradeBook is our usable abstraction, which we'll use through the code below.
var GradeBook = contract(gradeBookArtifacts)

// Helper function for finding the gradebook global variable
async function gradeBook () {
  if (window.gradebook) {
    return window.gradebook
  } else {
    window.gradebook = await GradeBook.deployed()
    return window.gradebook
  }
}

// Iterate over events to find the event for this specific evaluation
function findEventByEvaluationID (evaluationID, events) {
  for (let i = 0; i < events.length; i++) {
    if (events[i].args.evaluationID.toNumber() === evaluationID) { return events[i] }
  }
  return null
}

// returns an array of students. Student ID 1-based
// but the array is of course zero-based.
async function getStudents () {
  var result = []
  const gb = await gradeBook()
  var count = await gb.getStudentCount()
  for (let studentID = 1; studentID <= count; studentID++) {
    var rawText = await gb.getStudentIDText(studentID)
    var text
    try {
      text = web3.utils.toUtf8(rawText)
    } catch (e) {
      console.log(e)
      text = rawText
    }
    result.push(text)
  }
  return result
}

// returns an array of evaluations according to the filter provided
async function getEvaluations (filters = []) {
  var result = []
  const gb = await gradeBook()

  // logged events contain block numbers, and therefore times
  var events = await getEvents(filters)

  // recorderID filtering preferred over studentID filtering
  // filter inside the contract only if there is a single value
  const count =
    ((filters.recorderID && filters.recorderID.length === 1)
      ? await gb.getEvaluationCountByRecorderID.call(filters.recorderID[0])
      : ((filters.studentID && filters.studentID.length === 1)
        ? await gb.getEvaluationCountByStudentID.call(filters.studentID[0])
        : await gb.getEvaluationCount.call()))

  // iterate over the (possibly) filtered evaluations, applying further filtering
  for (let i = 0; i < count; i++) {
    var evaluation = ((filters.recorderID && filters.recorderID.length === 1)
      ? await gb.getEvaluationByRecorderID.call(filters.recorderID[0], i)
      : ((filters.studentID && filters.studentID.length === 1)
        ? await gb.getEvaluationByStudentID.call(filters.studentID[0], i)
        : await gb.getEvaluation.call(i)))
    var evaluationID = evaluation[0].toNumber()
    var recorderID = evaluation[1].toNumber()
    var studentID = evaluation[3].toNumber()
    var activity = evaluation[5].toNumber()

    // apply additional filters
    if (filters.activity && !filters.activity.includes(activity)) { continue }
    if (filters.evaluationID && !filters.evaluationID.includes(evaluationID)) { continue }
    // recorderID filtered again manually just in case it is multiple
    if (filters.recorderID && !filters.recorderID.includes(recorderID)) { continue }
    // studentID filtered again manually just in case it is multiple
    // and student ID has to be applied manually if a single recorder ID is used,
    if (filters.studentID && !filters.studentID.includes(studentID)) { continue }

    // find the event that matches this evaluation ID; lets us find out
    // the block number and transaction hash, which are not available
    // from within Solidity because we don't store them ($$$).
    var evnt = findEventByEvaluationID(evaluationID, events)

    // get the block for the event so we can figure out the timestamp
    var block = await web3.eth.getBlock(evnt.blockNumber)

    result.push({
      evaluationID: evaluationID,
      recorderID: recorderID,
      recorderAddress: evaluation[2],
      studentID: studentID,
      studentIDText: web3.utils.toUtf8(evaluation[4]),
      activity: activity,
      complexity: evaluation[6].toNumber(),
      effort: evaluation[7].toNumber(),
      weight: evaluation[8].toNumber(),
      points: evaluation[9].toNumber(),
      weightedPoints: evaluation[10].toNumber(),
      blockNumber: evnt.blockNumber,
      transactionHash: evnt.transactionHash,
      timestamp: block.timestamp
    })
  }

  return result
}

// Handle function that doesn't return a JS promise
const Promisify = (inner) =>
  new Promise((resolve, reject) =>
    inner((err, res) => {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    })
  )

// Get full log of events from the contract, filtered as specified
// (Note: the filters don't seem to work, so it's pulling everything)
async function getEvents (filters = []) {
  const gb = await gradeBook()
  filters.fromBlock = 0
  filters.toBlock = 'latest'
  // recorderID, studentID and activity are valid filters because they
  // are indexed.  Any other properties (such as evaluationID) must be
  // filtered out after the fact, because they are ignored.

  try {
    var events = gb.allEvents(filters)
    return await Promisify(cb => events.get(cb))
  } catch (error) {
    console.log(error)
  }
}

// Download the provided CSV as a file by the provided name
function downloadCSV (file, exportedFilename) {
  const blob = new Blob([file], { type: 'text/csv;charset=utf-8;' })
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, exportedFilename)
  } else {
    const link = document.createElement('a')
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', exportedFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

async function exportAndDownloadCSV (filters, _delimiter = ',') {
  const headers = {
    evaluationID: 'evaluationID',
    recorderID: 'recorderID',
    recorderAddress: 'recorderAddress',
    studentID: 'studentID',
    studentIDText: 'studentIDText',
    activity: 'activity',
    complexity: 'complexity',
    effort: 'effort',
    weight: 'weight',
    points: 'points',
    weightedPoints: 'weightedPoints',
    blockNumber: 'blockNumber',
    transactionHash: 'transactionHash',
    timestamp: 'timestamp'
  }

  let csv
  try {
    const opts = { headers, delimiter: _delimiter }
    const parser = new Json2csvParser(opts)
    const evals = await getEvaluations(filters)
    csv = parser.parse(evals)
  } catch (err) {
    console.error(err)
  }

  // trigger the download
  downloadCSV(csv, 'evaluations.csv')
}

export default { exportAndDownloadCSV, gradeBook, getEvaluations, getStudents }
