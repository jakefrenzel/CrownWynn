from django.urls import path

from api.views import (
    TestView,
    RegisterUserView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    UserBalanceView,
    CSRFTokenView,
    CurrentUserView,
    ClaimWelcomeBonusView,
    LogoutView,
    StartMinesGameView,
    RevealTileView,
    CashoutView,
    RerollSeedView,
    GameHistoryView,
    ActiveGameView,
)

urlpatterns = [
    # Just a test endpoint to verify API is working
    path('', TestView.as_view(), name='test-view'),

    # Auth endpoints
    path("register/", RegisterUserView.as_view(), name="register"),
    path("login/", CookieTokenObtainPairView.as_view(), name="cookie-login"),
    path("refresh/", CookieTokenRefreshView.as_view(), name="cookie-refresh"),
    path("csrf/", CSRFTokenView.as_view(), name="csrf-token"),

    # Protected endpoints
    path("user/me/", CurrentUserView.as_view(), name="current-user"),
    path("user/balance/", UserBalanceView.as_view(), name="user-balance"),
    path("user/claim-welcome-bonus/", ClaimWelcomeBonusView.as_view(), name="claim-welcome-bonus"),
    path("logout/", LogoutView.as_view(), name="logout"),

    # Mines game endpoints
    path("mines/start/", StartMinesGameView.as_view(), name="mines-start"),
    path("mines/reveal/", RevealTileView.as_view(), name="mines-reveal"),
    path("mines/cashout/", CashoutView.as_view(), name="mines-cashout"),
    path("mines/reroll-seed/", RerollSeedView.as_view(), name="mines-reroll-seed"),
    path("mines/history/", GameHistoryView.as_view(), name="mines-history"),
    path("mines/active/", ActiveGameView.as_view(), name="mines-active"),
]