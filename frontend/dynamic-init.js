// Dynamic SDK disabled for standalone testing
// Enable this after configuring wallet integration
(function() {
  console.log('Dynamic SDK integration disabled - game running in standalone mode');
  return;
  
  const DYNAMIC_ENV_ID = '640fa485-6423-4a78-b63e-dce27c4b5f6d';
  
  let dynamicSDK = null;
  let walletConnector = null;
  
  // Wait for DOM and Dynamic SDK to load
  window.addEventListener('DOMContentLoaded', function() {
    initializeDynamic();
  });
  
  function initializeDynamic() {
    if (typeof window.DynamicSDK === 'undefined') {
      console.error('Dynamic SDK not loaded');
      setTimeout(initializeDynamic, 100);
      return;
    }
    
    const { DynamicContextProvider, DynamicWidget } = window.DynamicSDK;
    const { EthereumWalletConnectors } = window.DynamicEthereum || {};
    
    if (!DynamicContextProvider || !EthereumWalletConnectors) {
      console.error('Dynamic SDK components not available');
      return;
    }
    
    // Create Dynamic widget container
    const authContainer = document.getElementById('dynamic-auth');
    if (!authContainer) {
      console.error('Auth container not found');
      return;
    }
    
    // Initialize Dynamic SDK
    try {
      const root = ReactDOM.createRoot(authContainer);
      
      root.render(
        React.createElement(DynamicContextProvider, {
          settings: {
            environmentId: DYNAMIC_ENV_ID,
            walletConnectors: [EthereumWalletConnectors],
            eventsCallbacks: {
              onAuthSuccess: handleAuthSuccess,
              onLogout: handleLogout,
              onAuthFailure: (error) => {
                console.error('Auth failed:', error);
              }
            }
          }
        }, 
        React.createElement(DynamicWidget, {
          innerButtonComponent: 'Connect Wallet to Play'
        }))
      );
      
      console.log('Dynamic SDK initialized');
    } catch (error) {
      console.error('Error initializing Dynamic:', error);
    }
  }
  
  async function handleAuthSuccess(event) {
    console.log('Authentication successful:', event);
    
    try {
      const { primaryWallet, user } = event;
      
      if (!primaryWallet) {
        console.error('No primary wallet found');
        return;
      }
      
      // Get wallet address
      const address = primaryWallet.address;
      console.log('Connected wallet address:', address);
      
      // Store globally
      window.walletAddress = address;
      window.walletConnector = primaryWallet.connector;
      window.currentUser = user;
      
      // Initialize ethers provider
      if (window.ethers && primaryWallet.connector) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          window.ethersProvider = provider;
          window.ethersSigner = signer;
          
          console.log('Ethers provider initialized');
        } catch (error) {
          console.error('Error initializing ethers:', error);
        }
      }
      
      // Hide auth screen, show game
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      
      // Initialize game if callback exists
      if (window.onWalletConnected) {
        window.onWalletConnected(address);
      }
      
      // Subscribe to push notifications
      if (window.initPWA) {
        window.initPWA();
      }
      
    } catch (error) {
      console.error('Error in auth success handler:', error);
    }
  }
  
  function handleLogout() {
    console.log('User logged out');
    
    // Clear wallet data
    window.walletAddress = null;
    window.walletConnector = null;
    window.ethersProvider = null;
    window.ethersSigner = null;
    window.currentUser = null;
    
    // Show auth screen, hide game
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    
    // Reset game state
    if (window.S) {
      window.S = null;
    }
  }
  
  // Export helper functions
  window.getWalletAddress = function() {
    return window.walletAddress;
  };
  
  window.isWalletConnected = function() {
    return !!window.walletAddress;
  };
  
  window.getEthersProvider = function() {
    return window.ethersProvider;
  };
  
  window.getEthersSigner = function() {
    return window.ethersSigner;
  };
  
})();
