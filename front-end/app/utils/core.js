import dayjs from 'dayjs';
import getWeb3Async from './web3';

import * as ContractAddressesRopsten from '../constants/contracts/ropsten/ContractAddresses';
import * as MyBitBurnerRopsten from '../constants/contracts/ropsten/MyBitBurner';
import * as MyBitTokenRopsten from '../constants/contracts/ropsten/MyBitToken';
import * as ERC20AirdropRopsten from '../constants/contracts/ropsten/ERC20Airdrop';

import * as ContractAddressesPrivate from '../constants/contracts/private/ContractAddresses';
import * as MyBitTokenPrivate from '../constants/contracts/private/MyBitToken';
import * as MyBitBurnerPrivate from '../constants/contracts/private/MyBitBurner';
import * as ERC20AirdropPrivate from '../constants/contracts/private/ERC20Airdrop';

import * as MyBitBurnerMainnet from '../constants/contracts/mainnet/MyBitBurner';
import * as MyBitTokenMainnet from '../constants/contracts/mainnet/MyBitToken';

import {
  ETHERSCAN_TX,
  ETHERSCAN_TX_FULL_PAGE
} from '../constants';
import axios from 'axios';
const Web3 = getWeb3Async();

const burnValue = "250";
const burnValueWei = Web3.utils.toWei(burnValue, 'ether');

const getContract = (name, network, address) => {
  let contract = undefined;
  if (network === "ropsten") {
    switch (name) {
      case 'ERC20Airdrop':
        address = ContractAddressesRopsten.AIRDROP_ADDRESS;
        contract = ERC20AirdropRopsten;
        break;
      case 'MyBitBurner':
        address = ContractAddressesRopsten.BURNER_ADDRESS;
        contract = MyBitBurnerRopsten;
        break;
      case 'MyBitToken':
        address = ContractAddressesRopsten.TOKEN_ADDRESS;
        contract = MyBitTokenRopsten;
        break;
    }
  } else if (network === "private") {
    switch (name) {
      case 'ERC20Airdrop':
        address = ContractAddressesPrivate.AIRDROP_ADDRESS;
        contract = ERC20AirdropPrivate;
        break;
      case 'MyBitBurner':
        address = ContractAddressesPrivate.BURNER_ADDRESS;
        contract = MyBitBurnerPrivate;
        break;
      case 'MyBitToken':
        address = ContractAddressesPrivate.TOKEN_ADDRESS;
        contract = MyBitTokenPrivate;
        break;
    }
  } else {
    switch (name) {
      case 'MyBitBurner':
        contract = MyBitBurnerMainnet;
        break;
      case 'MyBitToken':
        contract = MyBitTokenMainnet;
        break;
    }
  }

  return new Web3.eth.Contract(
    contract.ABI,
    address ? address : contract.ADDRESS
  );
}

export const loadMetamaskUserDetails = async (network) =>

  new Promise(async (resolve, reject) => {
    try {
      const accounts = await Web3.eth.getAccounts();
      const balance = await Web3.eth.getBalance(accounts[0]);

      const myBitTokenContract = getContract("MyBitToken", network);

      let myBitBalance = await myBitTokenContract.methods
        .balanceOf(accounts[0])
        .call();

      if (myBitBalance > 0) {
        myBitBalance = myBitBalance / Math.pow(10, 18);
      }

      const details = {
        userName: accounts[0],
        ethBalance: Web3.utils.fromWei(balance, 'ether'),
        myBitBalance,
      };
      resolve(details);
    } catch (error) {
      reject(error);
    }
  });

export const getApprovalLogs = async (network) =>
  new Promise(async (resolve, reject) => {
    try {

      const mybitTokenContract = getContract("MyBitToken", network);

      const logApprovals = await mybitTokenContract.getPastEvents(
        'Approval', {
          fromBlock: 0,
          toBlock: 'latest'
        },
      );

      resolve(logApprovals);

    } catch (error) {
      reject(error);
    }
  });

