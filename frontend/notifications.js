// Push Notification Management

let notificationPermission = 'default';
let pushSubscription = null;

// Request notification permission and subscribe
async function requestNotificationPermission(playerName, gameCode) {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return false;
  }

  try {
    // Ensure service worker is registered
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      console.log('Registering service worker...');
      registration = await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    notificationPermission = permission;

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    // Wait for service worker to be ready
    registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      console.error('Push manager not available');
      return false;
    }

    // Get VAPID public key from server (you'll need to expose this)
    const vapidPublicKey = await getVapidPublicKey();
    
    if (!vapidPublicKey) {
      console.error('VAPID public key not available');
      return false;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    pushSubscription = subscription;

    // Send subscription to server
    const subscriptionData = subscription.toJSON();
    
    const response = await fetch(`${API_URL}/api/players/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player_name: playerName,
        game_code: gameCode,
        endpoint: subscriptionData.endpoint,
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth
      })
    });

    if (!response.ok) {
      throw new Error('Failed to subscribe on server');
    }

    console.log('✅ Push notification subscription successful');
    return true;

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return false;
  }
}

// Get VAPID public key from environment or server
async function getVapidPublicKey() {
  // For now, we'll need to expose this from the server
  // You should add an endpoint like GET /api/vapid-public-key
  // For testing, you can hardcode it here temporarily
  const vapidKey = localStorage.getItem('vapid_public_key');
  if (vapidKey) return vapidKey;
  
  // TODO: Fetch from server endpoint
  console.warn('VAPID public key not configured. Add GET /api/vapid-public-key endpoint');
  return null;
}

// Convert VAPID key from base64 to Uint8Array
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

// Notify other players that it's their turn
async function notifyTurnChange(gameCode, currentPlayerName) {
  try {
    const response = await fetch(`${API_URL}/api/players/notify-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_code: gameCode,
        current_player_name: currentPlayerName
      })
    });

    if (!response.ok) {
      console.error('Failed to send turn notifications');
    } else {
      console.log('✅ Turn notifications sent');
    }
  } catch (error) {
    console.error('Error sending turn notifications:', error);
  }
}

// Show notification permission prompt with custom UI
function showNotificationPrompt(onAccept, onDecline) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <h2>Enable Notifications?</h2>
      <p>Get notified when it's your turn to play!</p>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn" onclick="declineNotifications()" style="flex:1;">No Thanks</button>
        <button class="btn btn-primary" onclick="acceptNotifications()" style="flex:1;">Enable</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  window.acceptNotifications = () => {
    modal.remove();
    if (onAccept) onAccept();
  };
  
  window.declineNotifications = () => {
    modal.remove();
    if (onDecline) onDecline();
  };
}

// Export functions
window.requestNotificationPermission = requestNotificationPermission;
window.notifyTurnChange = notifyTurnChange;
window.showNotificationPrompt = showNotificationPrompt;
