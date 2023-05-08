var express = require("express");
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

app.use(function (req, res, next) {

  res.setHeader('Access-Control-Allow-Origin', '*');

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  res.setHeader('Access-Control-Allow-Credentials', true);

  next();
});

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
  // var result = modelNameArray.map(async (element) => {
  //   const versions = await model
  //   .find({modelName: element})
  //   .exec();
  //   console.log(versions);
  //   return versions;
  // });

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


app.listen(4000, function () {
  console.log("Example app listening on port 4000!");
});
