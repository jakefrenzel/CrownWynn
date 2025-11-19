# CrownWynn API - Postman Endpoints Collection

Base URL: `http://localhost:8000`

## Authentication Endpoints

### 1. Register User
- **Method**: `POST`
- **URL**: `/api/register/`
- **Body** (JSON):
```json
{
  "username": "testuser",
  "password": "testpass123",
  "email": "test@example.com"
}
```
- **Response**: User data with tokens set in httpOnly cookies

---

### 2. Login
- **Method**: `POST`
- **URL**: `/api/login/`
- **Body** (JSON):
```json
{
  "username": "testuser",
  "password": "testpass123"
}
```
- **Response**: Tokens set in httpOnly cookies (`access_token`, `refresh_token`)

---

### 3. Refresh Token
- **Method**: `POST`
- **URL**: `/api/refresh/`
- **Headers**: Cookies automatically sent by browser
- **Response**: New access token in httpOnly cookie

---

### 4. Get CSRF Token
- **Method**: `GET`
- **URL**: `/api/csrf/`
- **Response**:
```json
{
  "csrfToken": "token_value_here"
}
```

---

### 5. Logout
- **Method**: `POST`
- **URL**: `/api/logout/`
- **Headers**: Requires authentication (cookies)
- **Response**: 
```json
{
  "message": "Logged out successfully"
}
```

---

## User Endpoints

### 6. Get Current User
- **Method**: `GET`
- **URL**: `/api/user/me/`
- **Headers**: Requires authentication (cookies)
- **Response**:
```json
{
  "username": "testuser",
  "profile": {
    "balance": "1000.00",
    "welcome_bonus_claimed": false
  }
}
```

---

### 7. Get/Update User Balance
- **Method**: `GET` or `PATCH`
- **URL**: `/api/user/balance/`
- **Headers**: Requires authentication (cookies)
- **Response**:
```json
{
  "balance": "1000.00"
}
```

---

### 8. Claim Welcome Bonus
- **Method**: `POST`
- **URL**: `/api/user/claim-welcome-bonus/`
- **Headers**: Requires authentication (cookies)
- **Response**:
```json
{
  "message": "Welcome bonus claimed successfully!",
  "new_balance": "2000.00"
}
```

---

## Mines Game Endpoints

### 9. Start Mines Game
- **Method**: `POST`
- **URL**: `/api/mines/start/`
- **Headers**: Requires authentication (cookies)
- **Body** (JSON):
```json
{
  "bet_amount": 10.00,
  "mines_count": 3,
  "client_seed": "optional_custom_seed"
}
```
- **Response**:
```json
{
  "game_id": 1,
  "server_seed_hash": "a1b2c3d4e5f6...",
  "client_seed": "x1y2z3...",
  "nonce": 0,
  "mines_count": 3,
  "bet_amount": "10.00",
  "current_multiplier": "1.00",
  "revealed_tiles": [],
  "balance": "990.00"
}
```

---

### 10. Reveal Tile
- **Method**: `POST`
- **URL**: `/api/mines/reveal/`
- **Headers**: Requires authentication (cookies)
- **Body** (JSON):
```json
{
  "game_id": 1,
  "tile_position": 5
}
```
- **Response (Safe Tile)**:
```json
{
  "game_over": false,
  "hit_mine": false,
  "tile_position": 5,
  "revealed_tiles": [5],
  "current_multiplier": "1.14",
  "potential_payout": "11.40",
  "tiles_revealed": 1,
  "safe_tiles_remaining": 21
}
```
- **Response (Mine Hit)**:
```json
{
  "game_over": true,
  "hit_mine": true,
  "tile_position": 12,
  "mine_positions": [3, 12, 18],
  "server_seed": "revealed_server_seed_here",
  "payout": "0.00",
  "net_profit": "-10.00",
  "balance": "990.00"
}
```

---

