// Dynamic SDK Email & Social Authentication
import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import {
  sendEmailOTP,
  sendSmsOTP,
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
    // Check if already authenticated (check localStorage first, then wallet accounts)
    const savedUsername = localStorage.getItem('dynamic_username');
    let userInfo = null;
    
    if (savedUsername) {
      // User authenticated with phone/SMS and set username
      userInfo = savedUsername;
      window.currentUsername = savedUsername;
      showAuthenticatedUI(authContainer, userInfo);
      return;
    }
    
    const accounts = await getWalletAccounts();
    if (accounts && accounts.length > 0) {
      // User authenticated with email/Google
      userInfo = getUserInfo();
      window.currentUsername = userInfo;
      showAuthenticatedUI(authContainer, userInfo);
      return;
    }
    
    // Show login UI
    showLoginUI(authContainer);
    
    // Listen for wallet changes
    onEvent({ event: 'walletAccountsChanged' }, (accounts) => {
      if (accounts && accounts.length > 0) {
        const userInfo = getUserInfo();
        window.currentUsername = userInfo;
        showAuthenticatedUI(authContainer, userInfo);
      }
    }, client);
    
  } catch (error) {
    console.error('Error initializing Dynamic widget:', error);
  }
}

function getUserInfo() {
  // Check localStorage first for saved username
  const savedUsername = localStorage.getItem('dynamic_username');
  if (savedUsername) {
    window.currentUsername = savedUsername;
    return savedUsername;
  }
  
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
      <button class="btn" onclick="showEmailLogin()" style="width: 100%; background: white; color: #333; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="m2 7 10 7 10-7"/>
        </svg>
        Sign in with Email
      </button>
      <button class="btn" onclick="showPhoneLogin()" style="width: 100%; background: white; color: #333; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        Sign in with Phone
      </button>
      <button class="btn" onclick="signInWithGoogle()" style="width: 100%; background: white; color: #333; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
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

function showPhoneInput() {
  const container = document.getElementById('dynamic-auth');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <select id="country-code" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'Source Sans 3', sans-serif; font-size: 14px;">
        <option value="US">🇺🇸 United States (+1)</option>
        <option value="GB">🇬🇧 United Kingdom (+44)</option>
        <option value="CA">🇨🇦 Canada (+1)</option>
        <option value="AU">🇦🇺 Australia (+61)</option>
        <option value="DE">🇩🇪 Germany (+49)</option>
        <option value="FR">🇫🇷 France (+33)</option>
        <option value="ES">🇪🇸 Spain (+34)</option>
        <option value="IT">🇮🇹 Italy (+39)</option>
        <option value="JP">🇯🇵 Japan (+81)</option>
        <option value="CN">🇨🇳 China (+86)</option>
        <option value="IN">🇮🇳 India (+91)</option>
      </select>
      <input type="tel" id="phone-input" placeholder="Phone number" 
        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'Source Sans 3', sans-serif; font-size: 14px;" />
      <div style="display: flex; gap: 8px;">
        <button class="btn" onclick="window.showLoginUI(document.getElementById('dynamic-auth'))" style="flex: 1;">
          Back
        </button>
        <button class="btn btn-primary" onclick="sendSMS()" style="flex: 1;">
          Send Code
        </button>
      </div>
    </div>
  `;
  setTimeout(() => document.getElementById('phone-input').focus(), 100);
}

function showUsernamePrompt() {
  const container = document.getElementById('dynamic-auth');
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <p style="font-size: 12px; color: var(--text-mid); margin: 0;">Choose a username for your account</p>
      <input type="text" id="username-input" placeholder="Enter username" maxlength="20"
        style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 6px; font-family: 'Source Sans 3', sans-serif; font-size: 14px;" />
      <button class="btn btn-primary" onclick="saveUsername()" style="width: 100%;">
        Continue
      </button>
    </div>
  `;
  setTimeout(() => document.getElementById('username-input').focus(), 100);
}

// Global functions
window.showEmailLogin = showEmailInput;
window.showPhoneLogin = showPhoneInput;

window.saveUsername = function() {
  const username = document.getElementById('username-input').value.trim();
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  // Store username in localStorage for this session
  localStorage.setItem('dynamic_username', username);
  window.currentUsername = username;
  
  showAuthenticatedUI(document.getElementById('dynamic-auth'), username);
  
  // Trigger rSetup to update the game mode buttons
  if (typeof rSetup === 'function') {
    setTimeout(() => rSetup(), 100);
  }
};

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

window.sendSMS = async function() {
  const countryCode = document.getElementById('country-code').value;
  const phoneNumber = document.getElementById('phone-input').value.trim();
  
  if (!phoneNumber) {
    alert('Please enter your phone number');
    return;
  }
  
  try {
    otpVerification = await sendSmsOTP({ 
      isoCountryCode: countryCode, 
      phoneNumber: phoneNumber 
    });
    showOTPInput();
  } catch (error) {
    console.error('Error sending SMS:', error);
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
    
    let userInfo = getUserInfo();
    
    // If user authenticated with phone and has no email/username, prompt for username
    if (userInfo === 'User' || !userInfo) {
      showUsernamePrompt();
    } else {
      showAuthenticatedUI(document.getElementById('dynamic-auth'), userInfo);
    }
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
    
    // Clear saved username
    localStorage.removeItem('dynamic_username');
    window.currentUsername = null;
    
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
