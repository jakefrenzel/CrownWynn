from django.contrib.auth.models import User
from django.db import models

# Create your models here.
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    welcome_bonus_claimed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username}'s Profile"