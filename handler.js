const AWS = require("aws-sdk");
const express = require("express");
const serverless = require("serverless-http");
const { v4: uuidv4 } = require('uuid');
const firebaseAdmin = require('firebase-admin');
const { recoverPersonalSignature } = require('@metamask/eth-sig-util');
const app = express();
const Web3 = require('web3');
const contract = require('truffle-contract');
const factory = require('./build/contracts/CampaignFactory.json');
const campaign = require('./build/contracts/Campaign.json');
// const web3Provider = 'http://localhost:7545'
const web3Provider = "https://rinkeby.infura.io/v3/c32c3560feee48ee9a922e27e6c30052";

let web3 = new Web3(new Web3.providers.HttpProvider(web3Provider))
// const contractAddress = '0x18A5C415da30cd97485a7d13D90FE702249F4936'
// const contractAddress = '0x9c2Ff4d3FD42b75555AE11D44cCd4354812Df7C6'
const contractAddress = '0xE124cEE21A6DE685D24AaC6487CC9AAB07350A38'
const LMS = contract(factory)
const Campaign = contract(campaign)
LMS.setProvider(web3.currentProvider)
Campaign.setProvider(web3.currentProvider)
// const contactList = new web3.eth.Contract(JSON.stringify(factory), contractAddress);
const USERS_TABLE = process.env.USERS_TABLE;
const SECRET = process.env.SECRET
const ACC = process.env.SERVICE_ACC
const PRIVATE = process.env.PRIVATE
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();
const environment = {
  firebase: {
    apiKey: "AIzaSyC0I6nzs1_Xpqcfgtdnbrxvoevr_sJ6ooI",
    authDomain: "blockchaincharity-3dc53.firebaseapp.com",
    projectId: "blockchaincharity-3dc53",
    storageBucket: "blockchaincharity-3dc53.appspot.com",
    messagingSenderId: "812224590431",
    appId: "1:812224590431:web:d6902c5766457ab8cf21ea",
    measurementId: "G-WQ3E74D4PD"
  },
  production: false
};
const admin = firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert({ ...JSON.parse(ACC), privateKey: PRIVATE }),
  databaseURL: `https:/blockchaincharity-3dc53.firebaseio.com`,
});

// const admin = initializeApp(environment.firebase);
// const analytics = getAnalytics(admin);
app.use(express.json());
app.get("/v1/deprecated/users/:userId", async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.get(params).promise();
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not retreive user" });
  }
});

app.post("/users", async function (req, res) {
  const { userId, name } = req.body;
  if (typeof userId !== "string") {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== "string") {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Could not create user" });
  }
});

app.get("/to-hex", async (req, res) => {
  const result = toHex()
  res.send(result);
});

const toHex = (stringToConvert = "Pham Hoang Phuc Test CI/CD") =>
  stringToConvert
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");


