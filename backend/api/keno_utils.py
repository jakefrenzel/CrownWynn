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


def draw_keno_numbers(server_seed, client_seed, nonce):
    """
    Draw 10 numbers from 1-40 using provably fair algorithm.
    
    Args:
        server_seed: Server's secret seed
        client_seed: Client's seed (player can reroll)
        nonce: Game counter
    
    Returns:
        List of 10 drawn numbers [1-40]
    """
    # Combine seeds and nonce
    combined = f"{server_seed}:{client_seed}:{nonce}"
    
    # Create hash
    hash_result = hashlib.sha256(combined.encode()).hexdigest()
    
    # Use hash to deterministically select 10 numbers
    drawn_numbers = []
    hash_index = 0
    
    while len(drawn_numbers) < 10:
        # Take 2 hex characters at a time (0-255)
        if hash_index + 2 > len(hash_result):
            # If we run out of hash, rehash with a counter
            hash_result = hashlib.sha256(f"{hash_result}:{len(drawn_numbers)}".encode()).hexdigest()
            hash_index = 0
        
        hex_pair = hash_result[hash_index:hash_index + 2]
        hash_index += 2
        
        # Convert to number 1-40
        number = (int(hex_pair, 16) % 40) + 1
        
        # Only add if not already in list
        if number not in drawn_numbers:
            drawn_numbers.append(number)
    
    return sorted(drawn_numbers)


def calculate_keno_multiplier(spots_selected, matches):
    """
    Calculate Keno payout multiplier based on spots selected and matches.
    
    This uses a typical Keno payout table structure.
    
    Args:
        spots_selected: Number of spots/numbers the player selected (1-10)
        matches: Number of matches between selected and drawn numbers
    
    Returns:
        Multiplier as float (0.00 if no win)
    """
    # Keno payout table: {spots_selected: {matches: multiplier}}
    payout_table = {
        1: {1: 3.36},
        2: {2: 13.20},
        3: {2: 1.68, 3: 46.80},
        4: {2: 1.44, 3: 5.04, 4: 130.80},
        5: {3: 2.16, 4: 19.20, 5: 600.00},
        6: {3: 1.92, 4: 7.20, 5: 90.00, 6: 1800.00},
        7: {4: 2.40, 5: 16.80, 6: 360.00, 7: 7000.00},
        8: {5: 4.32, 6: 54.00, 7: 1200.00, 8: 12000.00},
        9: {5: 3.36, 6: 12.00, 7: 240.00, 8: 3600.00, 9: 25000.00},
        10: {5: 2.40, 6: 7.20, 7: 60.00, 8: 600.00, 9: 6000.00, 10: 100000.00}
    }
    
    # Return multiplier if spots and matches are valid
    if spots_selected in payout_table:
        return payout_table[spots_selected].get(matches, 0.00)
    
    return 0.00


def calculate_matches(selected_numbers, drawn_numbers):
    """
    Calculate how many numbers match between selected and drawn.
    
    Args:
        selected_numbers: List of player-selected numbers
        drawn_numbers: List of drawn numbers
    
    Returns:
        Number of matches
    """
    return len(set(selected_numbers) & set(drawn_numbers))


def verify_keno_fairness(server_seed, client_seed, nonce, claimed_drawn_numbers):
    """
    Verify that the drawn numbers match the seeds (for provably fair verification).
    
    Args:
        server_seed: Revealed server seed
        client_seed: Client seed used
        nonce: Nonce used
        claimed_drawn_numbers: The drawn numbers that were used in the game
    
    Returns:
        Boolean indicating if the game was fair
    """
    actual_drawn_numbers = draw_keno_numbers(server_seed, client_seed, nonce)
    return actual_drawn_numbers == claimed_drawn_numbers
