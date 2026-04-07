// Dynamic Wallet Authentication
import { DynamicContextProvider, DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

const DYNAMIC_ENV_ID = '640fa485-6423-4a78-b63e-dce27c4b5f6d';

// Initialize Dynamic authentication
export function initDynamic() {
  const dynamicRoot = document.getElementById('dynamic-auth');
  if (!dynamicRoot) {
    console.error('Dynamic auth root element not found');
    return;
  }

  // Create React root and render Dynamic provider
  const root = ReactDOM.createRoot(dynamicRoot);
  root.render(
    React.createElement(DynamicContextProvider, {
      settings: {
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
        eventsCallbacks: {
          onAuthSuccess: (args) => {
            console.log('Auth success:', args);
            handleAuthSuccess(args);
          },
          onLogout: () => {
            console.log('User logged out');
            handleLogout();
          },
        },
      },
    }, React.createElement(DynamicWidget))
  );
}

async function handleAuthSuccess(authData) {
  try {
    const { primaryWallet } = authData;
    if (!primaryWallet) {
      console.error('No primary wallet found');
      return;
    }

    const address = await primaryWallet.address;
    const connector = await primaryWallet.connector;
    
    console.log('Connected wallet:', address);
    
    // Store wallet info globally
    window.walletAddress = address;
    window.walletConnector = connector;
    
    // Initialize ethers provider from Dynamic
    if (connector && connector.ethers) {
      window.ethersProvider = connector.ethers;
      window.ethersSigner = await connector.ethers.getSigner();
    }
    
    // Show game UI
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Trigger game initialization if needed
    if (window.onWalletConnected) {
      window.onWalletConnected(address);
    }
  } catch (error) {
    console.error('Error handling auth success:', error);
  }
}

function handleLogout() {
  window.walletAddress = null;
  window.walletConnector = null;
  window.ethersProvider = null;
  window.ethersSigner = null;
  
  // Show auth screen
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// Export for use in other modules
export function getWalletAddress() {
  return window.walletAddress;
}

export function getEthersProvider() {
  return window.ethersProvider;
}

export function getEthersSigner() {
  return window.ethersSigner;
}

export function isWalletConnected() {
  return !!window.walletAddress;
}
