from django.urls import path
from api.views import register_user
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from api.views import TestView, UserBalanceView

urlpatterns = [
    path('', TestView.as_view(), name='test-view'),
    path("register/", register_user, name="register"),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

     path("user/balance/", UserBalanceView.as_view(), name="user-balance"),
]