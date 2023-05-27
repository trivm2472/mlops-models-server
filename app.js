var express = require("express");
const bodyParser = require('body-parser');
const mongoose = require("mongoose");

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
  await model.updateMany({}, {deployed: false}).exec();
  for(let i = 0; i < data.modelIdList.length; i++){
    await model.updateMany({id: data.modelIdList[i]}, {deployed: true}).exec();
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

app.listen(4000, function () {
  console.log("Example app listening on port 4000!");
});

module.exports = app;
