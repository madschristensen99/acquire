// Dynamic SDK Email & Social Authentication
import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import {
  sendEmailOTP,
  verifyOTP,
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
  getWalletAccounts,
  onEvent,
  logout
} from "@dynamic-labs-sdk/client";
import { getChainsMissingWaasWalletAccounts, createWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";

const client = createDynamicClient({
  environmentId: "640fa485-6423-4a78-b63e-dce27c4b5f6d",
  metadata: {
    name: "Acquire Game",
    url: window.location.origin,
  },
});

// Register EVM extension (no arguments)
addEvmExtension();

let otpVerification = null;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async function() {
  // Check for OAuth redirect first
  await checkOAuthRedirect();
  
  setTimeout(initDynamicWidget, 500);
});

async function checkOAuthRedirect() {
  const currentUrl = new URL(window.location.href);
  const isReturning = await detectOAuthRedirect({ url: currentUrl });
  
  if (isReturning) {
    await completeSocialAuthentication({ url: currentUrl });
    await createWalletAfterAuth();
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function createWalletAfterAuth() {
  try {
    const missingChains = getChainsMissingWaasWalletAccounts();
    if (missingChains.length > 0) {
      await createWaasWalletAccounts({ chains: missingChains });
    }
  } catch (error) {
    console.error('Error creating wallet:', error);
  }
}

async function initDynamicWidget() {
  const authContainer = document.getElementById('dynamic-auth');
  if (!authContainer) {
    console.error('Auth container not found');
    return;
  }

  try {
    // Check if already authenticated
    const accounts = await getWalletAccounts();
    if (accounts && accounts.length > 0) {
      // Get user info to display email/name instead of address
      const userInfo = getUserInfo();
      showAuthenticatedUI(authContainer, userInfo);
      return;
    }
    
    // Show login UI
    showLoginUI(authContainer);
    
    // Listen for wallet changes
    onEvent({ event: 'walletAccountsChanged' }, (accounts) => {
      if (accounts && accounts.length > 0) {
        const userInfo = getUserInfo();
        showAuthenticatedUI(authContainer, userInfo);
      }
    }, client);
    
  } catch (error) {
    console.error('Error initializing Dynamic widget:', error);
  }
}

function getUserInfo() {
  // Access user data from client
  const user = client.user;
  if (!user) return 'User';
  
  // Prefer email, then username, then first verified credential
  if (user.email) return user.email;
  if (user.username) return user.username;
  if (user.verifiedCredentials && user.verifiedCredentials.length > 0) {
    const cred = user.verifiedCredentials[0];
    if (cred.email) return cred.email;
    if (cred.phoneNumber) return cred.phoneNumber;
  }
  
  return 'User';
}

function showLoginUI(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <button class="btn btn-primary" onclick="showEmailLogin()" style="width: 100%;">
        Sign in with Email
      </button>
      <button class="btn" onclick="signInWithGoogle()" style="width: 100%; background: white; color: #333; border: 1px solid var(--border);">
        Sign in with Google
      </button>
    </div>
  `;
}

// Make showLoginUI globally accessible
window.showLoginUI = showLoginUI;

function showAuthenticatedUI(container, userInfo) {
  const authSection = document.querySelector('.auth-section h3');
  if (authSection) {
    authSection.textContent = `Signed in as ${userInfo}`;
  }
  
  container.innerHTML = `
    <button class="btn" onclick="handleLogout()" style="width: 100%;">
      Sign Out
    </button>
  `;
}

function showEmailInput() {
  const container = document.getElementById('dynamic-auth');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <input type="email" id="email-input" placeholder="Enter your email" 
        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'Source Sans 3', sans-serif; font-size: 14px;" />
      <div style="display: flex; gap: 8px;">
        <button class="btn" onclick="window.showLoginUI(document.getElementById('dynamic-auth'))" style="flex: 1;">
          Back
        </button>
        <button class="btn btn-primary" onclick="sendOTP()" style="flex: 1;">
          Send Code
        </button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('email-input').focus(), 100);
}

function showOTPInput() {
  const container = document.getElementById('dynamic-auth');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <p style="font-size: 12px; color: var(--text-mid); margin: 0;">Enter the 6-digit code sent to your email</p>
      <input type="text" id="otp-input" placeholder="000000" maxlength="6"
        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 18px; text-align: center; letter-spacing: 4px;" />
      <div style="display: flex; gap: 8px;">
        <button class="btn" onclick="showEmailInput()" style="flex: 1;">
          Back
        </button>
        <button class="btn btn-primary" onclick="verifyOTPCode()" style="flex: 1;">
          Verify
        </button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('otp-input').focus(), 100);
}

// Global functions
window.showEmailLogin = showEmailInput;

window.sendOTP = async function() {
  const email = document.getElementById('email-input').value.trim();
  if (!email) {
    alert('Please enter your email');
    return;
  }
  
  try {
    otpVerification = await sendEmailOTP({ email });
    showOTPInput();
  } catch (error) {
    console.error('Error sending OTP:', error);
    alert('Failed to send code: ' + error.message);
  }
};

window.verifyOTPCode = async function() {
  const otp = document.getElementById('otp-input').value.trim();
  if (!otp || otp.length !== 6) {
    alert('Please enter the 6-digit code');
    return;
  }
  
  try {
    await verifyOTP({ otpVerification, verificationToken: otp });
    await createWalletAfterAuth();
    
    const userInfo = getUserInfo();
    showAuthenticatedUI(document.getElementById('dynamic-auth'), userInfo);
  } catch (error) {
    console.error('Error verifying OTP:', error);
    alert('Invalid code. Please try again.');
  }
};

window.signInWithGoogle = async function() {
  try {
    await authenticateWithSocial({
      provider: 'google',
      redirectUrl: window.location.origin,
    });
  } catch (error) {
    console.error('Error with Google sign in:', error);
    alert('Failed to sign in with Google: ' + error.message);
  }
};

window.handleLogout = async function() {
  try {
    await logout();
    showLoginUI(document.getElementById('dynamic-auth'));
    
    const authSection = document.querySelector('.auth-section h3');
    if (authSection) {
      authSection.textContent = 'Sign In for Online Multiplayer';
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
};

export { client };
