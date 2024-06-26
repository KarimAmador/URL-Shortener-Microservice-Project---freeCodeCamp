require('dotenv').config();
const dns = require('node:dns');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const app = express();

// Basic Configuration and mongoose setup
const port = process.env.PORT || 3000;

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    unique: true
  },
  short_url: {
    type: String,
    required: true,
    unique: true
  }
});

const URLModel = new mongoose.model('URL', urlSchema);

async function saveUrl(originalUrl) {
  const { nanoid } = await import('nanoid');
  let urlDoc;

  while (!urlDoc) {
    try {
      urlDoc = new URLModel({
        original_url: originalUrl,
        short_url: nanoid(8)
      });
      await urlDoc.save();
    } catch (err) {
      if (err.code === 11000) {
        console.log('Duplicate ID. Regenerating');
        continue;
      }
      console.log(err);
    }
  }

  return urlDoc;
}

// Express.js stuff

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
    
    const originalUrl = urlObj.origin + (urlObj.pathname === '/' ? '' : urlObj.pathname);

    let urlDoc = await URLModel.findOne({ original_url: originalUrl }).exec();

    if (!urlDoc) {
      urlDoc = await saveUrl(originalUrl);
    }
    
    console.log(urlDoc);

    res.json({ original_url: urlDoc.original_url, short_url: urlDoc.short_url });
  } catch (err) {
    return res.json({ error: err.code === 'ERR_INVALID_URL' ? 'invalid url' : err.code });
  }
});

app.get('/api/shorturl/:shorturl', async function(req, res) {
  console.log(req.params);

  let urlDoc = await URLModel.findOne({ short_url: req.params.shorturl });
  console.log(urlDoc);
  
  res.redirect(urlDoc.original_url);
})

// Server start

async function serverStart () {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    app.listen(port, function() {
      console.log(`Listening on port ${port}`);
    });
  } catch (err) {
    console.log(err);
}}

serverStart();