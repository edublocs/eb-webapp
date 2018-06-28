var GradeBook = artifacts.require("GradeBook");

module.exports = function(deployer) {
  deployer.deploy(GradeBook);
};
