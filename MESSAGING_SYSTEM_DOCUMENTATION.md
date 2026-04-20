# Marketplace Messaging System Documentation

## Overview

Complete buyer-seller messaging system optimized for the **Ad View → Message Seller → Conversation → Sale** flow.

## Installation

Install required WebSocket dependencies:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install --save-dev @types/socket.io
```

## Core Features

| Feature | Description |
|---------|-------------|
| Pre-filled Messages | Auto-generated message with product name |
| Product Preview Cards | Product context at top of chat |
| Quick Reply Suggestions | One-tap response buttons |
| Seller Response Indicator | Average response time display |
| Unread Notifications | Badge counts and real-time alerts |
| Read Receipts | ✓ Sent → ✓✓ Delivered → ✓✓ Read |
| Real-time Chat | WebSocket-based live messaging |
| Typing Indicators | "Seller is typing..." with auto-timeout |

---

## API Endpoints

### 1. Start Conversation (Message Seller Button)

```http
POST /messages/start-conversation
Authorization: Bearer <token>
Content-Type: application/json

{
  "adId": "product-uuid",
  "autoSend": false,
  "initialMessage": "Custom message (optional)"
}
```

**Response:**
```json
{
  "conversationId": "conv-uuid",
  "productCard": {
    "productName": "Wireless Headphones",
    "productPrice": 35,
    "productCurrency": "USD",
    "productThumbnail": "https://...",
    "sellerName": "John",
    "sellerId": "seller-uuid"
  },
  "preFilledMessage": "Hi, I'm interested in the Wireless Headphones listed on your ad.\nIs it still available?",
  "quickReplies": [
    "Is this still available?",
    "What's the final price?",
    "Where are you located?",
    "Do you offer delivery?"
  ],
  "sellerResponseIndicator": "Seller usually replies within 10 minutes",
  "sellerAverageResponseTime": 480,
  "messageSent": false,
  "messages": []
}
```

---

### 2. Send Message

```http
POST /messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hi, I'm interested in this product",
  "receiverId": "user-uuid",
  "conversationId": "conv-uuid",
  "adId": "product-uuid",
  "messageType": "text"
}
```

**Message Types:**
- `text` - Regular text message
- `quick_reply` - Quick reply button tap
- `pre_filled` - Auto-generated initial message
- `system` - System notifications
- `image` - Image attachment
- `offer` - Price offer

---

### 3. Send Quick Reply

```http
POST /messages/quick-reply
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "conv-uuid",
  "quickReplyContent": "Is this still available?"
}
```

---

### 4. Get Conversations List

```http
GET /messages/conversations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "count": 5,
  "conversations": [
    {
      "id": "conv-uuid",
      "otherUser": {
        "id": "user-uuid",
        "username": "john_seller",
        "profilePhoto": "https://..."
      },
      "productCard": {
        "productName": "Wireless Headphones",
        "productPrice": 35,
        "productCurrency": "USD",
        "productThumbnail": "https://...",
        "adId": "ad-uuid",
        "adActive": true
      },
      "lastMessage": "Is it still available?",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "unreadCount": 2,
      "sellerResponseIndicator": "Seller usually replies within 10 minutes",
      "isBuyer": true
    }
  ]
}
```

---

### 5. Get Conversation Details

```http
GET /messages/conversation/:conversationId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "conversation": {
    "id": "conv-uuid",
    "productCard": {
      "productName": "Wireless Headphones",
      "productPrice": 35,
      "productCurrency": "USD",
      "productThumbnail": "https://...",
      "adId": "ad-uuid",
      "adActive": true
    },
    "buyer": {
      "id": "buyer-uuid",
      "username": "buyer123",
      "profilePhoto": "https://..."
    },
    "seller": {
      "id": "seller-uuid",
      "username": "john_seller",
      "profilePhoto": "https://..."
    },
    "sellerResponseIndicator": "Seller usually replies within 10 minutes",
    "isBuyer": true
  },
  "messages": [
    {
      "id": "msg-uuid",
      "content": "Hi, I'm interested in the Wireless Headphones",
      "senderId": "buyer-uuid",
      "senderUsername": "buyer123",
      "status": "read",
      "statusIndicator": { "text": "Read", "icon": "✓✓" },
      "messageType": "pre_filled",
      "createdAt": "2024-01-15T10:30:00Z",
      "isOwn": true
    }
  ],
  "quickReplies": [
    "Is this still available?",
    "What's the final price?",
    "Where are you located?",
    "Do you offer delivery?"
  ]
}
```

---

### 6. Message Status Updates

#### Update Single Message Status
```http
PATCH /messages/:messageId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "read"
}
```

#### Mark Message as Read
```http
PATCH /messages/:messageId/read
Authorization: Bearer <token>
```

#### Mark Multiple Messages as Read
```http
PATCH /messages/mark-read
Authorization: Bearer <token>
Content-Type: application/json

