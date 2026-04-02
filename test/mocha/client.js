import minnie from '../../src/client/javascript/minnie.js';
import sessionless from 'sessionless-node';
import { should } from 'chai';
should();

console.log('Minnie SDK:', minnie);

// Configure for local testing
minnie.baseURL = 'http://127.0.0.1:2525/';

const savedUser = {};
const savedOrgUser = {};
let keys = {};
let orgKeys = {};

describe('Minnie Email Service - Client SDK Tests', () => {

  it('should register a user with default TTL', async () => {
    const user = await minnie.createUser(30, false, (k) => { keys = k; }, () => { return keys; });
    console.log('Created user:', user);
    savedUser.uuid = user.userUUID;
    savedUser.emailName = user.emailName;
    savedUser.uuid.length.should.equal(36);
    savedUser.emailName.should.be.a('string');
  });

  it('should register an organization user', async () => {
    const user = await minnie.createUser(null, true, (k) => { orgKeys = k; }, () => { return orgKeys; });
    console.log('Created organization user:', user);
    savedOrgUser.uuid = user.userUUID;
    savedOrgUser.emailName = user.emailName;
    savedOrgUser.uuid.length.should.equal(36);
    savedOrgUser.emailName.should.be.a('string');
  });

  it('should get user inbox (initially empty)', async () => {
    // Re-call createUser to set sessionless.getKeys for first user
    await minnie.createUser(30, false, (k) => { keys = k; }, () => { return keys; });
    const inbox = await minnie.getInbox(savedUser.uuid);
    console.log('User inbox:', inbox);
    inbox.should.have.property('inbox');
    inbox.inbox.should.be.an('array');
  });

  it('should send an email on behalf of organization user', async () => {
    // Re-call createUser to set sessionless.getKeys for org user
    await minnie.createUser(null, true, (k) => { orgKeys = k; }, () => { return orgKeys; });
    const result = await minnie.send(
      savedOrgUser.uuid,
      'test@example.com',
      [],
      [],
      'This is a test email from the SDK'
    );
    console.log('Send email result:', result);
    result.should.have.property('success');
    result.success.should.equal(true);
  });

  it('should send an email with CC and BCC', async () => {
    // Re-call createUser to set sessionless.getKeys for org user
    await minnie.createUser(null, true, (k) => { orgKeys = k; }, () => { return orgKeys; });
    const result = await minnie.send(
      savedOrgUser.uuid,
      'test@example.com',
      ['cc@example.com'],
      ['bcc@example.com'],
      'Test email with CC and BCC'
    );
    console.log('Send email with CC/BCC result:', result);
    result.should.have.property('success');
    result.success.should.equal(true);
  });

  it('should delete a user', async () => {
    // Re-call createUser to set sessionless.getKeys for first user
    await minnie.createUser(30, false, (k) => { keys = k; }, () => { return keys; });
    const status = await minnie.deleteUser(savedUser.uuid);
    console.log('Delete user status:', status);
    status.should.equal(202);
  });

  it('should delete organization user', async () => {
    // Re-call createUser to set sessionless.getKeys for org user
    await minnie.createUser(null, true, (k) => { orgKeys = k; }, () => { return orgKeys; });
    const status = await minnie.deleteUser(savedOrgUser.uuid);
    console.log('Delete organization user status:', status);
    status.should.equal(202);
  });

});
