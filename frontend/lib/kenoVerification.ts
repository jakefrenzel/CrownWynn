/**
 * Hash a seed using SHA-256 (Web Crypto API)
 */
async function hash_seed_sha256(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Draw 10 Keno numbers from 1-40 using provably fair algorithm
 * THIS MUST MATCH THE BACKEND LOGIC EXACTLY
 */
async function draw_keno_numbers(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<number[]> {
  // Combine seeds and nonce with colon separator (backend uses f"{server_seed}:{client_seed}:{nonce}")
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  
  // Create SHA-256 hash
  const encoder = new TextEncoder();
  let data = encoder.encode(combined);
  let hashBuffer = await crypto.subtle.digest('SHA-256', data);
  let hashArray = Array.from(new Uint8Array(hashBuffer));
  let hashResult = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const drawnNumbers: number[] = [];
  let hashIndex = 0;
  
  while (drawnNumbers.length < 10) {
    // Take 2 hex characters at a time (0-255)
    if (hashIndex + 2 > hashResult.length) {
      // If we run out of hash, rehash with a counter
      const rehashInput = `${hashResult}:${drawnNumbers.length}`;
      data = encoder.encode(rehashInput);
      hashBuffer = await crypto.subtle.digest('SHA-256', data);
      hashArray = Array.from(new Uint8Array(hashBuffer));
      hashResult = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      hashIndex = 0;
    }
    
    const hexPair = hashResult.substring(hashIndex, hashIndex + 2);
    hashIndex += 2;
    
    // Convert to number 1-40
    const number = (parseInt(hexPair, 16) % 40) + 1;
    
    // Only add if not already in list
    if (!drawnNumbers.includes(number)) {
      drawnNumbers.push(number);
    }
  }
  
  return drawnNumbers.sort((a, b) => a - b);
}

/**
 * Verify that the game was fair by regenerating the drawn numbers
 */
export async function verify_keno_game(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  claimedDrawnNumbers: number[]
): Promise<{
  isValid: boolean;
  regeneratedDrawnNumbers: number[];
  hashMatches: boolean;
}> {
  // Verify server seed hash using SHA-256
  const calculatedHash = await hash_seed_sha256(serverSeed);
  const hashMatches = calculatedHash === serverSeedHash;
  
  // Regenerate drawn numbers
  const regeneratedDrawnNumbers = await draw_keno_numbers(serverSeed, clientSeed, nonce);
  
  // Check if drawn numbers match
  const numbersMatch = JSON.stringify(regeneratedDrawnNumbers) === JSON.stringify(claimedDrawnNumbers);
  
  return {
    isValid: hashMatches && numbersMatch,
    regeneratedDrawnNumbers,
    hashMatches,
  };
}
