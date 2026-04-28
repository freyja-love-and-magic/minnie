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

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MINNIE_FROM = process.env.MINNIE_FROM || 'noreply@planetnine.app';

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

    // Verify signature first
    let isValidSignature = false;
    try {
      isValidSignature = sessionless.verifySignature(signature, message, pubKey);
    } catch(verifyErr) {
      console.warn('Signature verification error:', verifyErr);
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    if(!isValidSignature) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    // Check if user already exists with this pubKey
    const existingUser = await db.getUserByPubKey(pubKey);
    if(existingUser) {
      return res.send({userUUID: existingUser.userUUID, emailName: existingUser.emailName});
    }

    // Create new user
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
    res.status(500);
    return res.send({error: 'Server error'});
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

    // Verify signature with try-catch
    let isValidSignature = false;
    try {
      isValidSignature = sessionless.verifySignature(signature, message, foundUser.pubKey);
    } catch(verifyErr) {
      console.warn('Signature verification error:', verifyErr);
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    if(!isValidSignature) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    const inbox = await db.getInbox(uuid);

    return res.send({inbox});
  } catch(err) {
console.warn(err);
    res.status(500);
    return res.send({error: 'Server error'});
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
    const subject = body.subject || '(no subject)';
    const html = body.html;
    const from = body.from;
    const signature = body.signature;

    const message = timestamp + uuid + recipient + emailBody;

    const foundUser = await db.getUser(uuid);

    if(!foundUser) {
      res.status(404);
      return res.send({error: 'User not found'});
    }

    // Verify signature with try-catch
    let isValidSignature = false;
    try {
      isValidSignature = sessionless.verifySignature(signature, message, foundUser.pubKey);
    } catch(verifyErr) {
      console.warn('Signature verification error:', verifyErr);
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    if(!isValidSignature) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      res.status(500);
      return res.send({error: 'email service not configured'});
    }

    const payload = {
      from: from || `${foundUser.emailName}@${MINNIE_FROM.includes('@') ? MINNIE_FROM.split('@')[1] : MINNIE_FROM}`,
      to: Array.isArray(recipient) ? recipient : [recipient],
      subject,
    };
    if (html) payload.html = html;
    else payload.text = emailBody;
    if (cc.length) payload.cc = cc;
    if (bcc.length) payload.bcc = bcc;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resendResp.json();

    if (!resendResp.ok) {
      console.error('Resend error:', data);
      res.status(resendResp.status);
      return res.send({error: data.message || 'send failed'});
    }

    return res.send({success: true, id: data.id});
  } catch(err) {
console.warn(err);
    res.status(500);
    return res.send({error: 'Server error'});
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

    // Verify signature with try-catch
    let isValidSignature = false;
    try {
      isValidSignature = sessionless.verifySignature(signature, message, foundUser.pubKey);
    } catch(verifyErr) {
      console.warn('Signature verification error:', verifyErr);
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    if(!isValidSignature) {
      res.status(403);
      return res.send({error: 'Auth error'});
    }

    await db.deleteUser(uuid);

    res.status(202);
    return res.send();
  } catch(err) {
console.warn(err);
    res.status(500);
    return res.send({error: 'Server error'});
  }
});

// TODO MAGIC gateway stuff

const PORT = process.env.PORT || 2525;
app.listen(PORT);
console.log(`📬 Minnie email service running on port ${PORT}`);
