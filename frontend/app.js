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

// PWA disabled for now - enable after VAPID keys are configured
async function initPWA_DISABLED() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      await requestNotificationPermission(registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

async function requestNotificationPermission(registration) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    await subscribeToPush(registration);
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeToPush(registration);
    }
  }
}

async function subscribeToPush(registration) {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
    });
    
    console.log('Push subscription:', subscription);
    
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth'))
      },
      playerAddress: await signer.getAddress()
    };
    
    localStorage.setItem('pushSubscription', JSON.stringify(subscriptionData));
    
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

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
