# Minnie Email Service - Test Suite

Comprehensive mocha test suite for the Minnie email service, covering both server endpoints and client SDK functionality.

## Test Files

- **server.js** - Tests for HTTP REST endpoints
- **client.js** - Tests for JavaScript client SDK

## Prerequisites

1. **Minnie Server Running**: The Minnie service must be running on port 2525
2. **Dependencies Installed**: Run `npm install` in this directory

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Server Tests Only
```bash
npm run test:server
```

### Run Client SDK Tests Only
```bash
npm run test:client
```

## Test Coverage

### Server Tests (11 tests)
1. ✅ Register user with default TTL (30 days)
2. ✅ Register organization user with indefinite TTL
3. ✅ Return existing UUID for duplicate registration
4. ✅ Get user inbox (initially empty)
5. ✅ Send email on behalf of user
6. ✅ Send email with CC and BCC
7. ✅ Reject email send with invalid signature
8. ✅ Reject inbox access with invalid signature
9. ✅ Reject stale timestamp requests
10. ✅ Delete user account
11. ✅ Return 404 for deleted user access

### Client SDK Tests (7 tests)
1. ✅ Register user with default TTL
2. ✅ Register organization user
3. ✅ Get user inbox
4. ✅ Send email on behalf of organization
5. ✅ Send email with CC and BCC
6. ✅ Delete user account
7. ✅ Delete organization user account

## Authentication

All tests use sessionless cryptography:
- secp256k1 keypairs generated per user
- Signatures created with timestamp + params
- Server validates signatures before processing

## Environment Configuration

Tests default to local server at `http://127.0.0.1:2525/`

For production testing, set the `SUB_DOMAIN` environment variable:
```bash
SUB_DOMAIN=prod npm test
```

This will test against `https://prod.minnie.allyabase.com/`

## API Endpoints Tested

### PUT /user/create
Creates new user or returns existing UUID for duplicate pubKey.

**Request**:
```json
{
  "timestamp": "1234567890",
  "pubKey": "03abc123...",
  "ttl": 30,
  "isOrganization": false,
  "signature": "sig123..."
}
```

**Response**:
```json
{
  "userUUID": "uuid-here",
  "emailName": "FOUR123456"
}
```

### GET /user/:uuid/inbox
Retrieves curated inbox for user.

**Query Params**: `timestamp`, `signature`

**Response**:
```json
{
  "inbox": {
    "1234567890": "message content"
  }
}
```

### POST /user/:uuid/send
Sends email on behalf of user (organization users only).

**Request**:
```json
{
  "timestamp": "1234567890",
  "userUUID": "uuid-here",
  "recipient": "test@example.com",
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "body": "Email body",
  "signature": "sig123..."
}
```

**Response**:
```json
{
  "success": true
}
```

### DELETE /user/delete
Deletes user email name.

**Request**:
```json
{
  "timestamp": "1234567890",
  "userUUID": "uuid-here",
  "signature": "sig123..."
}
```

**Response**: HTTP 202 Accepted

## Client SDK Methods Tested

### minnie.createUser(ttl, isOrganization, saveKeys, getKeys)
Creates user with optional TTL and organization flag.

### minnie.getInbox(uuid)
Retrieves inbox for user UUID.

### minnie.send(uuid, recipient, cc, bcc, body)
Sends email on behalf of user.

### minnie.deleteUser(uuid)
Deletes user email name.

## Notes

- Tests use `describe()` blocks to group related tests
- Each test is isolated with separate user accounts
- Server must be running before tests execute
- Tests timeout after 10 seconds
- Signature validation ensures secure authentication

## Debugging

To see detailed request/response logs, check the console output when running tests. Each HTTP request is logged with:
- Request method and path
- Request body (for PUT/POST)
- Response body

## Key Learnings & Implementation Notes

### Test Results (January 4, 2026)
```
✔ 12/12 Server Tests (100%)
✔ 7/7 Client SDK Tests (100%)
──────────────────────────────
✔ 19/19 Total Tests (100%)
```