export const requestApproval = async (address, network, recipientCount, amountToken) =>
  new Promise(async (resolve, reject) => {
    try {
      const amountWei = recipientCount * amountToken * Math.pow(10, 18);

      const mybitTokenContract = getContract("MyBitToken", network);
      const burnerContract = getContract("MyBitBurner", network);
      const burnerAddress = burnerContract.options.address;

      const airdropContract = getContract("ERC20Airdrop", network);
      const airdropAddress = airdropContract.options.address;

      const estimatedGasBurner = await mybitTokenContract.methods.approve(burnerAddress, amountWei).estimateGas({
        from: address
      });
      const estimatedGasAirdrop = await mybitTokenContract.methods.approve(airdropAddress, amountWei).estimateGas({
        from: address
      });
      const gasPrice = await Web3.eth.getGasPrice();

      const approveResponse = await mybitTokenContract.methods
        .approve(burnerAddress, amountWei)
        .send({
          from: address,
          gas: estimatedGasBurner,
          gasPrice: gasPrice
        });

      const approveResponse2 = await mybitTokenContract.methods
        .approve(airdropAddress, amountWei)
        .send({
          from: address,
          gas: estimatedGasAirdrop,
          gasPrice: gasPrice
        });

      const {
        transactionHash
      } = approveResponse;
      checkTransactionStatus(transactionHash, resolve, reject, network);
    } catch (error) {
      reject(error);
    }
  });

export const getAllowanceOfAddress = async (address, network) =>
  new Promise(async (resolve, reject) => {
    try {
      const mybitTokenContract = getContract("MyBitToken", network);

      const allowance = await mybitTokenContract.methods.allowance(address, network === "ropsten" ? MyBitBurnerRopsten.ADDRESS : MyBitBurnerMainnet.ADDRESS).call();
      resolve(allowance >= burnValueWei);
    } catch (error) {
      reject(error);
    }
  });

export const getAirdropLog = async (network) =>
  new Promise(async (resolve, reject) => {
    try {
      const airdropContract = getContract("ERC20Airdrop", network);
      const logTransactions = await airdropContract.getPastEvents(
        'LogTokensTransferred',
        { fromBlock: 0, toBlock: 'latest' },
      );
      resolve(logTransactions);
    } catch (error) {
      reject(error);
    }
  });

export const createAirdrop = async (recipients, amount, network, sendingAddress) =>
  new Promise(async (resolve, reject) => {
    try {
      const tokenContract = getContract("MyBitToken", network);
      const airdropContract = getContract("ERC20Airdrop", network);

      const weiAmount = Web3.utils.toWei(amount.toString(), 'ether');
      const estimatedGas = await airdropContract.methods.sendAirdropEqual(
        tokenContract.options.address, recipients, weiAmount).estimateGas({
        from: sendingAddress
      });
      const gasPrice = await Web3.eth.getGasPrice();

      const airdropResponse = await airdropContract.methods
        .sendAirdropEqual(
          tokenContract.options.address,
          recipients,
          weiAmount
        )
        .send({
          from: sendingAddress,
          gas: estimatedGas,
          gasPrice: gasPrice
        });

      const {
        transactionHash
      } = airdropResponse;
      checkTransactionStatus(transactionHash, resolve, reject, network);
    } catch (error) {
      alert("Exception! error=" + error);
      console.log("Exception! error=" + error);
      reject(error);
    }
  });

const checkTransactionStatus = async (
  transactionHash,
  resolve,
  reject,
  network,
) => {
  try {
    const endpoint = ETHERSCAN_TX(transactionHash, network);
    const result = await fetch(endpoint);
    const jsronResult = await result.json();

    if (jsronResult.status === '1') {
      //checkTransactionConfirmation(transactionHash, resolve, reject, network);
      resolve(true)
    } else if (jsronResult.status === '0') {
      resolve(false);
    } else {
      setTimeout(
        () => checkTransactionStatus(transactionHash, resolve, reject, network),
        1000,
      );
    }
  } catch (err) {
    reject(err);
  }
};

const checkTransactionConfirmation = async (
  transactionHash,
  resolve,
  reject,
  network,
) => {
  try {
    const url = ETHERSCAN_TX_FULL_PAGE(transactionHash, network);
    const response = await axios.get(url);
    var myRe = new RegExp('(<font color=\'green\'>Success</font>)', 'g');
    var r = myRe.exec(response.data);
    if (r.length > 0) {
      resolve(true);
    }

    myRe = new RegExp('(<font color=\'red\'>Fail</font>)', 'g');
    r = myRe.exec(response.data);
    if (r.length > 0) {
      resolve(false);
    } else {
      setTimeout(
        () => checkTransactionConfirmation(transactionHash, resolve, reject),
        1000,
      );
    }
  } catch (err) {
    setTimeout(
      () => checkTransactionConfirmation(transactionHash, resolve, reject),
      1000,
    );
  }
}

export default Web3;
