const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:your-email@example.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const subscriptions = new Map();

app.post('/api/subscribe', (req, res) => {
  const { endpoint, keys, playerAddress } = req.body;
  
  if (!endpoint || !keys || !playerAddress) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const subscription = { endpoint, keys };
  subscriptions.set(playerAddress.toLowerCase(), subscription);
  
  console.log(`Subscribed player: ${playerAddress}`);
  res.json({ success: true, message: 'Subscribed successfully' });
});

app.post('/api/unsubscribe', (req, res) => {
  const { playerAddress } = req.body;
  
  if (subscriptions.has(playerAddress.toLowerCase())) {
    subscriptions.delete(playerAddress.toLowerCase());
    console.log(`Unsubscribed player: ${playerAddress}`);
  }
  
  res.json({ success: true, message: 'Unsubscribed successfully' });
});

app.post('/api/notify-turn', async (req, res) => {
  const { playerAddress, message } = req.body;
  
  if (!playerAddress) {
    return res.status(400).json({ error: 'Player address required' });
  }

  const subscription = subscriptions.get(playerAddress.toLowerCase());
  
  if (!subscription) {
    return res.status(404).json({ error: 'No subscription found for this player' });
  }

  const payload = JSON.stringify({
    title: 'Acquire - Your Turn!',
    body: message || 'It\'s your turn to play',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'turn-notification',
    requireInteraction: true,
    data: { url: '/' }
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log(`Notification sent to ${playerAddress}`);
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending notification:', error);
    
    if (error.statusCode === 410) {
      subscriptions.delete(playerAddress.toLowerCase());
    }
    
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

async function monitorGameEvents() {
  if (!process.env.CONTRACT_ADDRESS || !process.env.RPC_URL) {
    console.log('Contract monitoring disabled: Missing CONTRACT_ADDRESS or RPC_URL');
    return;
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contractABI = [
    'event TilePlaced(uint256 playerId, uint8 x, uint8 y)',
    'function getCurrentPlayer() view returns (address)',
    'function players(uint256) view returns (address playerAddress, uint32 cash, bool isActive)'
  ];
  
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    contractABI,
    provider
  );

  contract.on('TilePlaced', async (playerId, x, y) => {
    console.log(`Tile placed by player ${playerId} at (${x}, ${y})`);
    
    try {
      const currentPlayer = await contract.getCurrentPlayer();
      const subscription = subscriptions.get(currentPlayer.toLowerCase());
      
      if (subscription) {
        const payload = JSON.stringify({
          title: 'Acquire - Your Turn!',
          body: `It's your turn to play. Last move: tile placed at (${x}, ${y})`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: 'turn-notification',
          requireInteraction: true,
          data: { url: '/' }
        });

        await webpush.sendNotification(subscription, payload);
        console.log(`Turn notification sent to ${currentPlayer}`);
      }
    } catch (error) {
      console.error('Error sending turn notification:', error);
    }
  });

  console.log('Monitoring game events...');
}

const PORT = process.env.NOTIFICATION_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT}`);
  console.log(`VAPID configured: ${!!VAPID_PUBLIC_KEY}`);
  monitorGameEvents();
});

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.log('\n⚠️  VAPID keys not configured!');
  console.log('Generate keys with: npx web-push generate-vapid-keys');
  console.log('Then add them to your .env file\n');
}