### Critical Discovery: Duplicate Registration as Key Switching Mechanism

**Problem**: The `sessionless-node` library caches the `getKeys` function globally when `generateKeys()` is called. Tests need to switch between different users' keys for multi-user scenarios.

**Failed Approaches**:
1. Setting `sessionless.getKeys = () => { return keys; }` directly ❌ (ignored by library)
2. Calling `generateKeys()` with empty save function ❌ (creates new keys, not existing ones)

**Successful Solution**: Re-call `createUser()` before operations that need different keys:

```javascript
// Switch to first user's keys by "re-registering" (returns existing user)
await minnie.createUser(30, false, (k) => { keys = k; }, () => { return keys; });
const inbox = await minnie.getInbox(savedUser.uuid);

// Switch to org user's keys
await minnie.createUser(null, true, (k) => { orgKeys = k; }, () => { return orgKeys; });
const result = await minnie.send(savedOrgUser.uuid, 'test@example.com', [], [], 'Email');
```

**Why This Works**:
1. Calling `createUser()` with existing pubKey returns existing user UUID (duplicate handling feature)
2. It calls `sessionless.generateKeys()` internally, which updates the global `getKeys` function
3. Subsequent SDK calls (`getInbox`, `send`, `deleteUser`) use the newly set keys
4. No new users created - just leveraging duplicate registration to reset sessionless state

**Code Reference**: See `db.js:15-19` for `getUserByPubKey()` and `db.js:33-35` for Redis index

### Server Bugs Fixed

1. **Missing MAGIC import**: Removed non-existent `./src/magic/magic.js` import
2. **ES modules config**: Changed `package.json` to `"type": "module"`
3. **Dependency versions**: Updated `fount-js` to `"latest"`
4. **Return value bug**: Fixed `savedUser.uuid` → `savedUser.userUUID` in `/user/create` at `minnie.js:115`
5. **Client SDK keys**: Fixed empty object `{}` truthy check to explicit `!keys || !keys.privateKey` in `minnie.js:58`
6. **Duplicate registration**: Implemented `getUserByPubKey()` with Redis `pubkey:{pubKey}` → `uuid` index
7. **Error status codes**: Proper 403/404/500 distinction with try-catch around signature verification

### Error Status Code Pattern

All endpoints now use consistent error handling:

```javascript
// Signature verification wrapped in try-catch
let isValidSignature = false;
try {
  isValidSignature = sessionless.verifySignature(signature, message, foundUser.pubKey);
} catch(verifyErr) {
  console.warn('Signature verification error:', verifyErr);
  res.status(403);  // Authentication error
  return res.send({error: 'Auth error'});
}

if(!isValidSignature) {
  res.status(403);  // Authorization error
  return res.send({error: 'Auth error'});
}

// ... business logic ...

// Catch blocks use 500 for server errors
catch(err) {
  console.warn(err);
  res.status(500);  // Internal server error
  return res.send({error: 'Server error'});
}
```

**Status Code Usage**:
- **403**: Authentication/signature failures
- **404**: Resource not found (deleted user, etc.)
- **500**: Server-side errors (database, etc.)

### Database Schema

**User Storage** - Key: `user:{uuid}`
```json
{
  "userUUID": "abc-123...",
  "pubKey": "02a1b2c3...",
  "emailName": "FOUR123456",
  "ttl": 30,
  "isOrganization": false,
  "inbox": []
}
```

**PubKey Index** - Key: `pubkey:{pubKey}`, Value: `uuid`
- Enables O(1) duplicate detection
- Created in `db.putUser()` at line 34
- Queried in `db.getUserByPubKey()` at line 16

### TTL Behavior

- **Regular users**: Default 30 days, user-configurable
- **Organizations**: Always `-1` (indefinite), overrides any provided TTL (enforced at `db.js:26`)

## Future Test Coverage

Potential additions:
- MAGIC spell tests
- Email delivery verification (Resend integration)
- TTL expiration tests
- Spam filtering tests
- 2FA code extraction tests
- Receipt parsing tests