### 11. Cashout
- **Method**: `POST`
- **URL**: `/api/mines/cashout/`
- **Headers**: Requires authentication (cookies)
- **Body** (JSON):
```json
{
  "game_id": 1
}
```
- **Response**:
```json
{
  "success": true,
  "payout": "25.50",
  "net_profit": "15.50",
  "multiplier": "2.55",
  "tiles_revealed": 5,
  "mine_positions": [3, 12, 18],
  "server_seed": "revealed_server_seed_here",
  "balance": "1015.50"
}
```

---

### 12. Reroll Client Seed
- **Method**: `POST`
- **URL**: `/api/mines/reroll-seed/`
- **Headers**: Requires authentication (cookies)
- **Body**: Empty
- **Response**:
```json
{
  "client_seed": "new_seed_here",
  "message": "New client seed generated. It will be used for your next game."
}
```

---

### 13. Get Game History
- **Method**: `GET`
- **URL**: `/api/mines/history/`
- **Headers**: Requires authentication (cookies)
- **Response**:
```json
{
  "games": [
    {
      "game_id": 1,
      "bet_amount": "10.00",
      "mines_count": 3,
      "tiles_revealed": 5,
      "multiplier": "2.55",
      "payout": "25.50",
      "net_profit": "15.50",
      "status": "won",
      "created_at": "2025-11-19T10:30:00Z",
      "completed_at": "2025-11-19T10:35:00Z",
      "server_seed": "revealed_seed",
      "server_seed_hash": "hash_value",
      "client_seed": "client_seed_value",
      "nonce": 0,
      "mine_positions": [3, 12, 18],
      "revealed_tiles": [0, 1, 5, 8, 15]
    }
  ],
  "count": 1
}
```

---

### 14. Get Active Game
- **Method**: `GET`
- **URL**: `/api/mines/active/`
- **Headers**: Requires authentication (cookies)
- **Response (Has Active Game)**:
```json
{
  "has_active_game": true,
  "game_id": 1,
  "bet_amount": "10.00",
  "mines_count": 3,
  "current_multiplier": "1.14",
  "revealed_tiles": [5],
  "tiles_revealed": 1,
  "safe_tiles_remaining": 21,
  "server_seed_hash": "hash_value",
  "client_seed": "seed_value",
  "nonce": 0,
  "created_at": "2025-11-19T10:30:00Z"
}
```
- **Response (No Active Game)**:
```json
{
  "has_active_game": false
}
```

---

## Notes for Postman Setup

### Cookie Handling
1. After logging in, Postman should automatically handle cookies
2. If testing manually, ensure "Automatically follow redirects" is enabled
3. Enable "Send cookies" in Postman settings

### CSRF Token (if enabled)
1. First call `/api/csrf/` to get CSRF token
2. Add header: `X-CSRFToken: <token_value>`
3. Include in subsequent POST/PATCH/DELETE requests

### Authentication Flow
1. Register or Login → Cookies set automatically
2. All subsequent requests use cookies for authentication
3. Access token expires after 5 minutes (auto-refresh via refresh token)
4. Refresh token expires after 1 day

### Testing Game Flow
1. **Login** → Get authenticated
2. **Claim Welcome Bonus** → Get 1000 crowns
3. **Start Game** → Place bet (e.g., 10 crowns, 3 mines)
4. **Reveal Tiles** → Click tiles (positions 0-24)
5. **Cashout** → Collect winnings OR continue revealing
6. **Get History** → View past games for verification

### Tile Positions
Grid is 5x5 (25 tiles total):
```
 0  1  2  3  4
 5  6  7  8  9
10 11 12 13 14
15 16 17 18 19
20 21 22 23 24
```

### Game States
- `active` - Game in progress
- `won` - Player cashed out successfully
- `lost` - Player hit a mine
- `disconnected` - Game cancelled due to disconnect (future feature)

### Error Responses
All errors return:
```json
{
  "error": "Error message here"
}
```
Common HTTP status codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (not logged in)
- `404` - Not found (game doesn't exist)
- `500` - Internal server error
