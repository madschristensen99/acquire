// Auto-faucet system for funding user wallets
(function() {
  const API_URL = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('localhost')
    ? 'http://localhost:3001'
    : 'https://your-production-api.com';

  let lastCheckTime = 0;
  const CHECK_INTERVAL = 60000; // Check every 60 seconds

  async function checkAndFundWallet(address) {
    try {
      console.log('💰 Checking wallet balance for:', address);
      
      // Check balance
      const checkResponse = await fetch(`${API_URL}/api/faucet/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!checkResponse.ok) {
        console.error('Failed to check balance');
        return;
      }

      const checkData = await checkResponse.json();
      console.log('💰 Balance:', checkData.balance, 'ETH');

      if (checkData.needs_funding) {
        console.log('💧 Wallet needs funding, requesting from faucet...');
        
        // Request funding
        const fundResponse = await fetch(`${API_URL}/api/faucet/fund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address })
        });

        if (!fundResponse.ok) {
          console.error('Failed to fund wallet');
          return;
        }

        const fundData = await fundResponse.json();
        
        if (fundData.success && fundData.tx_hash) {
          console.log('✅ Wallet funded! TX:', fundData.tx_hash);
          
          // Show notification to user
          if (window.showModal) {
            window.showModal('Wallet Funded', `Your wallet has been funded with testnet ETH!\n\nTX: ${fundData.tx_hash.slice(0, 10)}...`);
          }
        } else {
          console.log('ℹ️', fundData.message);
        }
      } else {
        console.log('✅ Wallet has sufficient balance');
      }
    } catch (error) {
      console.error('Error in auto-faucet:', error);
    }
  }

  // Periodic balance check
  async function startBalanceMonitoring() {
    setInterval(async () => {
      if (!window.client) return;
      
      const now = Date.now();
      if (now - lastCheckTime < CHECK_INTERVAL) return;
      
      try {
        const walletClient = await window.client.getWalletClient();
        if (!walletClient) return;
        
        const address = await walletClient.getAddress();
        if (address) {
          lastCheckTime = now;
          await checkAndFundWallet(address);
        }
      } catch (error) {
        console.error('Error getting wallet address:', error);
      }
    }, 10000); // Check every 10 seconds, but rate-limited to once per minute
  }

  // Check balance when user signs in
  window.addEventListener('dynamic-auth-success', async () => {
    console.log('🔐 User authenticated, checking balance...');
    
    // Wait a bit for wallet to be ready
    setTimeout(async () => {
      try {
        if (!window.client) return;
        
        const walletClient = await window.client.getWalletClient();
        if (!walletClient) return;
        
        const address = await walletClient.getAddress();
        if (address) {
          await checkAndFundWallet(address);
        }
      } catch (error) {
        console.error('Error checking balance on auth:', error);
      }
    }, 2000);
  });

  // Start monitoring
  startBalanceMonitoring();
  
  // Check balance on page load if already authenticated
  async function checkBalanceOnLoad() {
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (window.isAuthenticated && window.client) {
        console.log('🔐 User already authenticated, checking balance...');
        try {
          const walletClient = await window.client.getWalletClient();
          if (walletClient) {
            const address = await walletClient.getAddress();
            if (address) {
              await checkAndFundWallet(address);
              return; // Success, exit
            }
          }
        } catch (error) {
          console.log('⚠️ Could not check balance (attempt ' + (retries + 1) + '):', error.message);
        }
      }
      
      retries++;
    }
    
    console.log('⚠️ Faucet: Could not get wallet after 10 seconds');
  }
  
  checkBalanceOnLoad();
  
  // Export for manual use
  window.checkAndFundWallet = checkAndFundWallet;
  
  console.log('💧 Auto-faucet system initialized');
})();
