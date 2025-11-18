#!/usr/bin/env node

/**
 * Generate PKCE Code Verifier and Challenge for Garmin OAuth 2.0
 *
 * Code Verifier: Random string (43-128 chars) using A-Z, a-z, 0-9, -._~
 * Code Challenge: base64url(sha256(code_verifier))
 */

const crypto = require('crypto');

// Generate code verifier (43-128 characters)
function generateCodeVerifier(length = 128) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomBytes = crypto.randomBytes(length);
  let verifier = '';

  for (let i = 0; i < length; i++) {
    verifier += charset[randomBytes[i] % charset.length];
  }

  return verifier;
}

// Generate code challenge from verifier
function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();

  // Base64url encoding (NOT standard base64)
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

// Generate both
const codeVerifier = generateCodeVerifier(128);
const codeChallenge = generateCodeChallenge(codeVerifier);

console.log('=== Garmin OAuth 2.0 PKCE ===\n');
console.log('Code Verifier (store this for token exchange):');
console.log(codeVerifier);
console.log('\nCode Challenge (use in authorization URL):');
console.log(codeChallenge);
console.log('\n=== For Authorization Request ===');
console.log('code_challenge=' + codeChallenge);
console.log('code_challenge_method=S256');
console.log('\n=== For Token Exchange ===');
console.log('code_verifier=' + codeVerifier);
