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

## Future Test Coverage

Potential additions:
- MAGIC spell tests
- Email delivery verification
- TTL expiration tests
- Spam filtering tests
- 2FA code extraction tests
- Receipt parsing tests