{
  "messageIds": ["msg-uuid-1", "msg-uuid-2"]
}
```

#### Mark Conversation as Read
```http
PATCH /messages/conversation/:conversationId/read
Authorization: Bearer <token>
```

---

### 7. Unread Counts

#### Total Unread Count (for badge)
```http
GET /messages/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "count": 5
}
```

#### Unread by Conversation
```http
GET /messages/unread-counts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 5,
  "byConversation": {
    "conv-uuid-1": 2,
    "conv-uuid-2": 3
  }
}
```

---

### 8. Seller Response Indicator

```http
GET /messages/seller-response/:sellerId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "averageResponseTime": 480,
  "totalResponses": 150,
  "indicator": "Seller usually replies within 10 minutes"
}
```

---

### 9. Conversation Management

#### Archive Conversation
```http
PATCH /messages/conversation/:conversationId/archive
Authorization: Bearer <token>
Content-Type: application/json

{
  "archive": true
}
```

#### Block User
```http
PATCH /messages/conversation/:conversationId/block
Authorization: Bearer <token>
Content-Type: application/json

{
  "block": true
}
```

---

## WebSocket Events

### Connection

Connect to the WebSocket server:
```javascript
const socket = io('/chat', {
  auth: {
    userId: 'current-user-uuid'
  }
});
```

### Events

#### Join Conversation Room
```javascript
socket.emit('join_conversation', { conversationId: 'conv-uuid' });
```

#### Send Message (Real-time)
```javascript
socket.emit('send_message', {
  content: 'Hello!',
  receiverId: 'receiver-uuid',
  conversationId: 'conv-uuid',
  adId: 'ad-uuid'
});
```

#### Typing Indicator
```javascript
// Start typing
socket.emit('user_typing', { conversationId: 'conv-uuid' });

// Stop typing (manual)
socket.emit('user_stopped_typing', { conversationId: 'conv-uuid' });
```
*Note: Typing indicator auto-clears after 3 seconds of inactivity*

#### Message Delivered
```javascript
socket.emit('message_delivered', {
  messageId: 'msg-uuid',
  conversationId: 'conv-uuid'
});
```

#### Message Read
```javascript
socket.emit('message_read', {
  messageId: 'msg-uuid',
  conversationId: 'conv-uuid'
});
```

#### Mark Conversation Read
```javascript
socket.emit('mark_conversation_read', { conversationId: 'conv-uuid' });
```

#### Check User Online Status
```javascript
socket.emit('check_online', { userId: 'user-uuid' });
```

### Listening for Events

```javascript
// New message received
socket.on('new_message', (data) => {
  console.log('New message:', data.message);
});

// New message notification (for badge)
socket.on('new_message_notification', (data) => {
  console.log('Notification:', data.preview);
});

// Typing indicator
socket.on('user_typing', (data) => {
  if (data.typing) {
    console.log('User is typing...');
  } else {
    console.log('User stopped typing');
  }
});

// Message delivered
socket.on('message_delivered', (data) => {
  console.log('Message delivered:', data.messageId);
});

// Message read
socket.on('message_read', (data) => {
  console.log('Message read:', data.messageId);
});

// Conversation marked read
socket.on('conversation_read', (data) => {
  console.log('Conversation read by:', data.readBy);
});

// User online/offline
socket.on('user_online', (data) => {
  console.log('User online:', data.userId);
});

