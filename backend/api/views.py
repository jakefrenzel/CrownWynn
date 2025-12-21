
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
import os

# Auth & CSRF Protection
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.serializers import ProfileSerializer
from api.models import MinesGame, KenoGame, Profile
from django.db import models
from api.mines_utils import (
    generate_server_seed,
    generate_client_seed,
    hash_seed,
    generate_mine_positions,
    calculate_multiplier,
)
from api.keno_utils import (
    draw_keno_numbers,
    calculate_keno_multiplier,
    calculate_matches,
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

        # Dynamically set cookie security for dev/prod
        debug = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')
        if debug:
            cookie_kwargs = {
                "httponly": True,
                "secure": False,
                "samesite": "Lax",
                "path": "/",
            }
        else:
            cookie_kwargs = {
                "httponly": True,
                "secure": True,
                "samesite": "None",
                "path": "/",
            }

        if access_token and refresh_token:
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

        debug = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('1', 'true', 'yes')
        if debug:
            cookie_kwargs = {
                "httponly": True,
                "secure": False,
                "samesite": "Lax",
                "path": "/",
            }
        else:
            cookie_kwargs = {
                "httponly": True,
                "secure": True,
                "samesite": "None",
                "path": "/",
            }

        if new_access:
            response.set_cookie(
                "access_token",
                new_access,
                **cookie_kwargs
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

class ClaimDailyRewardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Check if user can claim daily reward"""
        profile = request.user.profile
        
        can_claim = True
        time_remaining = 0
        
        if profile.last_daily_claim:
            time_since_claim = timezone.now() - profile.last_daily_claim
            hours_since_claim = time_since_claim.total_seconds() / 3600
            
            if hours_since_claim < 12:
                can_claim = False
                time_remaining = int((12 * 3600) - time_since_claim.total_seconds())
        
        return Response({
            "can_claim": can_claim,
            "time_remaining": time_remaining,
            "last_claim": profile.last_daily_claim,
        }, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Claim daily reward"""
        profile = request.user.profile
        
        # Check if 12 hours have passed since last claim
        if profile.last_daily_claim:
            time_since_claim = timezone.now() - profile.last_daily_claim
            hours_since_claim = time_since_claim.total_seconds() / 3600
            
            if hours_since_claim < 12:
                time_remaining = int((12 * 3600) - time_since_claim.total_seconds())
                return Response(
                    {
                        "error": "Daily reward not available yet",
                        "time_remaining": time_remaining
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Add the daily reward to balance
            daily_amount = Decimal('250.00')
            profile.balance += daily_amount
            profile.last_daily_claim = timezone.now()
            profile.save()
        
        return Response({
            "message": "Daily reward claimed successfully!",
            "reward_amount": daily_amount,
            "new_balance": profile.balance,
            "next_claim_at": profile.last_daily_claim
        }, status=status.HTTP_200_OK)

class ClaimAdRewardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Claim ad reward"""
        profile = request.user.profile
        
        # Check if 5 minutes have passed since last claim
        if profile.last_ad_claim:
            time_since_claim = timezone.now() - profile.last_ad_claim
            minutes_since_claim = time_since_claim.total_seconds() / 60
            
            if minutes_since_claim < 5:
                time_remaining = int((5 * 60) - time_since_claim.total_seconds())
                return Response(
                    {
                        "error": "Ad reward not available yet",
                        "time_remaining": time_remaining
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Add the ad reward to balance
            ad_amount = Decimal('100.00')
            profile.balance += ad_amount
            profile.last_ad_claim = timezone.now()
            profile.save()
        
        return Response({
            "message": "Ad reward claimed successfully!",
            "reward_amount": ad_amount,
            "new_balance": profile.balance,
            "next_claim_at": profile.last_ad_claim
        }, status=status.HTTP_200_OK)

class CheckAdRewardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Check if user can claim ad reward"""
        profile = request.user.profile
        
        can_claim = True
        time_remaining = 0
        
        if profile.last_ad_claim:
            time_since_claim = timezone.now() - profile.last_ad_claim
            minutes_since_claim = time_since_claim.total_seconds() / 60
            
            if minutes_since_claim < 5:
                can_claim = False
                time_remaining = int((5 * 60) - time_since_claim.total_seconds())
        
        return Response({
            "can_claim": can_claim,
            "time_remaining": time_remaining,
            "last_claim": profile.last_ad_claim,
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
                
                # Get current nonce and increment it (always increments)
                current_nonce = profile.mines_nonce
                profile.mines_nonce += 1
                
                # Increment games played on current seed
                profile.seed_games_played += 1
                
                # Update statistics
                profile.mines_games_played += 1
                profile.mines_total_wagered += Decimal(str(bet_amount))
                
                # Use pre-generated server seed if it exists, otherwise generate new one
                if profile.next_server_seed and profile.next_server_seed_hash:
                    server_seed = profile.next_server_seed
                    server_seed_hash = profile.next_server_seed_hash
                else:
                    server_seed = generate_server_seed()
                    server_seed_hash = hash_seed(server_seed)
                
                # Generate new server seed for next game
                next_server_seed = generate_server_seed()
                profile.next_server_seed = next_server_seed
                profile.next_server_seed_hash = hash_seed(next_server_seed)
                
                # Use provided client_seed, or use profile's current seed, or generate new one
                if not client_seed:
                    if profile.current_client_seed:
                        client_seed = profile.current_client_seed
                    else:
                        client_seed = generate_client_seed()
                        profile.current_client_seed = client_seed
                
                profile.save()
                
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
                    
                    # Update player statistics
                    profile = request.user.profile
                    profile.mines_games_lost += 1
                    profile.mines_total_profit -= game.bet_amount
                    
                    # Update streak (loss makes it negative or decreases it)
                    if profile.mines_current_streak > 0:
                        profile.mines_current_streak = -1  # Start loss streak
                    else:
                        profile.mines_current_streak -= 1  # Continue loss streak
                    
                    profile.save()
                    
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
                        
                        # Update player statistics
                        profile.mines_games_won += 1
                        profile.mines_total_profit += Decimal(str(net_profit))
                        
                        # Update biggest win
                        if Decimal(str(payout_amount)) > profile.mines_biggest_win:
                            profile.mines_biggest_win = Decimal(str(payout_amount))
                        
                        # Update streak (win makes it positive or increases it)
                        if profile.mines_current_streak < 0:
                            profile.mines_current_streak = 1  # Start win streak
                        else:
                            profile.mines_current_streak += 1  # Continue win streak
                        
                        # Update best streak
                        if profile.mines_current_streak > profile.mines_best_streak:
                            profile.mines_best_streak = profile.mines_current_streak
                        
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
                
                # Update player statistics
                profile.mines_games_won += 1
                profile.mines_total_profit += Decimal(str(net_profit))
                
                # Update biggest win
                if Decimal(str(payout_amount)) > profile.mines_biggest_win:
                    profile.mines_biggest_win = Decimal(str(payout_amount))
                
                # Update streak (win makes it positive or increases it)
                if profile.mines_current_streak < 0:
                    profile.mines_current_streak = 1  # Start win streak
                else:
                    profile.mines_current_streak += 1  # Continue win streak
                
                # Update best streak
                if profile.mines_current_streak > profile.mines_best_streak:
                    profile.mines_best_streak = profile.mines_current_streak
                
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
            
            # Generate new client seed and reset seed games counter
            new_client_seed = generate_client_seed()
            profile = request.user.profile
            profile.current_client_seed = new_client_seed
            profile.seed_games_played = 0  # Reset games played on this seed
            
            # Generate new server seed for next game
            next_server_seed = generate_server_seed()
            profile.next_server_seed = next_server_seed
            profile.next_server_seed_hash = hash_seed(next_server_seed)
            
            profile.save()
            
            return Response({
                "client_seed": new_client_seed,
                "seed_games_played": profile.seed_games_played,
                "message": "New client seed generated. It will be used for your next game."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GetSeedInfoView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            
            # If no client seed exists, generate one
            if not profile.current_client_seed:
                profile.current_client_seed = generate_client_seed()
                profile.save()
            
            # If no next server seed exists, generate both seed and hash
            if not profile.next_server_seed or not profile.next_server_seed_hash:
                server_seed = generate_server_seed()
                profile.next_server_seed = server_seed
                profile.next_server_seed_hash = hash_seed(server_seed)
                profile.save()
            
            return Response({
                "client_seed": profile.current_client_seed,
                "seed_games_played": profile.seed_games_played,
                "next_server_seed_hash": profile.next_server_seed_hash
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


class MinesStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            
            # Calculate win rate
            win_rate = 0
            if profile.mines_games_played > 0:
                win_rate = (profile.mines_games_won / profile.mines_games_played) * 100
            
            # Calculate average bet
            avg_bet = 0
            if profile.mines_games_played > 0:
                avg_bet = float(profile.mines_total_wagered) / profile.mines_games_played
            
            return Response({
                "games_played": profile.mines_games_played,
                "games_won": profile.mines_games_won,
                "games_lost": profile.mines_games_lost,
                "win_rate": f"{win_rate:.1f}",
                "total_wagered": str(profile.mines_total_wagered),
                "total_profit": str(profile.mines_total_profit),
                "biggest_win": str(profile.mines_biggest_win),
                "current_streak": profile.mines_current_streak,
                "best_streak": profile.mines_best_streak,
                "average_bet": f"{avg_bet:.2f}"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Keno Game Views
class StartKenoGameView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            bet_amount = request.data.get('bet_amount')
            numbers_selected = request.data.get('numbers_selected')
            client_seed = request.data.get('client_seed')  # Optional - player can provide their own
            
            # Validate inputs
            if not bet_amount or not numbers_selected:
                return Response({
                    "error": "bet_amount and numbers_selected are required"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            bet_amount = float(bet_amount)
            
            if not isinstance(numbers_selected, list):
                return Response({
                    "error": "numbers_selected must be a list"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if bet_amount <= 0:
                return Response({
                    "error": "Bet amount must be positive"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate numbers selected
            if len(numbers_selected) < 1 or len(numbers_selected) > 10:
                return Response({
                    "error": "Must select between 1 and 10 numbers"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate all numbers are in range 1-40 and unique
            if not all(isinstance(n, int) and 1 <= n <= 40 for n in numbers_selected):
                return Response({
                    "error": "All numbers must be integers between 1 and 40"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if len(numbers_selected) != len(set(numbers_selected)):
                return Response({
                    "error": "Cannot select duplicate numbers"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user has an active game
            active_game = KenoGame.objects.filter(
                user=request.user,
                status='active'
            ).first()
            
            if active_game:
                return Response({
                    "error": "You already have an active game. Please finish it first."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user has sufficient balance
            if request.user.profile.balance < bet_amount:
                return Response({
                    "error": "Insufficient balance"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Deduct bet from balance and create game
            with transaction.atomic():
                profile = request.user.profile
                from decimal import Decimal
                profile.balance -= Decimal(str(bet_amount))
                
                # Get current nonce and increment it
                current_nonce = profile.mines_nonce  # Using same nonce counter as mines
                profile.mines_nonce += 1
                
                # Increment games played on current seed
                profile.seed_games_played += 1
                
                # Update statistics
                profile.keno_games_played += 1
                profile.keno_total_wagered += Decimal(str(bet_amount))
                
                # Use pre-generated server seed if it exists, otherwise generate new one
                if profile.next_server_seed and profile.next_server_seed_hash:
                    server_seed = profile.next_server_seed
                    server_seed_hash = profile.next_server_seed_hash
                else:
                    server_seed = generate_server_seed()
                    server_seed_hash = hash_seed(server_seed)
                
                # Generate new server seed for next game
                next_server_seed = generate_server_seed()
                profile.next_server_seed = next_server_seed
                profile.next_server_seed_hash = hash_seed(next_server_seed)
                
                # Use provided client_seed, or use profile's current seed, or generate new one
                if not client_seed:
                    if profile.current_client_seed:
                        client_seed = profile.current_client_seed
                    else:
                        client_seed = generate_client_seed()
                        profile.current_client_seed = client_seed
                
                profile.save()
                
                # Draw 20 numbers using provably fair algorithm
                drawn_numbers = draw_keno_numbers(server_seed, client_seed, current_nonce)
                
                # Calculate matches and multiplier
                matches = calculate_matches(numbers_selected, drawn_numbers)
                multiplier = calculate_keno_multiplier(len(numbers_selected), matches)
                
                # Calculate payout
                payout_amount = bet_amount * multiplier if multiplier > 0 else 0
                net_profit = payout_amount - bet_amount
                
                # Determine win/loss status
                if multiplier > 0:
                    game_status = 'won'
                    profile.keno_games_won += 1
                    
                    # Update streak (win makes it positive or increases it)
                    if profile.keno_current_streak < 0:
                        profile.keno_current_streak = 1
                    else:
                        profile.keno_current_streak += 1
                    
                    # Update best streak
                    if profile.keno_current_streak > profile.keno_best_streak:
                        profile.keno_best_streak = profile.keno_current_streak
                    
                    # Add payout to balance
                    profile.balance += Decimal(str(payout_amount))
                    
                    # Update biggest win
                    if Decimal(str(payout_amount)) > profile.keno_biggest_win:
                        profile.keno_biggest_win = Decimal(str(payout_amount))
                else:
                    game_status = 'lost'
                    profile.keno_games_lost += 1
                    
                    # Update streak (loss makes it negative or decreases it)
                    if profile.keno_current_streak > 0:
                        profile.keno_current_streak = -1
                    else:
                        profile.keno_current_streak -= 1
                
                # Update profit stats
                profile.keno_total_profit += Decimal(str(net_profit))
                profile.save()
                
                # Create game record
                game = KenoGame.objects.create(
                    user=request.user,
                    bet_amount=bet_amount,
                    numbers_selected=sorted(numbers_selected),
                    server_seed=server_seed,
                    server_seed_hash=server_seed_hash,
                    client_seed=client_seed,
                    nonce=current_nonce,
                    drawn_numbers=drawn_numbers,
                    matches=matches,
                    current_multiplier=multiplier,
                    status=game_status,
                    payout_amount=payout_amount,
                    net_profit=net_profit,
                    completed_at=timezone.now()
                )
            
            return Response({
                "game_id": game.id,
                "server_seed": server_seed,  # Reveal immediately since game is instant
                "server_seed_hash": server_seed_hash,
                "client_seed": client_seed,
                "nonce": game.nonce,
                "numbers_selected": sorted(numbers_selected),
                "drawn_numbers": drawn_numbers,
                "matches": matches,
                "multiplier": str(multiplier),
                "payout": f"{payout_amount:.2f}",
                "net_profit": f"{net_profit:.2f}",
                "status": game_status,
                "balance": str(profile.balance)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class KenoHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get completed Keno games for user
            games = KenoGame.objects.filter(
                user=request.user
            ).order_by('-completed_at')[:50]  # Last 50 games
            
            games_data = []
            for game in games:
                games_data.append({
                    "game_id": game.id,
                    "bet_amount": str(game.bet_amount),
                    "numbers_selected": game.numbers_selected,
                    "spots_selected": len(game.numbers_selected),
                    "drawn_numbers": game.drawn_numbers,
                    "matches": game.matches,
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
                    "nonce": game.nonce
                })
            
            return Response({
                "games": games_data,
                "count": len(games_data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActiveKenoGameView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get active Keno game for user
            active_game = KenoGame.objects.filter(
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
                "numbers_selected": active_game.numbers_selected,
                "drawn_numbers": active_game.drawn_numbers,
                "matches": active_game.matches,
                "multiplier": str(active_game.current_multiplier),
                "server_seed_hash": active_game.server_seed_hash,
                "client_seed": active_game.client_seed,
                "nonce": active_game.nonce,
                "created_at": active_game.created_at.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class KenoStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            profile = request.user.profile
            
            # Calculate win rate
            win_rate = 0
            if profile.keno_games_played > 0:
                win_rate = (profile.keno_games_won / profile.keno_games_played) * 100
            
            # Calculate average bet
            avg_bet = 0
            if profile.keno_games_played > 0:
                avg_bet = float(profile.keno_total_wagered) / profile.keno_games_played
            
            return Response({
                "games_played": profile.keno_games_played,
                "games_won": profile.keno_games_won,
                "games_lost": profile.keno_games_lost,
                "win_rate": f"{win_rate:.1f}",
                "total_wagered": str(profile.keno_total_wagered),
                "total_profit": str(profile.keno_total_profit),
                "biggest_win": str(profile.keno_biggest_win),
                "current_streak": profile.keno_current_streak,
                "best_streak": profile.keno_best_streak,
                "average_bet": f"{avg_bet:.2f}"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecentWinsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            # Get recent wins from all users (last 50 winning games)
            recent_wins = KenoGame.objects.filter(
                status='won'
            ).select_related('user').order_by('-created_at')[:50]
            
            wins_data = []
            for game in recent_wins:
                wins_data.append({
                    'username': game.user.username,
                    'bet_amount': str(game.bet_amount),
                    'multiplier': str(game.current_multiplier),
                    'payout': str(game.payout_amount),
                    'net_profit': str(game.net_profit),
                    'created_at': game.created_at.isoformat()
                })
            
            return Response({
                'recent_wins': wins_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MinesRecentWinsView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            # Get recent wins from all users (last 50 winning Mines games)
            recent_wins = MinesGame.objects.filter(
                status='won'
            ).select_related('user').order_by('-completed_at')[:50]
            
            wins_data = []
            for game in recent_wins:
                wins_data.append({
                    'username': game.user.username,
                    'bet_amount': str(game.bet_amount),
                    'multiplier': str(game.current_multiplier),
                    'payout': str(game.payout_amount),
                    'net_profit': str(game.net_profit),
                    'created_at': game.completed_at.isoformat()
                })
            
            return Response({
                'recent_wins': wins_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LeaderboardView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            from django.db.models import F, Max
            from datetime import datetime, timedelta
            
            category = request.query_params.get('category', 'balance')
            limit = int(request.query_params.get('limit', 50))
            
            # Get current month start
            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            # Base query - only users with some activity
            profiles = Profile.objects.select_related('user').filter(
                user__is_active=True
            )
            
            leaderboard_data = []
            
            if category == 'balance':
                # Current Balance leaderboard
                profiles = profiles.order_by('-balance')[:limit]
                
                for rank, profile in enumerate(profiles, start=1):
                    leaderboard_data.append({
                        'rank': rank,
                        'username': profile.user.username,
                        'value': f"{float(profile.balance):.2f}",
                        'display_value': f"{float(profile.balance):.2f} 👑"
                    })
                    
            elif category == 'total_wagered':
                # Total Wagered (current month for both games)
                # Get games from current month for each user
                profiles_data = []
                
                for profile in profiles:
                    mines_wagered = MinesGame.objects.filter(
                        user=profile.user,
                        created_at__gte=month_start
                    ).aggregate(total=models.Sum('bet_amount'))['total'] or Decimal('0')
                    
                    keno_wagered = KenoGame.objects.filter(
                        user=profile.user,
                        created_at__gte=month_start
                    ).aggregate(total=models.Sum('bet_amount'))['total'] or Decimal('0')
                    
                    total_wagered = mines_wagered + keno_wagered
                    
                    if total_wagered > 0:
                        profiles_data.append({
                            'username': profile.user.username,
                            'value': total_wagered
                        })
                
                # Sort by value descending
                profiles_data.sort(key=lambda x: x['value'], reverse=True)
                profiles_data = profiles_data[:limit]
                
                for rank, data in enumerate(profiles_data, start=1):
                    leaderboard_data.append({
                        'rank': rank,
                        'username': data['username'],
                        'value': f"{float(data['value']):.2f}",
                        'display_value': f"{float(data['value']):.2f} 👑"
                    })
                    
            elif category == 'biggest_win':
                # Biggest Single Win (current month from both games)
                profiles_data = []
                
                for profile in profiles:
                    mines_biggest = MinesGame.objects.filter(
                        user=profile.user,
                        status='won',
                        created_at__gte=month_start
                    ).aggregate(max_payout=Max('payout_amount'))['max_payout'] or Decimal('0')
                    
                    keno_biggest = KenoGame.objects.filter(
                        user=profile.user,
                        status='won',
                        created_at__gte=month_start
                    ).aggregate(max_payout=Max('payout_amount'))['max_payout'] or Decimal('0')
                    
                    biggest_win = max(mines_biggest, keno_biggest)
                    
                    if biggest_win > 0:
                        profiles_data.append({
                            'username': profile.user.username,
                            'value': biggest_win
                        })
                
                # Sort by value descending
                profiles_data.sort(key=lambda x: x['value'], reverse=True)
                profiles_data = profiles_data[:limit]
                
                for rank, data in enumerate(profiles_data, start=1):
                    leaderboard_data.append({
                        'rank': rank,
                        'username': data['username'],
                        'value': f"{float(data['value']):.2f}",
                        'display_value': f"{float(data['value']):.2f} 👑"
                    })
            
            return Response({
                'leaderboard': leaderboard_data,
                'category': category,
                'period': 'monthly',
                'period_start': month_start.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Check if user is admin (staff)
            if not request.user.is_staff:
                return Response({
                    "error": "Admin access required"
                }, status=status.HTTP_403_FORBIDDEN)
            
            from django.db.models import Sum, Count, Avg, Max, Q
            from datetime import datetime, timedelta
            
            # Get date range from query params (default: all-time)
            start_date_str = request.query_params.get('start_date', None)
            end_date_str = request.query_params.get('end_date', None)
            game_type = request.query_params.get('game', 'all')  # 'all', 'mines', 'keno'
            
            # Parse dates if provided
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str)
            else:
                start_date = None
                
            if end_date_str:
                end_date = datetime.fromisoformat(end_date_str)
            else:
                end_date = timezone.now()
            
            # Build filters
            mines_filter = Q()
            keno_filter = Q()
            
            if start_date:
                mines_filter &= Q(created_at__gte=start_date)
                keno_filter &= Q(created_at__gte=start_date)
            
            if end_date:
                mines_filter &= Q(created_at__lte=end_date)
                keno_filter &= Q(created_at__lte=end_date)
            
            # Fetch games based on game_type
            if game_type in ['all', 'mines']:
                mines_games = MinesGame.objects.filter(mines_filter, status__in=['won', 'lost'])
            else:
                mines_games = MinesGame.objects.none()
                
            if game_type in ['all', 'keno']:
                keno_games = KenoGame.objects.filter(keno_filter, status__in=['won', 'lost'])
            else:
                keno_games = KenoGame.objects.none()
            
            # Calculate metrics
            mines_stats = mines_games.aggregate(
                total_wagered=Sum('bet_amount'),
                total_payouts=Sum('payout_amount'),
                games_count=Count('id'),
                games_won=Count('id', filter=Q(status='won')),
                avg_bet=Avg('bet_amount'),
                max_payout=Max('payout_amount')
            )
            
            keno_stats = keno_games.aggregate(
                total_wagered=Sum('bet_amount'),
                total_payouts=Sum('payout_amount'),
                games_count=Count('id'),
                games_won=Count('id', filter=Q(status='won')),
                avg_bet=Avg('bet_amount'),
                max_payout=Max('payout_amount')
            )
            
            # Calculate combined totals
            total_wagered = Decimal('0')
            total_payouts = Decimal('0')
            total_games = 0
            total_wins = 0
            
            if mines_stats['total_wagered']:
                total_wagered += mines_stats['total_wagered']
            if mines_stats['total_payouts']:
                total_payouts += mines_stats['total_payouts']
            if mines_stats['games_count']:
                total_games += mines_stats['games_count']
            if mines_stats['games_won']:
                total_wins += mines_stats['games_won']
                
            if keno_stats['total_wagered']:
                total_wagered += keno_stats['total_wagered']
            if keno_stats['total_payouts']:
                total_payouts += keno_stats['total_payouts']
            if keno_stats['games_count']:
                total_games += keno_stats['games_count']
            if keno_stats['games_won']:
                total_wins += keno_stats['games_won']
            
            # Calculate RTP (Return to Player)
            rtp = 0.0
            if total_wagered > 0:
                rtp = float((total_payouts / total_wagered) * 100)
            
            # Calculate house edge profit
            house_profit = total_wagered - total_payouts
            
            # Calculate win rate
            win_rate = 0.0
            if total_games > 0:
                win_rate = float((total_wins / total_games) * 100)
            
            # Average session duration (approximation based on game count per user)
            unique_players = User.objects.filter(
                Q(mines_games__in=mines_games) | Q(keno_games__in=keno_games)
            ).distinct().count() if total_games > 0 else 0
            
            # Get active players (by distinct users in time period)
            if game_type in ['all', 'mines']:
                active_players_mines = mines_games.values('user').distinct().count()
            else:
                active_players_mines = 0
                
            if game_type in ['all', 'keno']:
                active_players_keno = keno_games.values('user').distinct().count()
            else:
                active_players_keno = 0
            
            active_players = max(active_players_mines, active_players_keno)
            
            # Game popularity
            mines_popularity = mines_stats['games_count'] or 0
            keno_popularity = keno_stats['games_count'] or 0
            
            return Response({
                'summary': {
                    'total_wagered': f"{float(total_wagered):.2f}",
                    'total_payouts': f"{float(total_payouts):.2f}",
                    'house_profit': f"{float(house_profit):.2f}",
                    'total_games': total_games,
                    'total_wins': total_wins,
                    'active_players': active_players,
                    'unique_players': unique_players,
                },
                'metrics': {
                    'rtp': f"{rtp:.2f}",
                    'house_edge': f"{100 - rtp:.2f}",
                    'win_rate': f"{win_rate:.2f}",
                    'avg_bet': f"{float(total_wagered / total_games if total_games > 0 else 0):.2f}",
                },
                'games': {
                    'mines': {
                        'games_played': mines_stats['games_count'] or 0,
                        'games_won': mines_stats['games_won'] or 0,
                        'total_wagered': f"{float(mines_stats['total_wagered'] or 0):.2f}",
                        'total_payouts': f"{float(mines_stats['total_payouts'] or 0):.2f}",
                        'avg_bet': f"{float(mines_stats['avg_bet'] or 0):.2f}",
                        'max_payout': f"{float(mines_stats['max_payout'] or 0):.2f}",
                        'win_rate': f"{(mines_stats['games_won'] / mines_stats['games_count'] * 100 if mines_stats['games_count'] else 0):.2f}",
                    },
                    'keno': {
                        'games_played': keno_stats['games_count'] or 0,
                        'games_won': keno_stats['games_won'] or 0,
                        'total_wagered': f"{float(keno_stats['total_wagered'] or 0):.2f}",
                        'total_payouts': f"{float(keno_stats['total_payouts'] or 0):.2f}",
                        'avg_bet': f"{float(keno_stats['avg_bet'] or 0):.2f}",
                        'max_payout': f"{float(keno_stats['max_payout'] or 0):.2f}",
                        'win_rate': f"{(keno_stats['games_won'] / keno_stats['games_count'] * 100 if keno_stats['games_count'] else 0):.2f}",
                    }
                },
                'popularity': {
                    'mines': mines_popularity,
                    'keno': keno_popularity,
                    'most_popular': 'Mines' if mines_popularity >= keno_popularity else 'Keno' if keno_popularity > 0 else 'None'
                },
                'period': {
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat()
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)