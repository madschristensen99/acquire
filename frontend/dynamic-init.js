// Dynamic SDK authentication integration
(function() {
  
  // Wait for DOM and Dynamic SDK to load
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeDynamic, 300);
  });
  
  function initializeDynamic() {
    // Check if Dynamic SDK is loaded
    if (typeof window.dynamic === 'undefined') {
      console.log('Waiting for Dynamic SDK to load...');
      setTimeout(initializeDynamic, 300);
      return;
    }
    
    const authContainer = document.getElementById('dynamic-auth');
    if (!authContainer) {
      console.error('Auth container not found');
      setTimeout(initializeDynamic, 300);
      return;
    }
    
    try {
      // Create Dynamic button
      const button = document.createElement('button');
      button.className = 'btn btn-primary';
      button.style.width = '100%';
      button.textContent = 'Connect Wallet';
      button.onclick = function() {
        window.dynamic.auth.login();
      };
      
      authContainer.appendChild(button);
      
      // Listen for auth events
      window.dynamic.events.on('auth.success', function(user) {
        console.log('User authenticated:', user);
        const authSection = document.querySelector('.auth-section h3');
        if (authSection && user.walletPublicKey) {
          const addr = user.walletPublicKey;
          authSection.textContent = `Connected: ${addr.slice(0,6)}...${addr.slice(-4)}`;
        }
        
        // Update button to logout
        button.textContent = 'Disconnect';
        button.onclick = function() {
          window.dynamic.auth.logout();
        };
      });
      
      window.dynamic.events.on('auth.logout', function() {
        console.log('User logged out');
        const authSection = document.querySelector('.auth-section h3');
        if (authSection) {
          authSection.textContent = 'Sign In for Online Multiplayer';
        }
        
        // Update button to login
        button.textContent = 'Connect Wallet';
        button.onclick = function() {
          window.dynamic.auth.login();
        };
      });
      
      console.log('Dynamic SDK initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Dynamic SDK:', error);
      // Fallback button
      authContainer.innerHTML = '<button class="btn btn-primary" onclick="alert(\'Dynamic SDK failed to load. Please refresh the page.\')" style="width:100%;">Connect Wallet</button>';
    }
  }
  
})();
