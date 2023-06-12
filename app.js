var express = require("express");
const http = require('http');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require('cors');

const Schema = mongoose.Schema;
const ProductSchema = new Schema({}, { strict: false });

mongoose.connect(
  `mongodb+srv://haicauancarem:tiachop1@cluster0.dd88nyj.mongodb.net/MLOpsData?retryWrites=true&w=majority`
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("Connected successfully");
});

var app = express();

const model = mongoose.model("weight", ProductSchema, "weight");
const modelMonitor = mongoose.model("monitoring", ProductSchema, "monitoring");
const modelImage = mongoose.model("image", ProductSchema, "image");
const jenkinsUser = mongoose.model("jenkinsuser", ProductSchema, "jenkinsuser");
const seqs2 = mongoose.model("seqs2", ProductSchema, "seqs2");
const deploying = mongoose.model("deploying", ProductSchema, "deploying");
const training = mongoose.model("training", ProductSchema, "training");
const lastTrainStatus = mongoose.model("lasttrainstatus", ProductSchema, "lasttrainstatus");

app.use(function (req, res, next) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');

  res.setHeader('Access-Control-Allow-Credentials', true);

  next();
});


app.use(bodyParser.json());

app.get("/", async function (req, res) {
  const models = await model
    .find({}, { id: 1, modelName: 1, date: 1, version: 1 })
    .sort({ modelName: 1 })
    .exec();
  if (models.length <= 0) {
    res.json([]);
    return;
  }
  var modelNameArray = [models[0].modelName];
  var temp = models[0].modelName;
  for (let i = 0; i < models.length; i++){
    if (models[i].modelName != temp){
      temp = models[i].modelName
      modelNameArray.push(models[i].modelName);
    }
  }

  for (let i = 0; i < modelNameArray.length; i++) {
    const versions = await model
    .find({modelName: modelNameArray[i]})
    .exec();
    modelNameArray[i] = versions;
  };
  res.json(modelNameArray);

});

app.get('/model/:id', async function (req, res) {
  var pid = req.params.id;
  const modelDetail = await model
  .find({id: parseInt(pid)})
  .exec();
  res.json(modelDetail);
});

app.get('/deployed', async function (req, res) {
  const deployed = await model
  .find({deployed: true}, {modelName: 1, version: 1, id: 1, _id: -1})
  .exec();
  res.json(deployed);
});

app.post('/deploy', async function (req, res) {
  const data = req.body;
  var currentDeploy = await model.find({deployed: true}, 'id').exec();
  var currentIdList = []
  for(let i = 0; i < currentDeploy.length; i++){
    currentIdList.push(Object.values(Object.values(currentDeploy[i])[2])[1]);
  }
  await deploying.updateOne({}, {lastIdList: currentIdList, currentIdList: data.modelIdList, status: 'deploying', urlLink: data.urlLink})
  res.json('success');
})

app.get('/deployStatus', async function (req, res) {
  const result = await deploying.findOne({}).exec();
  res.json(result);
})

app.post('/getModelList', async function (req, res) {
  const arrayId = req.body.arrayId;
  var result = await model.find({}).exec();
  result = result.filter(obj => arrayId.includes(Object.values(Object.values(obj)[2])[1]))
  res.json(result);
})

app.get('/jenkinsResult/:status', async function (req, res) {
  const x = await deploying.findOne({}).exec();
  if(x.status == 'idle'){
    res.json('success');
    return;
  }
  const temp = await deploying.findOne({}).exec()
  var status = req.params.status;
  if (status == "success") {
    const deploy = await deploying.findOne({}).exec();
    await model.updateMany({}, {deployed: false}).exec();
    for(let i = 0; i < deploy.currentIdList.length; i++){
      await model.updateOne({id: deploy.currentIdList[i]}, {deployed: true}).exec();
    }
    await deploying.updateOne({}, {status: 'idle', currentIdList: [], lastIdList: []}).exec();
  } else {
    const deploy = await deploying.findOne({}).exec();
    await model.updateMany({}, {deployed: false}).exec();
    for(let i = 0; i < deploy.lastIdList.length; i++){
      await model.updateOne({id: deploy.lastIdList[i]}, {deployed: true}).exec();
    }
    await deploying.updateOne({}, {status: 'idle', currentIdList: [], lastIdList: []}).exec();
  }
  res.json('success');
})

app.get('/monitor/:name', async function (req, res) {
  var modelName = req.params.name;
  const deployed = await modelMonitor
  .find({modelName: modelName}, {})
  .exec();
  res.json(deployed);
})

app.post('/deploy/saveImage', async function (req, res) {
  var modelName = req.body;
  // const deployed = await modelMonitor
  // .find({modelName: modelName}, {})
  // .exec();
  // res.json(deployed);
})

app.post('/deploy/getSaveImage', async function (req, res) {
  var data = req.body;
  // const images = await modelImage
  // .find({versionList: data.versionList, modelListName: data.modelListName})
  // .exec();
  var versions = data.versionList.split(',');
  var models = data.modelListName.split(',');
  var length = versions.length;
  var newData = versions.map((value, index) => {
    return {versionList: value, modelListName: models[index]}
  })
  newData = newData.sort(function(a, b){return a.versionList - b.versionList})

  const images = await modelImage
  .find({})
  .exec();
  var result = [];
  for(let i = 0; i < images.length; i++){
    versions = images[i].versionList.split(',');
    if(length != versions.length){continue;}
    models = images[i].modelListName.split(',');
    testData = versions.map((value, index) => {
      return {versionList: value, modelListName: models[index]}
    })
    testData2 = testData.sort(function(a, b){return a.versionList - b.versionList})
    var equal = true;
    for(let i = 0; i < length; i++){
      if(testData2[i].versionList != newData[i].versionList || testData2[i].modelListName != newData[i].modelListName){
        equal = false;
      }
    }
    if(equal){
      result.push(images[i]);
    }
  }

  res.json(result);
})

app.post('/loginjenkins', async function (req, res) {
  var data = req.body;
  // const deployed = await modelMonitor
  // .find({modelName: modelName}, {})
  // .exec();
  // res.json(deployed);
  const result = await jenkinsUser.findOne({username: data.username, password: data.password}, {}).exec();
  res.json(result);
})

app.get('/addImageSeq', async function (req, res) {
  // const deployed = await modelMonitor
  // .find({modelName: modelName}, {})
  // .exec();
  // res.json(deployed);
  const result = await seqs2.findOne({}, {}).exec();
  const update = await seqs2.findOneAndUpdate({}, {seq: result.seq + 1}).exec();
  res.json(result.seq);
})

app.get('/train/:modelName', async function (req, res) {
  name = req.params.modelName
  const temp = await training.findOne({}).exec();
  temp.modelNameList.push(name);
  const update = await training.findOneAndUpdate({}, {modelNameList: temp.modelNameList}).exec();
  res.json('success');
})

app.get('/training/', async function (req, res) {
  const temp = await training.findOne({}).exec();
  res.json(temp.modelNameList);
})

app.get('/lastTrainStatus', async function (req, res) {
  const temp = await lastTrainStatus.find({}).exec();
  res.json(temp);
})

app.get('/lastTrainStatus/:name', async function (req, res) {
  name = req.params.name
  const temp = await lastTrainStatus.find({modelName: name}).exec();
  res.json(temp);
})

app.listen(4000, function () {
  console.log("Example app listening on port 4000!");
});

module.exports = app;
