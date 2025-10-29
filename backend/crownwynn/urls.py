from django.contrib import admin
from django.urls import path, include

# Nothing needs to be changed in this file - it simply routes requests to the appropriate app.

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls'))
]