socket.on('user_offline', (data) => {
  console.log('User offline:', data.userId);
});
```

---

## Frontend Integration Examples

### Message Seller Button Click

```javascript
async function onMessageSellerClick(adId) {
  const response = await fetch('/messages/start-conversation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ adId, autoSend: false })
  });

  const data = await response.json();

  // Open chat UI with:
  // - data.productCard (product preview at top)
  // - data.preFilledMessage (in input field)
  // - data.quickReplies (quick reply buttons)
  // - data.sellerResponseIndicator (seller badge)

  openChatPanel(data);
}
```

### Quick Reply Handler

```javascript
async function sendQuickReply(conversationId, quickReply) {
  const response = await fetch('/messages/quick-reply', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId,
      quickReplyContent: quickReply
    })
  });

  return response.json();
}
```

### Unread Badge Component

```javascript
function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    fetch('/messages/unread-count', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setCount(data.count));

    // Real-time updates
    socket.on('new_message_notification', () => {
      setCount(prev => prev + 1);
    });

    socket.on('conversation_read', () => {
      // Refresh count
      fetchUnreadCount();
    });
  }, []);

  return count > 0 ? <Badge>🔴 {count}</Badge> : null;
}
```

---

## UI Layout Guidelines

### Desktop Layout

```
┌──────────────────────────────────────────────────────────┐
│  Ads Feed        │  Ad Details       │  Chat Panel      │
│                  │                   │                   │
│  [Product 1]     │  [Product Image]  │  ┌─────────────┐ │
│  [Product 2]     │  Price: $35       │  │Product Card │ │
│  [Product 3]     │  Seller: John     │  └─────────────┘ │
│  [Product 4]     │                   │                   │
│                  │  [Message Seller] │  [Chat Messages] │
│                  │                   │                   │
│                  │                   │  ┌─────────────┐ │
│                  │                   │  │Quick Replies│ │
│                  │                   │  └─────────────┘ │
│                  │                   │  [Message Input] │
└──────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────┐
│  Ad Image       │
│                 │
│  Price: $35     │
│  Seller: John   │
│                 │
│ [Message Seller]│
└─────────────────┘
        ↓
┌─────────────────┐  (Full-screen chat)
│ ← Back          │
│                 │
│ ┌─────────────┐ │
│ │Product Card │ │
│ └─────────────┘ │
│                 │
│ [Chat Messages] │
│                 │
│ ┌─────────────┐ │
│ │Quick Replies│ │
│ └─────────────┘ │
│ [Message Input] │
└─────────────────┘
```

---

## Database Schema

### Message Entity

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| content | TEXT | Message text |
| messageType | ENUM | text/quick_reply/pre_filled/system/image/offer |
| status | ENUM | sent/delivered/read |
| senderId | UUID | Sender user reference |
| receiverId | UUID | Receiver user reference |
| conversationId | UUID | Conversation reference |
| adId | UUID | Related product reference |
| mediaUrl | VARCHAR | Optional media attachment |
| deliveredAt | TIMESTAMP | When delivered |
| readAt | TIMESTAMP | When read |
| createdAt | TIMESTAMP | Creation timestamp |

### Conversation Entity

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| buyerId | UUID | Buyer user reference |
| sellerId | UUID | Seller user reference |
| adId | UUID | Related product reference |
| productName | VARCHAR | Cached product name |
| productPrice | DECIMAL | Cached product price |
| productCurrency | VARCHAR | Currency code |
| productThumbnail | VARCHAR | Cached thumbnail URL |
| lastMessageContent | TEXT | Preview of last message |
| lastMessageAt | TIMESTAMP | Time of last message |
| buyerUnreadCount | INT | Unread count for buyer |
| sellerUnreadCount | INT | Unread count for seller |
| averageResponseTime | FLOAT | Seller avg response (seconds) |
| isArchivedByBuyer | BOOLEAN | Buyer archive status |
| isArchivedBySeller | BOOLEAN | Seller archive status |
| isBlockedByBuyer | BOOLEAN | Buyer block status |
| isBlockedBySeller | BOOLEAN | Seller block status |

---

## Response Time Indicators

| Average Time | Indicator Text |
|--------------|----------------|
| ≤ 5 min | "Seller usually replies within 5 minutes" |
| ≤ 10 min | "Seller usually replies within 10 minutes" |
| ≤ 1 hour | "Seller usually replies within 1 hour" |
| > 1 hour | "Seller usually replies within a few hours" |
| No history | "New seller - no response history yet" |

---

## Message Status Indicators

| Status | Icon | Description |
|--------|------|-------------|
| Sending | ○ | Message being sent |
| Sent | ✓ | Message left sender |
| Delivered | ✓✓ | Message reached receiver |
| Read | ✓✓ (blue) | Receiver opened message |

---

## Quick Reference

### Conversation Flow

1. **Buyer clicks "Message Seller"** → `POST /messages/start-conversation`
2. **Pre-filled message appears** → User can edit or send
3. **Quick reply buttons shown** → One-tap options
4. **Product card displayed** → Context awareness
5. **Seller response indicator** → Trust building

### Real-time Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `new_message` | Server → Client | New message received |
| `user_typing` | Bidirectional | Typing indicator |
| `message_delivered` | Bidirectional | Delivery confirmation |
| `message_read` | Bidirectional | Read receipt |
| `user_online` | Server → Client | Online status |

### Notification Badges

- **Chat Icon**: Total unread count
- **Conversation List**: Per-conversation unread
- **Seller Dashboard**: All unread from buyers
