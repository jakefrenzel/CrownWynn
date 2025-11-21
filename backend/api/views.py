from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from django.shortcuts import render
from django.http import JsonResponse
from django.views import View
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal
from django.db import transaction

# Auth & CSRF Protection
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


from api.serializers import ProfileSerializer
from api.models import MinesGame
from api.mines_utils import (
    generate_server_seed,
    generate_client_seed,
    hash_seed,
    generate_mine_positions,
    calculate_multiplier,
)
from django.utils import timezone

# Test view to verify API is working
@method_decorator(csrf_exempt, name="dispatch")
class TestView(View):
    def get(self, request):
        return JsonResponse({'message': 'API is working!'})

# User registration and login views
@method_decorator(csrf_exempt, name='dispatch')
class RegisterUserView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")
        password = request.data.get("password")

        if not username or not password:
            return Response({"error": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password)
        user.save()

        return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)

@method_decorator(csrf_exempt, name='dispatch')  # ✅ no CSRF needed for login
class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        data = getattr(response, "data", {})
        access_token = data.get("access")
        refresh_token = data.get("refresh")

        if access_token and refresh_token:
            # Use secure=False for local dev; switch to True behind HTTPS
            cookie_kwargs = {
                "httponly": True,
                "secure": False,
                "samesite": "Lax",
                "path": "/",
            }
            response.set_cookie("access_token", access_token, **cookie_kwargs)
            response.set_cookie("refresh_token", refresh_token, **cookie_kwargs)

        # Remove tokens from body only if present to avoid KeyError on failed auth
        response.data.pop("access", None)
        response.data.pop("refresh", None)
        return response
    
# Auth cookie view
class CookieTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "No refresh token"}, status=status.HTTP_401_UNAUTHORIZED)

        # Inject refresh token into request body for the parent view
        request.data["refresh"] = refresh_token
        response = super().post(request, *args, **kwargs)
        new_access = getattr(response, "data", {}).get("access")
        if new_access:
            response.set_cookie(
                "access_token",
                new_access,
                httponly=True,
                secure=False,  # keep False locally; change in production
                samesite="Lax",
                path="/",
            )
        response.data.pop("access", None)
        return response
    
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFTokenView(APIView):
    permission_classes = []  # Anyone can access this
    authentication_classes = []  # No auth required

    def get(self, request, *args, **kwargs):
        return JsonResponse({"message": "CSRF cookie set!"})

# Protected views
@method_decorator(ensure_csrf_cookie, name='dispatch')  # optional, for CSRF cookie
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)
        return Response({
            "username": user.username,
            "profile": {
                "balance": profile.balance if profile else 0,
                "welcome_bonus_claimed": profile.welcome_bonus_claimed if profile else False,
            },
        })
    
class UserBalanceView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Returns the current user's profile
        return self.request.user.profile

class ClaimWelcomeBonusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        profile = request.user.profile
        
        # Check if bonus already claimed
        if profile.welcome_bonus_claimed:
            return Response(
                {"error": "Welcome bonus has already been claimed"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Add the welcome bonus to balance
            welcome_amount = Decimal('1000.00')
            profile.balance += welcome_amount
            profile.welcome_bonus_claimed = True
            profile.save()
        
        return Response({
            "message": "Welcome bonus claimed successfully!",
            "bonus_amount": welcome_amount,
            "new_balance": profile.balance,
            "welcome_bonus_claimed": profile.welcome_bonus_claimed
        }, status=status.HTTP_200_OK)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get the refresh token from cookies
            refresh_token = request.COOKIES.get('refresh_token')
            
            # If we have a refresh token, blacklist it
            if refresh_token:
                try:
                    token = RefreshToken(refresh_token)
                    token.blacklist()
                except Exception as e:
                    # Token might already be invalid, but continue with logout
                    print(f"Token blacklist error: {e}")
            
            # Create response
            response = Response({
                "message": "Logged out successfully"
            }, status=status.HTTP_200_OK)
            
            # Clear cookies
            response.delete_cookie('access_token', path='/')
            response.delete_cookie('refresh_token', path='/')
            
            return response
            
        except Exception as e:
            # Even if something goes wrong, clear cookies
            response = Response({
                "message": "Logged out successfully"
            }, status=status.HTTP_200_OK)
            response.delete_cookie('access_token', path='/')
            response.delete_cookie('refresh_token', path='/')
            return response


# Mines Game Views
class StartMinesGameView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            bet_amount = request.data.get('bet_amount')
            mines_count = request.data.get('mines_count')
            client_seed = request.data.get('client_seed')  # Optional - player can provide their own
            
            # Validate inputs
            if not bet_amount or not mines_count:
                return Response({
                    "error": "bet_amount and mines_count are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bet_amount = float(bet_amount)
            mines_count = int(mines_count)
            
            if bet_amount <= 0:
                return Response({
                    "error": "Bet amount must be positive"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if mines_count < 1 or mines_count > 24:
                return Response({
                    "error": "Mines count must be between 1 and 24"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user has an active game
            active_game = MinesGame.objects.filter(
                user=request.user,
                status='active'
            ).first()
            
            if active_game:
                return Response({
                    "error": "You already have an active game. Please finish or cashout first."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user has sufficient balance
            if request.user.profile.balance < bet_amount:
                return Response({
                    "error": "Insufficient balance"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Deduct bet from balance
            with transaction.atomic():
                profile = request.user.profile
                from decimal import Decimal
                profile.balance -= Decimal(str(bet_amount))
                
                # Get current nonce and increment it
                current_nonce = profile.mines_nonce
                profile.mines_nonce += 1
                profile.save()
                
                # Generate seeds
                server_seed = generate_server_seed()
                server_seed_hash = hash_seed(server_seed)
                
                if not client_seed:
                    client_seed = generate_client_seed()
                
                # Generate mine positions using the current nonce
                mine_positions = generate_mine_positions(
                    server_seed,
                    client_seed,
                    current_nonce,
                    mines_count
                )
                
                # Create game
                game = MinesGame.objects.create(
                    user=request.user,
                    bet_amount=bet_amount,
                    mines_count=mines_count,
                    server_seed=server_seed,
                    server_seed_hash=server_seed_hash,
                    client_seed=client_seed,
                    nonce=current_nonce,
                    mine_positions=mine_positions,
                    revealed_tiles=[],
                    current_multiplier=1.00,
                    status='active'
                )
            
            return Response({
                "game_id": game.id,
                "server_seed_hash": server_seed_hash,
                "client_seed": client_seed,
                "nonce": game.nonce,
                "mines_count": mines_count,
                "bet_amount": str(bet_amount),
                "current_multiplier": str(game.current_multiplier),
                "revealed_tiles": [],
                "balance": str(request.user.profile.balance)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RevealTileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            game_id = request.data.get('game_id')
            tile_position = request.data.get('tile_position')
            
            if not game_id or tile_position is None:
                return Response({
                    "error": "game_id and tile_position are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            tile_position = int(tile_position)
            
            if tile_position < 0 or tile_position > 24:
                return Response({
                    "error": "Tile position must be between 0 and 24"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get game
            try:
                game = MinesGame.objects.get(id=game_id, user=request.user)
            except MinesGame.DoesNotExist:
                return Response({
                    "error": "Game not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if game.status != 'active':
                return Response({
                    "error": "Game is not active"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if tile already revealed
            if tile_position in game.revealed_tiles:
                return Response({
                    "error": "Tile already revealed"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if tile is a mine
            is_mine = tile_position in game.mine_positions
            
            with transaction.atomic():
                if is_mine:
                    # Player hit a mine - game over
                    game.status = 'lost'
                    game.completed_at = timezone.now()
                    game.payout_amount = 0
                    game.net_profit = -game.bet_amount
                    game.save()
                    
                    return Response({
                        "game_over": True,
                        "hit_mine": True,
                        "tile_position": tile_position,
                        "mine_positions": game.mine_positions,
                        "server_seed": game.server_seed,  # Reveal seed after game ends
                        "payout": "0.00",
                        "net_profit": str(game.net_profit),
                        "balance": str(request.user.profile.balance)
                    }, status=status.HTTP_200_OK)
                else:
                    # Safe tile - update game
                    game.revealed_tiles.append(tile_position)
                    tiles_revealed = len(game.revealed_tiles)
                    
                    # Calculate new multiplier
                    new_multiplier = calculate_multiplier(tiles_revealed, game.mines_count)
                    game.current_multiplier = new_multiplier
                    
                    # Check if all safe tiles have been revealed (auto-win)
                    safe_tiles_remaining = game.safe_tiles_remaining()
                    
                    if safe_tiles_remaining == 0:
                        # All safe tiles revealed - automatic win!
                        from decimal import Decimal
                        payout_amount = float(game.bet_amount) * float(new_multiplier)
                        net_profit = payout_amount - float(game.bet_amount)
                        
                        profile = request.user.profile
                        profile.balance += Decimal(str(payout_amount))
                        profile.save()
                        
                        game.status = 'won'
                        game.completed_at = timezone.now()
                        game.payout_amount = payout_amount
                        game.net_profit = net_profit
                        game.save()
                        
                        return Response({
                            "game_over": True,
                            "hit_mine": False,
                            "auto_win": True,
                            "tile_position": tile_position,
                            "revealed_tiles": game.revealed_tiles,
                            "current_multiplier": str(new_multiplier),
                            "payout": f"{payout_amount:.2f}",
                            "net_profit": f"{net_profit:.2f}",
                            "mine_positions": game.mine_positions,
                            "server_seed": game.server_seed,
                            "balance": str(profile.balance),
                            "message": "Congratulations! All safe tiles revealed!"
                        }, status=status.HTTP_200_OK)
                    
                    game.save()
                    
                    # Calculate potential payout
                    potential_payout = float(game.bet_amount) * new_multiplier
                    
                    return Response({
                        "game_over": False,
                        "hit_mine": False,
                        "tile_position": tile_position,
                        "revealed_tiles": game.revealed_tiles,
                        "current_multiplier": str(new_multiplier),
                        "potential_payout": f"{potential_payout:.2f}",
                        "tiles_revealed": tiles_revealed,
                        "safe_tiles_remaining": safe_tiles_remaining
                    }, status=status.HTTP_200_OK)
                    
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CashoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            game_id = request.data.get('game_id')
            
            if not game_id:
                return Response({
                    "error": "game_id is required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get game
            try:
                game = MinesGame.objects.get(id=game_id, user=request.user)
            except MinesGame.DoesNotExist:
                return Response({
                    "error": "Game not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            if game.status != 'active':
                return Response({
                    "error": "Game is not active"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(game.revealed_tiles) == 0:
                return Response({
                    "error": "Cannot cashout without revealing any tiles"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate payout and update balance
            with transaction.atomic():
                from decimal import Decimal
                payout_amount = float(game.bet_amount) * float(game.current_multiplier)
                net_profit = payout_amount - float(game.bet_amount)
                
                profile = request.user.profile
                profile.balance += Decimal(str(payout_amount))
                profile.save()
                
                game.status = 'won'
                game.completed_at = timezone.now()
                game.payout_amount = payout_amount
                game.net_profit = net_profit
                game.save()
            
            return Response({
                "success": True,
                "payout": f"{payout_amount:.2f}",
                "net_profit": f"{net_profit:.2f}",
                "multiplier": str(game.current_multiplier),
                "tiles_revealed": len(game.revealed_tiles),
                "mine_positions": game.mine_positions,
                "server_seed": game.server_seed,  # Reveal seed after game ends
                "balance": str(profile.balance)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RerollSeedView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Check if user has an active game
            active_game = MinesGame.objects.filter(
                user=request.user,
                status='active'
            ).first()
            
            if active_game:
                return Response({
                    "error": "Cannot reroll seed while a game is active"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate new client seed
            new_client_seed = generate_client_seed()
            
            return Response({
                "client_seed": new_client_seed,
                "message": "New client seed generated. It will be used for your next game."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GameHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get completed games for user (not active)
            games = MinesGame.objects.filter(
                user=request.user
            ).exclude(
                status='active'
            ).order_by('-completed_at')[:50]  # Last 50 games
            
            games_data = []
            for game in games:
                games_data.append({
                    "game_id": game.id,
                    "bet_amount": str(game.bet_amount),
                    "mines_count": game.mines_count,
                    "tiles_revealed": len(game.revealed_tiles),
                    "multiplier": str(game.current_multiplier),
                    "payout": str(game.payout_amount) if game.payout_amount else "0.00",
                    "net_profit": str(game.net_profit) if game.net_profit else str(-game.bet_amount),
                    "status": game.status,
                    "created_at": game.created_at.isoformat(),
                    "completed_at": game.completed_at.isoformat() if game.completed_at else None,
                    # Provably fair data
                    "server_seed": game.server_seed,
                    "server_seed_hash": game.server_seed_hash,
                    "client_seed": game.client_seed,
                    "nonce": game.nonce,
                    "mine_positions": game.mine_positions,
                    "revealed_tiles": game.revealed_tiles
                })
            
            return Response({
                "games": games_data,
                "count": len(games_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActiveGameView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get active game for user
            active_game = MinesGame.objects.filter(
                user=request.user,
                status='active'
            ).first()
            
            if not active_game:
                return Response({
                    "has_active_game": False
                }, status=status.HTTP_200_OK)
            
            return Response({
                "has_active_game": True,
                "game_id": active_game.id,
                "bet_amount": str(active_game.bet_amount),
                "mines_count": active_game.mines_count,
                "current_multiplier": str(active_game.current_multiplier),
                "revealed_tiles": active_game.revealed_tiles,
                "tiles_revealed": len(active_game.revealed_tiles),
                "safe_tiles_remaining": active_game.safe_tiles_remaining(),
                "server_seed_hash": active_game.server_seed_hash,
                "client_seed": active_game.client_seed,
                "nonce": active_game.nonce,
                "created_at": active_game.created_at.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)