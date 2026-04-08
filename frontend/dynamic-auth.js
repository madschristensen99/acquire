// Dynamic SDK authentication with npm packages
import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";

const client = createDynamicClient({
  environmentId: "640fa485-6423-4a78-b63e-dce27c4b5f6d",
  metadata: {
    name: "Acquire Game",
    url: window.location.origin,
  },
});

// Add EVM extension for Ethereum wallet support
addEvmExtension(client);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initializeDynamic, 500);
});

async function initializeDynamic() {
  const authContainer = document.getElementById('dynamic-auth');
  if (!authContainer) {
    console.error('Auth container not found');
    return;
  }

  try {
    // Create connect button
    const button = document.createElement('button');
    button.className = 'btn btn-primary';
    button.style.width = '100%';
    button.textContent = 'Connect Wallet';
    
    button.onclick = async function() {
      try {
        // The SDK likely uses a UI modal that we need to trigger
        // Check for common wallet connection patterns
        
        // Try wallet connect via window.ethereum
        if (window.ethereum) {
          console.log('Using window.ethereum');
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('Connected accounts:', accounts);
          
          if (accounts && accounts.length > 0) {
            const addr = accounts[0];
            const authSection = document.querySelector('.auth-section h3');
            if (authSection) {
              authSection.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
            }
            button.textContent = 'Disconnect';
            button.onclick = async function() {
              window.location.reload();
            };
          }
        } else {
          alert('No wallet detected. Please install MetaMask or another Web3 wallet.');
        }
      } catch (error) {
        console.error('Connection failed:', error);
        if (error.code === 4001) {
          alert('Connection rejected by user');
        } else {
          alert('Failed to connect: ' + error.message);
        }
      }
    };
    
    authContainer.appendChild(button);
    console.log('Dynamic SDK initialized');

  } catch (error) {
    console.error('Error initializing Dynamic SDK:', error);
    authContainer.innerHTML = '<button class="btn btn-primary" onclick="alert(\'Failed to initialize authentication.\')" style="width:100%;">Connect Wallet</button>';
  }
}

function updateAuthUI(button, user) {
  console.log('User authenticated:', user);
  
  const authSection = document.querySelector('.auth-section h3');
  if (authSection && user?.walletAddress) {
    const addr = user.walletAddress;
    authSection.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
  }
  
  button.textContent = 'Disconnect';
  button.onclick = async function() {
    try {
      if (client.__core && typeof client.__core.logout === 'function') {
        await client.__core.logout();
        
        const authSection = document.querySelector('.auth-section h3');
        if (authSection) {
          authSection.textContent = 'Sign In for Online Multiplayer';
        }
        
        button.textContent = 'Connect Wallet';
        button.onclick = async function() {
          await client.__core.login();
          if (client.user) {
            updateAuthUI(button, client.user);
          }
        };
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
}

export { client };
