from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

# Create your models here.
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    welcome_bonus_claimed = models.BooleanField(default=False)
    last_daily_claim = models.DateTimeField(null=True, blank=True)  # Last time user claimed daily reward
    last_ad_claim = models.DateTimeField(null=True, blank=True)  # Last time user claimed ad reward (5 min cooldown)
    mines_nonce = models.IntegerField(default=0)  # Nonce counter for provably fair mines games (always increments)
    current_client_seed = models.CharField(max_length=64, blank=True, null=True)  # Current client seed for provably fair
    seed_games_played = models.IntegerField(default=0)  # Number of games played on current seed
    next_server_seed = models.CharField(max_length=64, blank=True, null=True)  # Pre-generated server seed for next game
    next_server_seed_hash = models.CharField(max_length=64, blank=True, null=True)  # Hash of next server seed for transparency
    
    # Mines game statistics
    mines_games_played = models.IntegerField(default=0)  # Total games played
    mines_games_won = models.IntegerField(default=0)  # Total games won
    mines_games_lost = models.IntegerField(default=0)  # Total games lost
    mines_total_wagered = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)  # Total amount wagered
    mines_total_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)  # Total profit/loss (can be negative)
    mines_biggest_win = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Biggest single win payout
    mines_current_streak = models.IntegerField(default=0)  # Current win streak (positive) or loss streak (negative)
    mines_best_streak = models.IntegerField(default=0)  # Best win streak ever
    
    # Keno game statistics
    keno_games_played = models.IntegerField(default=0)  # Total games played
    keno_games_won = models.IntegerField(default=0)  # Total games won
    keno_games_lost = models.IntegerField(default=0)  # Total games lost
    keno_total_wagered = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)  # Total amount wagered
    keno_total_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)  # Total profit/loss (can be negative)
    keno_biggest_win = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Biggest single win payout
    keno_current_streak = models.IntegerField(default=0)  # Current win streak (positive) or loss streak (negative)
    keno_best_streak = models.IntegerField(default=0)  # Best win streak ever

    def __str__(self):
        return f"{self.user.username}'s Profile"


class MinesGame(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('disconnected', 'Disconnected'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mines_games')
    bet_amount = models.DecimalField(max_digits=12, decimal_places=2)
    mines_count = models.IntegerField()
    
    # Provably fair fields
    server_seed = models.CharField(max_length=64)  # Actual seed (revealed after game)
    server_seed_hash = models.CharField(max_length=64)  # SHA-256 hash shown to player
    client_seed = models.CharField(max_length=64)
    nonce = models.IntegerField(default=0)
    
    # Game state
    mine_positions = models.JSONField()  # List of mine positions [0-24]
    revealed_tiles = models.JSONField(default=list)  # List of revealed tile positions
    current_multiplier = models.DecimalField(max_digits=10, decimal_places=2, default=1.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Results
    payout_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Mines Game {self.id} - {self.user.username} - {self.status}"
    
    def tiles_revealed_count(self):
        return len(self.revealed_tiles)
    
    def safe_tiles_remaining(self):
        return 25 - self.mines_count - len(self.revealed_tiles)


class KenoGame(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('disconnected', 'Disconnected'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='keno_games')
    bet_amount = models.DecimalField(max_digits=12, decimal_places=2)
    numbers_selected = models.JSONField()  # List of player-selected numbers [1-40], can select 1-10 numbers
    
    # Provably fair fields
    server_seed = models.CharField(max_length=64)  # Actual seed (revealed after game)
    server_seed_hash = models.CharField(max_length=64)  # SHA-256 hash shown to player
    client_seed = models.CharField(max_length=64)
    nonce = models.IntegerField(default=0)
    
    # Game state
    drawn_numbers = models.JSONField(default=list)  # List of 20 drawn numbers [1-40]
    matches = models.IntegerField(default=0)  # Number of matches between selected and drawn
    current_multiplier = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Results
    payout_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    net_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
    
    def __str__(self):
        return f"Keno Game {self.id} - {self.user.username} - {self.status}"
    
    def spots_selected(self):
        """Return the number of spots/numbers the player selected."""
        return len(self.numbers_selected)