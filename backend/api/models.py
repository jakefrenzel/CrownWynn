from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone

# Create your models here.
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    welcome_bonus_claimed = models.BooleanField(default=False)
    mines_nonce = models.IntegerField(default=0)  # Nonce counter for provably fair mines games

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