import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fount from 'fount-js';
import gateway from 'magic-gateway-js';
import sessionless from 'sessionless-node';
import db from './src/persistence/db.js';

const sk = (keys) => {
  global.keys = keys;
};

const gk = () => {
  return keys;
};

const baseName = process.env.BASE_NAME || 'minnie';
const SUBDOMAIN = process.env.SUBDOMAIN || 'dev';
fount.baseURL = process.env.LOCALHOST ? 'http://localhost:3006/' : `https://${SUBDOMAIN}.fount.allyabase.com/`;

console.log('fount\'s baseURL is ', fount.baseURL);

const repeat = (func) => {
  setTimeout(func, 2000);
};

const bootstrap = async () => {
  try {
    const fountUser = await fount.createUser(db.saveKeys, db.getKeys);
//console.log('Why is this an object???', fountUUID);
//    const fountUser = await fount.getUserByUUID(fountUUID);
console.log('fountUser here looks like: ', fountUser);
    const minnie = {
      uuid: 'minnie',
      baseName,
      fountUUID: fountUser.uuid,
      fountPubKey: fountUser.pubKey,
      ordinal: 0
    };

    if(!minnie.fountUUID) {
      throw new Error('minnie bootstrap failed because of no fountUUID');
    }

    await db.putUser(minnie);
  } catch(err) {
console.warn(err);
    repeat(bootstrap);
  }
};

repeat(bootstrap);

sessionless.generateKeys(sk, gk);

const app = express();
app.use(cors());
app.use(express.json({limit: '10mb'}));

const allowedTimeDifference = 300000; // 5 minutes

app.use((req, res, next) => {
  const requestTime = +req.query.timestamp || +req.body.timestamp;
  const now = new Date().getTime();
  if(Math.abs(now - requestTime) > allowedTimeDifference) {
    return res.send({error: 'no time like the present'});
  }
  next();
});

app.put('/user/create', async (req, res) => {
  try {
    const body = req.body;
    const timestamp = body.timestamp;
    const pubKey = body.pubKey;
    const ttl = body.ttl;
    const isOrganization = body.isOrganization;
    const signature = body.signature;

    const message = timestamp + pubKey;

    if(!sessionless.verifySignature(signature, message, pubKey)) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    const emailName = `FOUR${Math.floor(Math.random() * 1000000)}`;

    const user = {
      pubKey,
      emailName,
      ttl,
      isOrganization
    };

    const savedUser = await db.putUser(user);

    return res.send({userUUID: savedUser.userUUID, emailName});
  } catch(err) {
console.warn(err);
    res.status(404);
    return res.send({error: 'not found'});
  }
});

app.get('/user/:uuid/inbox', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const timestamp = req.query.timestamp;
    const signature = req.query.signature;

    const message = timestamp + uuid;

    const foundUser = await db.getUser(uuid);

    if(!foundUser) {
      res.status(404);
      return res.send({error: 'User not found'});
    }

    if(!sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    const inbox = await db.getInbox(uuid);

    return res.send({inbox});
  } catch(err) {
console.warn(err);
    res.status(404);
    return res.send({error: 'not found'});
  }
});

app.post('/user/:uuid/send', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const body = req.body;
    const timestamp = body.timestamp;
    const recipient = body.recipient;
    const cc = body.cc || [];
    const bcc = body.bcc || [];
    const emailBody = body.body;
    const signature = body.signature;

    const message = timestamp + uuid + recipient + emailBody;

    const foundUser = await db.getUser(uuid);

    if(!foundUser) {
      res.status(404);
      return res.send({error: 'User not found'});
    }

    if(!sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    // TODO: Actually send email via Resend
    console.log(`📧 Sending email from ${foundUser.emailName} to ${recipient}`);
    console.log(`   CC: ${cc.join(', ')}, BCC: ${bcc.join(', ')}`);
    console.log(`   Body: ${emailBody}`);

    return res.send({success: true});
  } catch(err) {
console.warn(err);
    res.status(404);
    return res.send({error: 'not found'});
  }
});

app.delete('/user/delete', async (req, res) => {
  try {
    const body = req.body;
    const uuid = body.userUUID;
    const timestamp = body.timestamp;
    const signature = body.signature;

    const message = timestamp + uuid;

    const foundUser = await db.getUser(uuid);

    if(!foundUser) {
      res.status(404);
      return res.send({error: 'User not found'});
    }

    if(!sessionless.verifySignature(signature, message, foundUser.pubKey)) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    await db.deleteUser(uuid);

    res.status(202);
    return res.send();
  } catch(err) {
console.warn(err);
    res.status(404);
    return res.send({error: 'not found'});
  }
});

// TODO MAGIC gateway stuff

const PORT = process.env.PORT || 2525;
app.listen(PORT);
console.log(`📬 Minnie email service running on port ${PORT}`);
