import { should } from 'chai';
should();
import sessionless from 'sessionless-node';
import superAgent from 'superagent';

const baseURL = process.env.SUB_DOMAIN ? `https://${process.env.SUB_DOMAIN}.minnie.allyabase.com/` : 'http://127.0.0.1:2525/';

const get = async function(path) {
  console.info("Getting " + path);
  return await superAgent.get(path).set('Content-Type', 'application/json');
};

const put = async function(path, body) {
  console.info("Putting " + path);
  return await superAgent.put(path).send(body).set('Content-Type', 'application/json');
};

const post = async function(path, body) {
  console.info("Posting " + path);
  console.log(body);
  return await superAgent.post(path).send(body).set('Content-Type', 'application/json');
};

const _delete = async function(path, body) {
  console.info("Deleting " + path);
  return await superAgent.delete(path).send(body).set('Content-Type', 'application/json');
};

let savedUser = {};
let savedOrgUser = {};
let keys = {};
let keysToReturn = {};
let orgKeys = {};
let orgKeysToReturn = {};

describe('Minnie Email Service - Server Tests', () => {

  it('should register a user with default TTL', async () => {
    keys = await sessionless.generateKeys((k) => { keysToReturn = k; }, () => {return keysToReturn;});

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: keys.pubKey,
      ttl: 30  // 30 days default
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

    const res = await put(`${baseURL}user/create`, payload);
    console.log(res.body);
    savedUser = res.body;
    res.body.userUUID.length.should.equal(36);
    res.body.emailName.should.be.a('string');
  });

  it('should register an organization user with indefinite TTL', async () => {
    orgKeys = await sessionless.generateKeys((k) => { orgKeysToReturn = k; }, () => {return orgKeysToReturn;});

    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: orgKeys.pubKey,
      ttl: -1,  // Indefinite for organizations
      isOrganization: true
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

    const res = await put(`${baseURL}user/create`, payload);
    console.log(res.body);
    savedOrgUser = res.body;
    res.body.userUUID.length.should.equal(36);
    res.body.emailName.should.be.a('string');
  });

  it('should return existing user UUID when registering with same pubKey', async () => {
    const payload = {
      timestamp: new Date().getTime() + '',
      pubKey: keys.pubKey,
      ttl: 30
    };

    payload.signature = await sessionless.sign(payload.timestamp + payload.pubKey);

    const res = await put(`${baseURL}user/create`, payload);
    res.body.userUUID.should.equal(savedUser.userUUID);
  });

  it('should get user inbox (initially empty)', async () => {
    const timestamp = new Date().getTime() + '';
    const uuid = savedUser.userUUID;

    const signature = await sessionless.sign(timestamp + uuid);

    const res = await get(`${baseURL}user/${uuid}/inbox?timestamp=${timestamp}&signature=${signature}`);
    console.log(res.body);
    res.body.should.have.property('inbox');
    res.body.inbox.should.be.an('object');
  });

  it('should send an email on behalf of user', async () => {
    keysToReturn = orgKeys;
    const timestamp = new Date().getTime() + '';
    const uuid = savedOrgUser.userUUID;
    const recipient = 'test@example.com';
    const body = 'This is a test email';

    const signature = await sessionless.sign(timestamp + uuid + recipient + body);
    const payload = {
      timestamp,
      userUUID: uuid,
      recipient,
      body,
      signature
    };

    const res = await post(`${baseURL}user/${uuid}/send`, payload);
    console.log(res.body);
    res.body.should.have.property('success');
    res.body.success.should.equal(true);
  });

  it('should send an email with CC and BCC', async () => {
    const timestamp = new Date().getTime() + '';
    const uuid = savedOrgUser.userUUID;
    const recipient = 'test@example.com';
    const cc = ['cc1@example.com', 'cc2@example.com'];
    const bcc = ['bcc1@example.com'];
    const body = 'This is a test email with CC and BCC';

    const signature = await sessionless.sign(timestamp + uuid + recipient + body);
    const payload = {
      timestamp,
      userUUID: uuid,
      recipient,
      cc,
      bcc,
      body,
      signature
    };

    const res = await post(`${baseURL}user/${uuid}/send`, payload);
    console.log(res.body);
    res.body.should.have.property('success');
    res.body.success.should.equal(true);
  });

  it('should reject email send with invalid signature', async () => {
    const timestamp = new Date().getTime() + '';
    const uuid = savedOrgUser.userUUID;
    const recipient = 'test@example.com';
    const body = 'This should fail';

    const payload = {
      timestamp,
      userUUID: uuid,
      recipient,
      body,
      signature: 'invalid_signature'
    };

    try {
      const res = await post(`${baseURL}user/${uuid}/send`, payload);
      res.status.should.equal(403);
    } catch(err) {
      err.status.should.equal(403);
    }
  });

  it('should reject inbox access with invalid signature', async () => {
    const timestamp = new Date().getTime() + '';
    const uuid = savedUser.userUUID;

    try {
      const res = await get(`${baseURL}user/${uuid}/inbox?timestamp=${timestamp}&signature=invalid_sig`);
      res.status.should.equal(403);
    } catch(err) {
      err.status.should.equal(403);
    }
  });

  it('should reject stale timestamp requests', async () => {
    const timestamp = new Date().getTime() - 600000; // 10 minutes ago
    const uuid = savedUser.userUUID;
    const signature = await sessionless.sign(timestamp + uuid);

    try {
      const res = await get(`${baseURL}user/${uuid}/inbox?timestamp=${timestamp}&signature=${signature}`);
      res.body.should.have.property('error');
    } catch(err) {
      err.response.body.should.have.property('error');
    }
  });

  it('should delete a user', async () => {
    keysToReturn = keys;
    const timestamp = new Date().getTime() + '';
    const uuid = savedUser.userUUID;

    const signature = await sessionless.sign(timestamp + uuid);
    const payload = {timestamp, userUUID: uuid, signature};

    const res = await _delete(`${baseURL}user/delete`, payload);
    console.log(res.body);
    res.status.should.equal(202);
  });

  it('should delete organization user', async () => {
    keysToReturn = orgKeys;
    const timestamp = new Date().getTime() + '';
    const uuid = savedOrgUser.userUUID;

    const signature = await sessionless.sign(timestamp + uuid);
    const payload = {timestamp, userUUID: uuid, signature};

    const res = await _delete(`${baseURL}user/delete`, payload);
    console.log(res.body);
    res.status.should.equal(202);
  });

  it('should return 404 for deleted user inbox access', async () => {
    const timestamp = new Date().getTime() + '';
    const uuid = savedUser.userUUID;
    const signature = await sessionless.sign(timestamp + uuid);

    try {
      const res = await get(`${baseURL}user/${uuid}/inbox?timestamp=${timestamp}&signature=${signature}`);
      res.status.should.equal(404);
    } catch(err) {
      err.status.should.equal(404);
    }
  });

});
