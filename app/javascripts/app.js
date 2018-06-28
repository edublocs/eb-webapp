// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import gradebook_artifacts from '../../build/contracts/GradeBook.json'

// GradeBook is our usable abstraction, which we'll use through the code below.
var GradeBook = contract(gradebook_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;

window.App = {
  start: function() {
    var self = this;

    // Bootstrap the GradeBook abstraction for Use.
    GradeBook.setProvider(web3.currentProvider);

    // Get the initial account balance so it can be displayed.
    web3.eth.getAccounts(function(err, accs) {
      if (err != null) {
        alert("There was an error fetching your accounts.");
        return;
      }

      if (accs.length == 0) {
        alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
        return;
      }

      accounts = accs;
      account = accounts[0];

      self.refreshEvaluationCount();
      self.refreshStudents();
    });
  },

  setStatus: function(message) {
    var status = document.getElementById("status");
    status.innerHTML = message;
  },

  refreshEvaluationCount: function() {
    var self = this;

    var gb;
    GradeBook.deployed().then(function(instance) {
      gb = instance;
      return gb.getEvaluationCount.call();
    }).then(function(value) {
      var evaluationCount_element = document.getElementById("EvaluationCount");
      evaluationCount_element.innerHTML = value.valueOf();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting evaluation count; see log.");
    });
  },

  refreshStudents: function() {
    var self = this;

    var gb;
    GradeBook.deployed().then(function(instance) {
      gb = instance;
      return gb.getStudentCount.call();
    }).then(function(value) {
      var student_element = document.getElementById("student");
      console.log(value.toNumber());
      let current;
      let promiseChain = Promise.resolve();
      for (let i=1; i <= value.toNumber(); i++) {
        const makeNextPromise = (current) => () => {
        return gb.getStudentIDText.call(i)
          .then((text) => {
            console.log(text);
            var option = document.createElement("option")
            option.text = web3.utils.toUtf8(text);
            option.value = i;
            student_element.add(option);
          });
        }
        promiseChain = promiseChain.then(makeNextPromise(current));
      };
      student_element.innerHTML = value.valueOf();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error getting evaluation count; see log.");
    });
  },

  makeStudentID: function() {
    var self = this;

    var studentIDText = document.getElementById("studentIDText").value;

    this.setStatus("Initiating transaction... (please wait)");

    var gb;
    GradeBook.deployed().then(function(instance) {
      gb = instance;
      return gb.makeStudentID(studentIDText, {from: account});
    }).then(function() {
      self.setStatus("Transaction complete!");
      self.refreshStudents();
    }).catch(function(e) {
      console.log(e);
      self.setStatus("Error creating student ID; see log.");
    });
  }
};

window.addEventListener('load', function() {
  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
    // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    // fallback to infura
    window.web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/nxqvLpMcFgty1XUFr67x"));
  }

  App.start();
});
