import secrets
import hashlib
import json


def generate_server_seed():
    """Generate a cryptographically secure random server seed."""
    return secrets.token_hex(32)  # 64 character hex string


def generate_client_seed():
    """Generate a random client seed."""
    return secrets.token_hex(32)  # 64 character hex string


def hash_seed(seed):
    """Create SHA-256 hash of a seed for provably fair verification."""
    return hashlib.sha256(seed.encode()).hexdigest()


def generate_mine_positions(server_seed, client_seed, nonce, mines_count):
    """
    Generate mine positions using provably fair algorithm.
    
    Args:
        server_seed: Server's secret seed
        client_seed: Client's seed (player can reroll)
        nonce: Game counter
        mines_count: Number of mines to place (1-24)
    
    Returns:
        List of mine positions [0-24]
    """
    # Combine seeds and nonce
    combined = f"{server_seed}:{client_seed}:{nonce}"
    
    # Create hash
    hash_result = hashlib.sha256(combined.encode()).hexdigest()
    
    # Use hash to deterministically select mine positions
    mine_positions = []
    hash_index = 0
    
    while len(mine_positions) < mines_count:
        # Take 2 hex characters at a time (0-255)
        if hash_index + 2 > len(hash_result):
            # If we run out of hash, rehash with a counter
            hash_result = hashlib.sha256(f"{hash_result}:{len(mine_positions)}".encode()).hexdigest()
            hash_index = 0
        
        hex_pair = hash_result[hash_index:hash_index + 2]
        hash_index += 2
        
        # Convert to number 0-24
        position = int(hex_pair, 16) % 25
        
        # Only add if not already in list
        if position not in mine_positions:
            mine_positions.append(position)
    
    return sorted(mine_positions)


def calculate_multiplier(tiles_revealed, mines_count):
    """
    Calculate exponential multiplier based on tiles revealed and mines count.
    
    Formula: multiplier = (total_tiles / safe_tiles) ^ tiles_revealed
    
    Args:
        tiles_revealed: Number of safe tiles revealed
        mines_count: Total number of mines in game
    
    Returns:
        Multiplier as float rounded to 2 decimal places
    """
    if tiles_revealed == 0:
        return 1.00
    
    total_tiles = 25
    safe_tiles = total_tiles - mines_count
    
    # Base multiplier: ratio of total to safe tiles
    base = total_tiles / safe_tiles
    
    # Exponential growth
    multiplier = base ** tiles_revealed
    
    return round(multiplier, 2)


def verify_game_fairness(server_seed, client_seed, nonce, mines_count, claimed_positions):
    """
    Verify that the mine positions match the seeds (for provably fair verification).
    
    Args:
        server_seed: Revealed server seed
        client_seed: Client seed used
        nonce: Nonce used
        mines_count: Number of mines
        claimed_positions: The mine positions that were used in the game
    
    Returns:
        Boolean indicating if the game was fair
    """
    actual_positions = generate_mine_positions(server_seed, client_seed, nonce, mines_count)
    return actual_positions == claimed_positions
