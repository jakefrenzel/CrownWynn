// Client-side verification utilities for provably fair mines game

export function hash_seed(seed: string): string {
  // Use the Web Crypto API for SHA-256 hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  
  // Note: crypto.subtle.digest is async, but we'll use a simpler sync approach
  // For production, consider using a proper crypto library like crypto-js
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export async function hash_seed_sha256(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export async function generate_mine_positions(
  server_seed: string,
  client_seed: string,
  nonce: number,
  mines_count: number
): Promise<number[]> {
  // THIS MUST MATCH THE BACKEND LOGIC EXACTLY
  // Combine seeds and nonce with colon separator (backend uses f"{server_seed}:{client_seed}:{nonce}")
  const combined = `${server_seed}:${client_seed}:${nonce}`;
  
  // Create SHA-256 hash
  const encoder = new TextEncoder();
  let data = encoder.encode(combined);
  let hashBuffer = await crypto.subtle.digest('SHA-256', data);
  let hashArray = Array.from(new Uint8Array(hashBuffer));
  let hash_result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const mine_positions: number[] = [];
  let hash_index = 0;
  
  while (mine_positions.length < mines_count) {
    // Take 2 hex characters at a time (0-255)
    if (hash_index + 2 > hash_result.length) {
      // If we run out of hash, rehash with a counter
      const rehash_input = `${hash_result}:${mine_positions.length}`;
      data = encoder.encode(rehash_input);
      hashBuffer = await crypto.subtle.digest('SHA-256', data);
      hashArray = Array.from(new Uint8Array(hashBuffer));
      hash_result = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      hash_index = 0;
    }
    
    const hex_pair = hash_result.substring(hash_index, hash_index + 2);
    hash_index += 2;
    
    // Convert to number 0-24
    const position = parseInt(hex_pair, 16) % 25;
    
    // Only add if not already in list
    if (!mine_positions.includes(position)) {
      mine_positions.push(position);
    }
  }
  
  return mine_positions.sort((a, b) => a - b);
}

export async function verify_game(
  server_seed: string,
  server_seed_hash: string,
  client_seed: string,
  nonce: number,
  mines_count: number,
  actual_mine_positions: number[]
): Promise<{ isValid: boolean; regenerated_positions: number[]; hash_matches: boolean }> {
  // Verify server seed hash using SHA-256
  const calculated_hash = await hash_seed_sha256(server_seed);
  const hash_matches = calculated_hash === server_seed_hash;
  
  // Regenerate mine positions
  const regenerated_positions = await generate_mine_positions(
    server_seed,
    client_seed,
    nonce,
    mines_count
  );
  
  // Check if positions match
  const positions_match = JSON.stringify(regenerated_positions) === JSON.stringify(actual_mine_positions);
  
  return {
    isValid: hash_matches && positions_match,
    regenerated_positions,
    hash_matches
  };
}