const walletApi = async (req, res) => {
  try {
    const { walletAddr, signature, nonce } = req.body;
    // const signerAddr = ethers.utils.verifyMessage(nonce, signature);
    const recoveredAddress = recoverPersonalSignature({
      data: `0x${toHex(nonce)}`,
      signature,
    });
    console.log(recoveredAddress === walletAddr.toLowerCase());
    if (recoveredAddress !== walletAddr.toLowerCase()) {
      throw new Error("wrong_signature");
    }
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(walletAddr)
      .get();


    // const token = jwt.sign({
    //   "aud": "authenticated",
    //   "exp": Math.floor((Date.now() / 1000) + (60 * 60)),
    //   "sub": userDoc?.uid,
    //   "user_metadata": {
    //     id: userDoc?.uid,
    //   },
    //   "role": "authenticated"
    // }, SECRET);
    const token = await admin.auth().createCustomToken(walletAddr);
    res.status(200).json({ userDoc, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const nonceApi = async (req, res) => {
  const { walletAddr } = req.body;
  try {
    const userDoc = await admin
      .firestore()
      .collection('users')
      .doc(walletAddr)
      .get();

    const nonce = uuidv4();
    const userDocRef = await admin
      .firestore()
      .collection('users')
      .doc(walletAddr)
    if (userDoc.exists) {
      // The user document exists already, so just return the nonce
      // const existingNonce = userDoc?.data()?.nonce;
      userDocRef.update({
        nonce
      });
      return res.status(200).json({ nonce });
    } else {
      // The user document does not exist, create it first

      // Create an Auth user
      const createdUser = await admin.auth().createUser({
        uid: walletAddr,
        displayName: "Phuc",
        gender: "male"
      });

      // Associate the nonce with that user
      await admin.firestore().collection('users').doc(createdUser.uid).set({
        nonce,
        displayName: "Phuc",
        gender: "male"
      });

      return res.status(200).json({ nonce });
    }
  }
  catch (err) {
    console.log(err);
    return res.status(500).json({ err })
  }
}

const login = async (req, res) => {

  // const provider = new ethers.provider.Web3Provider(window.ethereum);
  // await provider.send("eth_requestAccounts", []);
  // const signer = provider.getSigner();
  // const walletAddr = await signer.getAddress();
  const { signature, address: walletAddr } = req.body;

  let response = await fetch("/auth/nonce", {
    method: "POST",
    body: JSON.stringify({
      address,
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })

  const { nonce } = await response.json();
  // const signature = await signer.signMessage(nonce);
  // console.log(`signature`, signature)


  response = await fetch("/auth/wallet", {
    method: "POST",
    body: JSON.stringify({
      walletAddr,
      nonce,
      signature,
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })
  const data = await res.json({ data });
  console.log(`data`, data)
}

const getUserProfilePage = async (req, res) => {
  console.log("run get  user profile page")
  if (!req.headers.authorization) {
    return res.status(403).json({ error: 'No credentials sent!' });
  }
  console.log(req.headers.authorization)
  const uid = (await admin.auth().verifyIdToken(req.headers.authorization.split(" ")[1])).uid;
  if (uid) {
    const user = await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .get();
    return res.status(200).json({ user: user.data() });
  }
  else {
    return res.status(403).json({ error: 'User not found' });
  }

}

const viewUserProfilePage = async (req, res) => {
  const { uid } = req.params
  if (!uid) {
    return res.status(403).json({ error: 'No credentials sent!' });
  }
  const user = await admin
    .firestore()
    .collection('users')
    .doc(uid)
    .get();
  return res.status(200).json({ user: user.data() });

}

const getDeployedCampaigns = async (req, res) => {
  try {
    // const lms = await LMS.deployed();
    const lms = await LMS.at(contractAddress)
    const list = await lms.getDeployedCampaigns();
    console.log("list", JSON.stringify(list))
    return res.status(200).json({ list })

  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const getCampaignAddress = async (req, res) => {
  try {
    const { id } = req.params
    const lms = await LMS.at(contractAddress)
    if (id !== 0) {
      const address = await lms.getCampaignByIndex(id - 1);
      return res.status(200).json({ address })
    }
    else {
      return res.status(200).json({ message: "No such campaigns" })
    }

  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const getCampaignSummary = async (req, res) => {
  try {
    const { address } = req.params
    const campaign = await Campaign.at(address)
    const summary = await campaign.getSummary();
    const campaignFb = await admin
      .firestore()
      .collection('campaigns')
      .doc(address)
      .get();
    const { roadmap } = campaignFb.data();
    summary['0'] = summary['0'].toString()
    summary['1'] = summary['1'].toString()
    summary['2'] = summary['2'].toString()
    summary['3'] = summary['3'].toString()
    summary['10'] = summary['10'].toString()
    summary['11'] = roadmap
    return res.status(200).json({ summary })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const createCampaign = async (req, res) => {
  try {
    const { minimumContribution, campaignName, description, imageUrl, target, walletAddr, date } = req.body
    const lms = await LMS.at(contractAddress)
    const data = await lms
      .contract.methods.createCampaign(
        web3.utils.toWei(minimumContribution, "ether"),
        campaignName,
        description,
        imageUrl,
        date,
        date,
        web3.utils.toWei(target, "ether")
      ).encodeABI();
    const gas = await lms
      .contract.methods.createCampaign(
        web3.utils.toWei(minimumContribution, "ether"),
        campaignName,
        description,
        imageUrl,
        date,
        date,
        web3.utils.toWei(target, "ether")
      ).estimateGas()
    const gasPrice = await web3.eth.getGasPrice()
    const txParams = {
      from: walletAddr,
      to: contractAddress,
      data,
      gas: web3.utils.numberToHex(gas * 2),
      gasPrice: web3.utils.numberToHex(gasPrice * 2),
    };
    return res.status(200).json({ txParams })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const createCampaignFirebase = async (req, res) => {
  try {
    const { minimumContribution, campaignName, description, imageUrl, target, walletAddr, campaignId, txHash, date, roadmap, timestamp } = req.body
    const docs = await admin.firestore().collection("campaigns").doc(campaignId).set({
      minimumContribution,
      campaignName,
      description,
      imageUrl,
      target,
      creator: walletAddr,
      campaignId,
      txHash,
      dateCreated: date,
      dateUpdated: date,
      contributors: [],
      requests: [],
      approvers: [],
      approversCount: 0,
      hidden: false,
      done: false,
      roadmap: roadmap || [],
      timestamp,
    })
    return res.status(200).json({ docs })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const contributeCampaign = async (req, res) => {
  const { address, walletAddr, value } = req.body
  try {
    const campaign = await Campaign.at(address)
    const abi = await campaign
      .contract.methods.contribute()
    const data = abi.encodeABI()
    console.log("data", data)
    // const gas = await abi.estimateGas()
    // console.log("gas", gas)
    const gasPrice = await web3.eth.getGasPrice()
    console.log("gasPrice", gasPrice)
    const txParams = {
      from: walletAddr,
      to: address,
      value: web3.utils.numberToHex(web3.utils.toWei(value, "ether")),
      data,
      gas: web3.utils.numberToHex(42000 * 5),
      gasPrice: web3.utils.numberToHex(gasPrice * 5),
    };
    return res.status(200).json({ txParams })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })

  }
}

const contributeCampaignFirebase = async (req, res) => {
  const { address, walletAddr, value } = req.body
  try {
    const campaignFb = await admin
      .firestore()
      .collection('campaigns')
      .doc(address)
      .get();
    const { minimumContribution, approversCount, contributors } = campaignFb.data();
    let docs = {}
    if (parseFloat(value) > parseFloat(minimumContribution)) {
      if (contributors.length === 0 || contributors.findIndex(i => i.walletAddr === walletAddr) === -1) {
        docs = await admin.firestore().collection("campaigns").doc(address).update({
          contributors: firebaseAdmin.firestore.FieldValue.arrayUnion({ walletAddr, value }),
          approvers: firebaseAdmin.firestore.FieldValue.arrayUnion({ walletAddr, approved: true }),
          approversCount: approversCount + 1,
        })
        return res.status(200).json({ docs })
      }
      const contrIndex = contributors.findIndex(contributor => contributor.walletAddr === walletAddr);
      const contrValue = contributors[contrIndex].value;
      const newValue = parseFloat(contrValue) + parseFloat(value);
      await admin.firestore().collection("campaigns").doc(address).update({
        contributors: firebaseAdmin.firestore.FieldValue.arrayRemove(contributors[contrIndex]),
      })
      contributors[contrIndex].value = newValue.toString();
      docs = await admin.firestore().collection("campaigns").doc(address).update({
        contributors: firebaseAdmin.firestore.FieldValue.arrayUnion(contributors[contrIndex]),
      })
      return res.status(200).json({ docs })

    }
    else {
      return res.status(400).json({ message: "Not meet minimum contribution" })
    }

  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })

  }
}

const getApproversCount = async (req, res) => {
  try {
    const { address } = req.params
    const campaign = await Campaign.at(address)
    const approversCount = await campaign.approversCount();
    console.log(approversCount.toNumber())
    return res.status(200).json({ approversCount })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const getRequestsCount = async (req, res) => {
  try {
    const { address } = req.params
    const campaign = await Campaign.at(address)
    const requestsCount = await campaign.getRequestsCount();
    console.log(requestsCount.toNumber())
    return res.status(200).json({ requestsCount })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const getCampaignRequests = async (req, res) => {
  try {
    const { address, id } = req.params
    const campaignFb = await admin
      .firestore()
      .collection('campaigns')
      .doc(address)
      .get();
    const { requests } = campaignFb.data();
    console.log(requests)
    return res.status(200).json({ requests })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const createWithdrawRequest = async (req, res) => {
  const { address, recipient, value, description, walletAddr } = req.body
  try {
    const campaign = await Campaign.at(address)
    const abi = await campaign
      .contract.methods.createRequest(
        description,
        web3.utils.toWei(value, "ether"),
        recipient
      )
    const data = abi.encodeABI()
    console.log(data)
    // const gas = await abi.estimateGas()
    // console.log("gas", gas)
    const gasPrice = await web3.eth.getGasPrice()
    console.log("gasPrice", gasPrice)
    const txParams = {
      from: walletAddr,
      to: address,
      // value: web3.utils.numberToHex(web3.utils.toWei(value, "ether")),
      data,
      gas: web3.utils.numberToHex(20000 * 7),
      gasPrice: web3.utils.numberToHex(gasPrice * 7),
    };
    return res.status(200).json({ txParams })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const createWithdrawRequestFirebase = async (req, res) => {
  const { recipient, value, description, walletAddr, txHash, campaignId } = req.body
  try {
    const docs = await admin.firestore().collection("campaigns").doc(campaignId).update({
      requests: firebaseAdmin.firestore.FieldValue.arrayUnion({
        campaignId,
        recipient,
        value,
        description,
        walletAddr,
        txHash,
        approvalCount: 0,
        complete: false,
        approvals: []
      })
    })
    return res.status(200).json({ docs })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const approveWithdrawRequest = async (req, res) => {
  const { campaignId, id: reqIndex, walletAddr } = req.body
  try {
    const campaign = await Campaign.at(campaignId)
    const abi = await campaign
      .contract.methods.approveRequest(
        reqIndex
      )
    const data = abi.encodeABI()
    console.log(data)
    // const gas = await abi.estimateGas()
    // console.log("gas", gas)
    const gasPrice = await web3.eth.getGasPrice()
    console.log("gasPrice", gasPrice)
    const txParams = {
      from: walletAddr,
      to: campaignId,
      // value: web3.utils.numberToHex(web3.utils.toWei(value, "ether")),
      data,
      gas: web3.utils.numberToHex(20000 * 5),
      gasPrice: web3.utils.numberToHex(gasPrice * 5),
    };
    return res.status(200).json({ txParams })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const approveWithdrawRequestFirebase = async (req, res) => {
  const { campaignId, id: reqIndex, walletAddr } = req.body
  try {
    const campaignFb = await admin
      .firestore()
      .collection('campaigns')
      .doc(campaignId)
      .get();
    const { approvers, requests } = campaignFb.data();
    console.log(approvers)
    console.log(requests)
    console.log("index", requests[reqIndex])
    // nếu có trong danh sách contributors và chưa approve request này
    if (approvers.findIndex(i => i.walletAddr === walletAddr) !== -1 && !requests[reqIndex].approvals.includes(walletAddr)) {
      // Xoá requests cũ
      await admin.firestore().collection("campaigns").doc(campaignId).update({
        requests: firebaseAdmin.firestore.FieldValue.arrayRemove(requests[reqIndex])
      })
      console.log("request trươc khi update", requests[reqIndex]);
      requests[reqIndex].approvals.push(walletAddr);
      requests[reqIndex].approvalCount++;
      // Thêm lại request sau khi đã thay đổi
      console.log("request sau khi update", requests[reqIndex]);
      const docs = await admin.firestore().collection("campaigns").doc(campaignId).update({
        requests: firebaseAdmin.firestore.FieldValue.arrayUnion(requests[reqIndex])
      })
      return res.status(200).json({ docs })
    }
    return res.status(403).json({ message: "Can't approve request" })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const finalizeRequest = async (req, res) => {
  const { campaignId, id: reqIndex, walletAddr } = req.body
  try {
    const campaign = await Campaign.at(campaignId)
    const abi = await campaign
      .contract.methods.finalizeRequest(
        reqIndex
      )
    const data = abi.encodeABI()
    console.log(data)
    // const gas = await abi.estimateGas()
    // console.log("gas", gas)
    const gasPrice = await web3.eth.getGasPrice()
    console.log("gasPrice", gasPrice)
    const txParams = {
      from: walletAddr,
      to: campaignId,
      // value: web3.utils.numberToHex(web3.utils.toWei(value, "ether")),
      data,
      gas: web3.utils.numberToHex(20000 * 5),
      gasPrice: web3.utils.numberToHex(gasPrice * 5),
    };
    return res.status(200).json({ txParams })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

const finalizeRequestFirebase = async (req, res) => {
  const { campaignId, id: reqIndex } = req.body
  try {
    const campaignFb = await admin
      .firestore()
      .collection('campaigns')
      .doc(campaignId)
      .get();
    const { requests, approversCount } = campaignFb.data();
    if (requests[reqIndex].approvalCount > (approversCount / 2) && !requests[reqIndex].complete) {
      // Xoá requests cũ
      await admin.firestore().collection("campaigns").doc(campaignId).update({
        requests: firebaseAdmin.firestore.FieldValue.arrayRemove(requests[reqIndex])
      })
      console.log("request trươc khi update", requests[reqIndex])
      requests[reqIndex].complete = true
      // Thêm lại request sau khi đã thay đổi
      console.log("request sau khi update", requests[reqIndex])
      const docs = await admin.firestore().collection("campaigns").doc(campaignId).update({
        requests: firebaseAdmin.firestore.FieldValue.arrayUnion(requests[reqIndex])
      })
      return res.status(200).json({ docs })
    }
    return res.status(403).json({ message: "Cannot finalize request" })
  }
  catch (e) {
    console.log(e)
    return res.status(400).json({ message: "error happened" })
  }
}

// approvers - người đã donate campaign
// approvals - người đã approve request

app.post('/auth/nonce', nonceApi);
app.post('/auth/wallet', walletApi);
app.post('/auth/login', login);
app.get('/users/get-profile', getUserProfilePage);
app.get('/users/view-profile/:uid', viewUserProfilePage);
app.get('/campaigns/get-deployed-campaigns', getDeployedCampaigns);
app.get('/campaigns/get-campaign-summary/:address', getCampaignSummary);
app.get('/campaigns/get-campaign-address/:id', getCampaignAddress);
app.post('/campaigns/create-campaign', createCampaign);
app.post('/campaigns/create-campaign-fb', createCampaignFirebase);
app.post('/campaigns/contribute-campaign', contributeCampaign);
app.post('/campaigns/contribute-campaign-fb', contributeCampaignFirebase);
app.get('/campaigns/get-approvers-count/:address', getApproversCount);
app.get('/campaigns/get-requests-count/:address', getRequestsCount);
app.get('/campaigns/get-campaign-requests/:address/:id', getCampaignRequests);
app.post('/campaigns/create-withdraw-request', createWithdrawRequest);
app.post('/campaigns/create-withdraw-request-fb', createWithdrawRequestFirebase);
app.post('/campaigns/approve-withdraw-request', approveWithdrawRequest);
app.post('/campaigns/approve-withdraw-request-fb', approveWithdrawRequestFirebase);
app.post('/campaigns/finalize-request', finalizeRequest);
app.post('/campaigns/finalize-request-fb', finalizeRequestFirebase);
app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});
module.exports.handler = serverless(app);
