from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from django.shortcuts import render
from django.http import JsonResponse
from django.views import View

from api.serializers import ProfileSerializer

# Create your views here.
class TestView(View):
    def get(self, request):
        return JsonResponse({'message': 'API is working!'})

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({"error": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password)
    user.save()

    return Response({"message": "User created successfully!"}, status=status.HTTP_201_CREATED)

class UserBalanceView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # Returns the current user's profile
        return self.request.user.profile