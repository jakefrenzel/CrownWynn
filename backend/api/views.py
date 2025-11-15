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