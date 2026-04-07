# Acquire Game - Complete Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:

```bash
# Wallet & Deployment
PRIVATE_KEY=your_private_key_here
FHENIX_RPC_URL=https://api.helium.fhenix.zone

# Push Notifications (generate with: npm run generate-vapid)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_EMAIL=mailto:your-email@example.com

# Contract Configuration
CONTRACT_ADDRESS=your_deployed_contract_address
RPC_URL=https://api.helium.fhenix.zone

# Notification Server
NOTIFICATION_PORT=3001
```

### 3. Generate VAPID Keys (for push notifications)

```bash
npm run generate-vapid
```

Copy the output keys to your `.env` file.

### 4. Compile Smart Contract

```bash
npm run compile
```

### 5. Deploy Contract

Deploy to Fhenix testnet:

```bash
npm run deploy
```

Or deploy locally:

```bash
npm run deploy:local
```

Copy the deployed contract address to your `.env` file.

### 6. Update Frontend Configuration

Edit `frontend/app.js` and update:
- `CONTRACT_ADDRESS` with your deployed contract address
- `YOUR_VAPID_PUBLIC_KEY` with your VAPID public key

### 7. Create PWA Icons

Create icon images in these sizes and place in `frontend/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

Use [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) to create these.

### 8. Run the Application

**Option A: Run everything together**
```bash
npm run dev
```

This starts:
- Notification server on port 3001
- Frontend server on port 8080

**Option B: Run separately**

Terminal 1 - Notification Server:
```bash
npm run notify
```

Terminal 2 - Frontend:
```bash
npm run serve
```

### 9. Access the Game

Open your browser to:
```
http://localhost:8080
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile smart contracts |
| `npm test` | Run contract tests |
| `npm run deploy` | Deploy to Fhenix testnet |
| `npm run deploy:local` | Deploy to local network |
| `npm run notify` | Start notification server |
| `npm run generate-vapid` | Generate VAPID keys for push notifications |
| `npm run serve` | Serve frontend on port 8080 |
| `npm run dev` | Run notification server + frontend together |

## 🔧 Notification Server

The notification server (`notification-server.js`) handles:
- Push notification subscriptions
- Blockchain event monitoring
- Automatic turn notifications

**Endpoints:**
- `POST /api/subscribe` - Subscribe to notifications
- `POST /api/unsubscribe` - Unsubscribe from notifications
- `POST /api/notify-turn` - Manually trigger notification (testing)

## 🎮 Dynamic Wallet Authentication

The game uses Dynamic SDK for wallet authentication:

1. **Environment ID**: Already configured (`640fa485-6423-4a78-b63e-dce27c4b5f6d`)
2. **Supported Wallets**: MetaMask, WalletConnect, Coinbase Wallet, and more
3. **Auto-initialization**: Dynamic widget loads on page load

## 🔐 Fhenix FHE Features

The contract uses Fully Homomorphic Encryption (FHE) to keep:
- **Player tiles** - Private (only you can see your hand)
- **Share holdings** - Private (encrypted on-chain)
- **Cash balances** - Public (for transparency)

## 📱 PWA Features

- **Installable**: Add to home screen on mobile/desktop
- **Offline Support**: Service worker caches assets
- **Push Notifications**: Get notified when it's your turn
- **Native Feel**: Full-screen app experience

## 🐛 Troubleshooting

### Notifications not working?
1. Check VAPID keys are set in `.env`
2. Verify notification server is running
3. Grant notification permission in browser
4. Check browser console for errors

### Contract not deploying?
1. Verify `PRIVATE_KEY` has funds
2. Check `FHENIX_RPC_URL` is correct
3. Ensure Hardhat config is correct

### Dynamic auth not loading?
1. Check browser console for errors
2. Verify Dynamic SDK scripts are loading
3. Ensure environment ID is correct
4. Check network connection

### Game not connecting to contract?
1. Update `CONTRACT_ADDRESS` in `frontend/app.js`
2. Verify wallet is connected
3. Check you're on the correct network (Fhenix)
4. Ensure contract is deployed

## 📚 Additional Resources

- [Fhenix Documentation](https://docs.fhenix.zone/)
- [Dynamic Documentation](https://docs.dynamic.xyz/)
- [PWA Setup Guide](./PWA_SETUP.md)
- [Game Rules](./README.md)

## 🎯 Production Deployment

For production:

1. **Use HTTPS** (required for PWA and push notifications)
2. **Deploy notification server** to Railway, Render, or Heroku
3. **Set up proper CORS** configuration
4. **Use environment variables** for all sensitive data
5. **Set up database** for persistent subscriptions
6. **Configure monitoring** and logging
7. **Deploy frontend** to Netlify, Vercel, or similar

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Check notification server logs
4. Verify all environment variables are set

Happy gaming! 🎲
