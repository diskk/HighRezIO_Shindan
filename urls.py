from django.urls import path
from plugins.shindan.views.pages.top import TopView

urlpatterns = [
    path('', TopView.as_view(), name='top'),
]
