// eslint warnings
/* global web3 */

// Import the page's CSS. Webpack will know what to do with it.
import '../stylesheets/app.css'

// Import libraries we need.
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import gradeBookArtifacts from '../../build/contracts/GradeBook.json'

// GradeBook is our usable abstraction, which we'll use through the code below.
var GradeBook = contract(gradeBookArtifacts)

async function gradeBook () {
  if (window.gradebook) {
    return window.gradebook
  } else {
    window.gradebook = await GradeBook.deployed()
    return window.gradebook
  }
}

function findEventByEvaluationID (evaluationID, events) {
  for (let i = 0; i < events.length; i++) {
    if (events[i].args.evaluationID.toNumber() === evaluationID) { return events[i] }
  }
  return null
}

async function getEvaluations (filters = []) {
  var result = []
  const gb = await gradeBook()

  // logged events contain block numbers, and therefore times
  var events = await getEvents(filters)

  // the filter that comes first gets processed first
  const count =
    (filters.recorderID ? await gb.getEvaluationCountByRecorderID.call(filters.recorderID)
      : (filters.studentID ? await gb.getEvaluationCountByStudentID.call(filters.studentID)
        : await gb.getEvaluationCount.call()))
  for (let i = 0; i < count; i++) {
    var evaluation = (filters.recorderID ? await gb.getEvaluationByRecorderID.call(filters.recorderID, i)
      : (filters.studentID ? await gb.getEvaluationByStudentID.call(filters.studentID, i)
        : await gb.getEvaluation.call(i)))
    var evaluationID = evaluation[0].toNumber()
    var recorderID = evaluation[1].toNumber()
    var studentID = evaluation[3].toNumber()
    var activity = evaluation[5].toNumber()

    // apply filters
    if (filters.evaluationID && !filters.evaluationID.includes(evaluationID)) { continue }
    if (filters.activity && !filters.activity.includes(activity)) { continue }

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

export default { gradeBook, getEvaluations }
