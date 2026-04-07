# PWA Setup Guide - Acquire Game

This guide explains how to set up push notifications for the Acquire game PWA.

## Features

- **Progressive Web App (PWA)**: Install the game on your device
- **Push Notifications**: Get notified when it's your turn to play
- **Offline Support**: Service worker caches assets for offline play
- **Auto Turn Monitoring**: Automatically monitors blockchain events and sends notifications

## Setup Instructions

### 1. Generate VAPID Keys

VAPID keys are required for web push notifications:

```bash
npm run generate-vapid
```

This will output something like:
```
Public Key: BKxT...
Private Key: abc123...
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=mailto:your-email@example.com

# Contract Configuration
CONTRACT_ADDRESS=your_deployed_contract_address
RPC_URL=https://api.helium.fhenix.zone

# Notification Server
NOTIFICATION_PORT=3001
```

### 3. Update Frontend Configuration

Edit `frontend/app.js` and replace:
- `YOUR_VAPID_PUBLIC_KEY` with your actual VAPID public key
- `YOUR_CONTRACT_ADDRESS_HERE` with your deployed contract address

### 4. Create PWA Icons

You need to create icon images in the following sizes and place them in `frontend/icons/`:

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

You can use an online tool like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) to create these from a single source image.

### 5. Start the Notification Server

```bash
npm run notify
```

The server will:
- Listen for player subscriptions
- Monitor blockchain events
- Send push notifications when it's a player's turn

### 6. Serve the Frontend

You can use any static file server. For example:

```bash
cd frontend
npx http-server -p 8080
```

Or use a production server like Nginx, Apache, or deploy to Netlify/Vercel.

## How It Works

### Client-Side (PWA)

1. **Service Worker Registration**: `sw.js` is registered when the page loads
2. **Push Subscription**: User grants notification permission and subscribes
3. **Turn Monitoring**: App polls the contract every 10 seconds to check current player
4. **Local Notifications**: If it's your turn and the app is in background, shows notification

### Server-Side (Notification Server)

1. **Subscription Management**: Stores push subscriptions per player address
2. **Event Monitoring**: Listens to `TilePlaced` events from the smart contract
3. **Automatic Notifications**: Sends push notification to the next player after each move

## API Endpoints

The notification server exposes these endpoints:

### POST /api/subscribe
Subscribe a player to push notifications
```json
{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  },
  "playerAddress": "0x..."
}
```

### POST /api/unsubscribe
Unsubscribe a player
```json
{
  "playerAddress": "0x..."
}
```

### POST /api/notify-turn
Manually trigger a notification (for testing)
```json
{
  "playerAddress": "0x...",
  "message": "It's your turn!"
}
```

## Testing Push Notifications

1. Open the app in a browser (must be HTTPS or localhost)
2. Grant notification permission when prompted
3. Join a game and play a turn
4. Close or minimize the browser
5. When it becomes your turn again, you should receive a notification

## Troubleshooting

### Notifications not working?

- Check browser console for errors
- Verify VAPID keys are correctly set
- Ensure notification permission is granted
- Check that service worker is registered (DevTools > Application > Service Workers)
- Verify the notification server is running

### Service Worker not updating?

- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Unregister the service worker in DevTools
- Clear browser cache

### Contract events not detected?

- Verify CONTRACT_ADDRESS and RPC_URL are correct
- Check notification server logs for errors
- Ensure the contract is deployed and has active games

## Production Deployment

For production:

1. Use HTTPS (required for service workers and push notifications)
2. Deploy notification server to a reliable host (e.g., Railway, Render, Heroku)
3. Set up proper CORS configuration
4. Use environment variables for all sensitive data
5. Consider using a database to persist subscriptions (currently in-memory)
6. Set up monitoring and logging

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited (iOS 16.4+ for push notifications)
- Opera: Full support

## Security Notes

- VAPID keys should be kept secret (private key especially)
- Only send notifications to users who have explicitly subscribed
- Validate all input to the notification server
- Use HTTPS in production
- Consider rate limiting the notification endpoints
