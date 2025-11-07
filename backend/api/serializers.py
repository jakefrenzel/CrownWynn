from rest_framework import serializers
from api.models import Profile

# Serializers for API endpoints

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "balance"]
        read_only_fields = ["id"]
