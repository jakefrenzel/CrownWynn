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
    GetSeedInfoView,
    GameHistoryView,
    ActiveGameView,
    MinesStatsView,
    StartKenoGameView,
    KenoHistoryView,
    ActiveKenoGameView,
    KenoStatsView,
    RecentWinsView,
    MinesRecentWinsView,
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
    path("mines/seed-info/", GetSeedInfoView.as_view(), name="mines-seed-info"),
    path("mines/history/", GameHistoryView.as_view(), name="mines-history"),
    path("mines/active/", ActiveGameView.as_view(), name="mines-active"),
    path("mines/stats/", MinesStatsView.as_view(), name="mines-stats"),
    path("mines/recent-wins/", MinesRecentWinsView.as_view(), name="mines-recent-wins"),

    # Keno game endpoints
    path("keno/start/", StartKenoGameView.as_view(), name="keno-start"),
    path("keno/history/", KenoHistoryView.as_view(), name="keno-history"),
    path("keno/active/", ActiveKenoGameView.as_view(), name="keno-active"),
    path("keno/stats/", KenoStatsView.as_view(), name="keno-stats"),
    path("keno/recent-wins/", RecentWinsView.as_view(), name="recent-wins"),
]