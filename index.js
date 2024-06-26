require('dotenv').config();
const dns = require('node:dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    unique: true
  }
});

const URLModel = new mongoose.model('URL', urlSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', async function(req, res) {
  console.log(req.body);

  try {
    const urlObj = new URL(req.body.url);
    console.log(urlObj);

    await new Promise((resolve, reject) => {
      dns.lookup(urlObj.hostname, (err, address) => {
        if (err) reject(err);
        resolve(address);
      })
    });
    
    let urlDoc = await URLModel.findOne({ original_url: urlObj.href }).exec();

    if (!urlDoc) {
      urlDoc = new URLModel({
        original_url: urlObj.href
      });
      await urlDoc.save();
    }
    
    console.log(urlDoc);
  } catch (err) {
    return res.json({ error: err.code === 'ERR_INVALID_URL' ? 'invalid url' : 'invalid host' });
  }

  res.json({ hey: 'this is a test :)' });
});

async function serverStart () {
  try {
    mongoose.connect(process.env.MONGO_URI);
    app.listen(port, function() {
      console.log(`Listening on port ${port}`);
    });
  } catch (err) {
    console.log(err);
}}

serverStart();