var myb = artifacts.require("ERC20");
var burner = artifacts.require("MyBitBurner");
var airdrop = artifacts.require("ERC20Airdrop");

const PREC = 18;
const TOKEN_SUPPLY = 179997249914159265359037985; // mainnet value
console.log("PREC=" + PREC + " TOKEN_SUPPLY=" + TOKEN_SUPPLY);

module.exports = async function(deployer) {
  deployer.deploy(myb, TOKEN_SUPPLY, "MyBit", PREC, "MYB").then(function(mybDeployed) {
    console.log("Deploying burner with myb.address=" + myb.address);
    return deployer.deploy(burner, myb.address).then(function(burnerDeployed) {
      console.log("Deploying airdrop with burner.address=" + burner.address);
      return deployer.deploy(airdrop, burner.address).then(function(airdropDeployed) {
        burnerDeployed.authorizeBurner(airdrop.address);
        console.log("Authorized airdrop.address=" + airdrop.address + " as burner");
        writeToFile(deployer);
      });
    });
  });
};

const writeToFile = function(deployer) {
  console.log("-------------------------------------------------------------------");
  console.log("MyBit contract = " + myb.address);
  console.log("MyBitBurner contract = " + burner.address);
  console.log("ERC20Airdrop contract = " + airdrop.address);
  console.log("-------------------------------------------------------------------");

  const fs = require('fs');
  contractAddresses =
    "export const TOKEN_ADDRESS = '" + myb.address + "';\n" +
    "export const BURNER_ADDRESS = '" + burner.address + "';\n" +
    "export const AIRDROP_ADDRESS = '" + airdrop.address + "';";

  var subdir = (deployer.network === "ropsten" ? "ropsten" : "private");
  var filename = './front-end/app/constants/contracts/' + subdir + '/ContractAddresses.js';
  fs.writeFile(filename, contractAddresses, (err) => {
    if (err) {
      console.log("Error writing contract addresses!");
    } else {
      console.log('Wrote contract addresses to: ' + filename);
    }
  });
};