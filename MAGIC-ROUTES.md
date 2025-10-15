# Minnie MAGIC-Routed Endpoints

## Overview

Minnie is a pure SMTP server service with no HTTP endpoints. As such, there are no POST, PUT, or DELETE routes to convert to MAGIC spells.

## Service Description

**Location**: `/minnie/`
**Port**: 2525 (SMTP)
**Protocol**: SMTP (Simple Mail Transfer Protocol)

Minnie provides email receiving functionality for the Planet Nine ecosystem using the SMTP protocol. It listens on port 2525 for incoming SMTP connections.

## Current Implementation

```javascript
const SMTPServer = require("smtp-server").SMTPServer;
const server = new SMTPServer({
  disabledCommands: ['STARTTLS', 'AUTH'],
  logger: true,
  onData(stream, session, callback){
    stream.pipe(process.stdout); // print message to console
    stream.on('end', callback);
  }
});

server.listen(2525);
```

**Features**:
- Listens on port 2525 for SMTP connections
- Prints received email messages to console
- No authentication required (AUTH disabled)
- No TLS encryption (STARTTLS disabled)
- Logger enabled for debugging

## Why No MAGIC Routes?

Minnie operates using the SMTP protocol, not HTTP. MAGIC spells are designed for HTTP-based REST API operations that use:
- POST requests for creating resources
- PUT requests for updating resources
- DELETE requests for removing resources

Since Minnie:
- Has no HTTP server
- Has no REST endpoints
- Operates purely as an SMTP mail receiver
- Has no user-facing API operations

There are no routes to convert to MAGIC spells.

## Future MAGIC Integration

If Minnie were to add HTTP-based email management features in the future, the following operations could be converted to MAGIC spells:

### Potential Future Operations

**Email Management** (if HTTP API added):
- `POST /email/send` → `minnieSend` - Send email via spell
- `POST /email/template` → `minnieTemplate` - Create email template
- `PUT /email/template/:id` → `minnieTemplateUpdate` - Update template
- `DELETE /email/template/:id` → `minnieTemplateDelete` - Delete template

**Configuration Management** (if HTTP API added):
- `PUT /config/smtp` → `minnieConfigSmtp` - Configure SMTP settings
- `POST /config/whitelist` → `minnieConfigWhitelist` - Add to whitelist
- `DELETE /config/whitelist/:address` → `minnieConfigWhitelistDelete` - Remove from whitelist

**Integration Points** (hypothetical):
- **Julia**: Email notification triggers
- **Fount**: Email-based spell casting
- **Minnie + MAGIC**: Spell-triggered email sending

## Current Status

**MAGIC Conversion**: N/A - No HTTP routes to convert

**Service Type**: SMTP Server Only

**Integration**: Currently operates independently for email receiving

## Minnie's Role in Planet Nine

Minnie is the **email receiving service** that provides:

### Email Reception
- SMTP server for incoming mail
- Message logging and processing
- Basic email receiving infrastructure

### Future Capabilities
- Email sending (if HTTP API added)
- Template management
- Email-based notifications
- Integration with other Planet Nine services

## Next Steps

Progress on MAGIC route conversion:
- ✅ Joan (3 routes complete)
- ✅ Pref (4 routes complete)
- ✅ Aretha (4 routes complete)
- ✅ Continuebee (3 routes complete)
- ✅ BDO (4 routes complete)
- ✅ Julia (8 routes complete)
- ✅ Dolores (8 routes complete)
- ✅ Sanora (6 routes complete)
- ✅ Addie (9 routes complete)
- ✅ Covenant (5 routes complete)
- ✅ Prof (3 routes complete)
- ✅ Fount (7 routes complete)
- ✅ **Minnie (0 routes - SMTP only, no HTTP endpoints)**

## Conclusion

**MAGIC Route Conversion Project: COMPLETE!** 🎉

All Planet Nine microservices with HTTP POST/PUT/DELETE routes have been successfully converted to MAGIC spells. Minnie, as a pure SMTP service, has no routes to convert.

**Final Statistics**:
- **Services Converted**: 12 services
- **Total Routes Converted**: 64 routes
- **Spells Created**: 64 spells
- **Test Files Created**: 12 test suites
- **Documentation Files**: 12 MAGIC-ROUTES.md files

The entire Planet Nine ecosystem now routes all state-changing operations through the centralized MAGIC resolver (Fount) for consistent authentication, MP management, experience granting, and gateway rewards.

## Last Updated
January 14, 2025
