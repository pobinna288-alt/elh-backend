# Messaging System - Quick Reference

## Installation

```powershell
# Install WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## Files Created/Modified

### New Files
- `src/modules/messages/entities/conversation.entity.ts` - Conversation tracking
- `src/modules/messages/dto/start-conversation.dto.ts` - Start chat DTO
- `src/modules/messages/dto/update-message.dto.ts` - Status updates DTO
- `src/modules/messages/dto/index.ts` - DTO exports
- `src/modules/messages/entities/index.ts` - Entity exports
- `src/modules/messages/messages.gateway.ts` - WebSocket real-time events

### Modified Files
- `src/modules/messages/entities/message.entity.ts` - Added status, types
- `src/modules/messages/dto/create-message.dto.ts` - Extended fields
- `src/modules/messages/messages.service.ts` - All new features
- `src/modules/messages/messages.controller.ts` - New endpoints
- `src/modules/messages/messages.module.ts` - Updated imports
- `package.json` - Added WebSocket dependencies

## Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/messages/start-conversation` | POST | Message Seller button |
| `/messages/quick-reply` | POST | Quick reply send |
| `/messages/conversations` | GET | List all chats |
| `/messages/conversation/:id` | GET | Chat with messages |
| `/messages/unread-count` | GET | Badge count |
| `/messages/seller-response/:id` | GET | Response indicator |

## WebSocket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `new_message` | Server→Client | New message |
| `user_typing` | Both | Typing indicator |
| `message_read` | Both | Read receipt |
| `message_delivered` | Both | Delivery receipt |

## Quick API Test

```bash
# Start conversation
curl -X POST http://localhost:3000/messages/start-conversation \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"adId": "product-uuid"}'
```

## Database Migration

After installation, restart the server to auto-create tables:
- `conversations` table
- Updated `messages` table with new columns

---

See `MESSAGING_SYSTEM_DOCUMENTATION.md` for full documentation.
