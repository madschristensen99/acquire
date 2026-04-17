// Blockchain integration for Acquire game using Fhenix FHE
// Note: This requires @cofhe/sdk to be loaded via CDN or bundled

(function() {
  const CONTRACT_ADDRESS = '0x1870bD1f441352ee6a2e38720aC326AE6C9B1989';
  const CHAIN_ID = 84532; // Base Sepolia

  let cofheClient = null;
  let contract = null;
  let provider = null;
  let signer = null;

  // Initialize Cofhe SDK with Dynamic wallet
  async function initBlockchain() {
  if (!window.client) {
    throw new Error('Please sign in with Dynamic first');
  }

  try {
    // Get Dynamic's embedded wallet provider
    const dynamicProvider = await window.client.getWalletClient();
    if (!dynamicProvider) {
      throw new Error('No wallet connected. Please sign in first.');
    }
    
    // Create ethers provider and signer from Dynamic wallet
    provider = new ethers.BrowserProvider(dynamicProvider);
    signer = await provider.getSigner();
    
    // Load contract ABI
    const response = await fetch('/AcquireGame.abi.json');
    const abi = await response.json();
    
    // Create contract instance
    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    
    // Initialize Cofhe client
    const config = createCofheConfig({
      supportedChains: [{ id: CHAIN_ID, name: 'Base Sepolia' }],
    });
    
    cofheClient = createCofheClient(config);
    
    // Connect with ethers adapter
    const adapter = new Ethers6Adapter(provider, signer);
    await cofheClient.connect(adapter.publicClient, adapter.walletClient);
    
    console.log('✅ Blockchain initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize blockchain:', error);
    throw error;
  }
}

  // Join game on-chain
  async function joinGameOnChain() {
  if (!contract) throw new Error('Blockchain not initialized');
  
  try {
    const tx = await contract.joinGame();
    await tx.wait();
    
    // Get player ID from event
    const filter = contract.filters.PlayerJoined();
    const events = await contract.queryFilter(filter);
    const latestEvent = events[events.length - 1];
    
    return latestEvent.args.playerId;
  } catch (error) {
    console.error('Failed to join game:', error);
    throw error;
  }
}

  // Start game on-chain
  async function startGameOnChain() {
  if (!contract) throw new Error('Blockchain not initialized');
  
  try {
    const tx = await contract.startGame();
    await tx.wait();
    console.log('✅ Game started on-chain');
  } catch (error) {
    console.error('Failed to start game:', error);
    throw error;
  }
}

  // Place tile on-chain with FHE encryption
  async function placeTileOnChain(tileIndex, x, y) {
  if (!contract || !cofheClient) throw new Error('Blockchain not initialized');
  
  try {
    // Create or get permit for encrypted operations
    await cofheClient.permits.getOrCreateSelfPermit();
    
    // Encrypt the tile index
    const [encryptedTileIndex] = await cofheClient
      .encryptInputs([Encryptable.uint8(tileIndex)])
      .execute();
    
    // Get permission for the contract call
    const permission = cofheClient.permits.getActivePermit().getPermission();
    
    // Place tile on-chain
    const tx = await contract.placeTile(encryptedTileIndex, x, y, permission);
    await tx.wait();
    
    console.log(`✅ Tile placed at (${x}, ${y})`);
    return true;
  } catch (error) {
    console.error('Failed to place tile:', error);
    throw error;
  }
}

  // Get current player from contract
  async function getCurrentPlayer() {
  if (!contract) throw new Error('Blockchain not initialized');
  
  try {
    const gameState = await contract.gameState();
    const currentPlayerIndex = gameState.currentPlayerIndex;
    const player = await contract.players(currentPlayerIndex);
    return player.playerAddress;
  } catch (error) {
    console.error('Failed to get current player:', error);
    throw error;
  }
}

  // Check if it's the user's turn
  async function isMyTurn() {
  if (!signer) return false;
  
  try {
    const currentPlayer = await getCurrentPlayer();
    const myAddress = await signer.getAddress();
    return currentPlayer.toLowerCase() === myAddress.toLowerCase();
  } catch (error) {
    console.error('Failed to check turn:', error);
    return false;
  }
}

  // Listen for blockchain events
  function listenForGameEvents(onTilePlaced, onTurnChanged) {
  if (!contract) return;
  
  // Listen for TilePlaced events
  contract.on('TilePlaced', (playerId, x, y) => {
    console.log(`Tile placed by player ${playerId} at (${x}, ${y})`);
    if (onTilePlaced) onTilePlaced(playerId, x, y);
  });
  
  // Poll for turn changes
  let lastPlayer = null;
  setInterval(async () => {
    try {
      const currentPlayer = await getCurrentPlayer();
      if (currentPlayer !== lastPlayer) {
        lastPlayer = currentPlayer;
        if (onTurnChanged) onTurnChanged(currentPlayer);
      }
    } catch (error) {
      console.error('Error checking turn:', error);
    }
  }, 5000); // Check every 5 seconds
}

  // Auto-initialize when Dynamic client is ready
  if (window.client) {
    // Wait for wallet to be ready
    setTimeout(async () => {
      try {
        const walletClient = await window.client.getWalletClient();
        if (walletClient) {
          await initBlockchain();
          console.log('✅ Blockchain auto-initialized with Dynamic wallet');
        }
      } catch (error) {
        console.log('⏳ Blockchain will initialize after sign-in');
      }
    }, 1000);
  }

  // Export for global access
  window.blockchainAPI = {
    init: initBlockchain,
    joinGame: joinGameOnChain,
    startGame: startGameOnChain,
    placeTile: placeTileOnChain,
    getCurrentPlayer,
    isMyTurn,
    listenForEvents: listenForGameEvents,
  };
})();
