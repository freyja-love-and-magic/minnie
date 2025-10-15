# Minnie - Planet Nine SMTP Email Service

## Overview

Minnie is a Planet Nine allyabase microservice that provides SMTP email functionality. Unlike other Planet Nine services, Minnie operates purely as an SMTP server without HTTP endpoints.

**Location**: `/minnie/`
**Port**: 2525 (SMTP)

## Core Features

### 📧 **SMTP Server**
- **Email Delivery**: Pure SMTP protocol email handling
- **No HTTP API**: Operates exclusively via SMTP protocol
- **Mail Relay**: Email forwarding and delivery

## Protocol

Minnie uses the SMTP (Simple Mail Transfer Protocol) for all operations:
- Protocol: SMTP
- Port: 2525 (default)
- No REST endpoints
- No HTTP API

## MAGIC Route Conversion Status

**Minnie does not require MAGIC conversion** because:
1. It has no HTTP endpoints to convert
2. Operates purely as an SMTP server
3. Uses SMTP protocol, not HTTP/REST
4. Email operations not suitable for MAGIC spell abstraction

**Documentation**: See `/MAGIC-ROUTES.md` for detailed explanation

## Architecture

Minnie is designed as a standalone SMTP service that other Planet Nine services can use for email functionality when needed. It does not participate in the MAGIC protocol ecosystem due to its different communication pattern.

## Integration

Other services can integrate with Minnie via:
- Direct SMTP connections on port 2525
- Standard email client libraries
- SMTP protocol specifications

## Last Updated
October 14, 2025 - Documented MAGIC conversion status. Minnie remains SMTP-only with no HTTP endpoints or MAGIC spell conversion required.
