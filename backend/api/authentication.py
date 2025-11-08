from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate using an access token stored in an HttpOnly cookie.

    We override ``authenticate`` instead of ``get_raw_token`` because the base
    class expects ``get_raw_token(header)`` – the original implementation here
    used the wrong signature, which would cause a ``TypeError`` at runtime.
    """

    def authenticate(self, request):  # type: ignore[override]
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return None
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            # Invalid / expired token – treat as anonymous
            return None
        return self.get_user(validated_token), validated_token

    # Explicitly ignore Authorization header
    def get_header(self, request):  # type: ignore[override]
        return None