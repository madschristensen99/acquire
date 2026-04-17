let currentPlayerId = null;
let contract = null;
let provider = null;
let signer = null;

const CONTRACT_ADDRESS = '0x1870bD1f441352ee6a2e38720aC326AE6C9B1989';
let CONTRACT_ABI = [];

// Load ABI
fetch('/AcquireGame.abi.json')
  .then(response => response.json())
  .then(abi => {
    CONTRACT_ABI = abi;
    console.log('Contract ABI loaded');
  })
  .catch(error => console.error('Error loading ABI:', error));

// Notification handling moved to notifications.js

async function monitorPlayerTurn() {
  if (!contract) return;
  
  try {
    const currentPlayer = await contract.getCurrentPlayer();
    const myAddress = await signer.getAddress();
    
    if (currentPlayer.toLowerCase() === myAddress.toLowerCase()) {
      if (document.hidden) {
        showLocalNotification('Your Turn!', 'It\'s your turn to play in Acquire');
      }
    }
  } catch (error) {
    console.error('Error monitoring turn:', error);
  }
}

function showLocalNotification(title, body) {
  if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'turn-notification',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { url: '/' },
        actions: [
          { action: 'open', title: 'Play Now' },
          { action: 'close', title: 'Dismiss' }
        ]
      });
    });
  }
}

async function initWeb3() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      signer = provider.getSigner();
      
      console.log('Connected to wallet');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  } else {
    alert('Please install MetaMask to use this app');
  }
}

setInterval(monitorPlayerTurn, 10000);

window.addEventListener('load', () => {
  // initPWA(); // Disabled - enable after VAPID configuration
  // initWeb3(); // Disabled - enable after wallet integration
  console.log('Game loaded in standalone mode');
});
