from django.urls import path

from plugins.shindan.views.pages.top import TopView
from plugins.shindan.views.apis.result import ResultView
from plugins.shindan.views.apis.settings import SettingsView
from plugins.shindan.views.apis.ai_generate import AiGenerateView

urlpatterns = [
    path('', TopView.as_view(), name='top'),
    # pushState URL（すべてトップページと同じビューを返す）
    path('q/<int:num>/', TopView.as_view(), name='top_question'),
    path('result/', TopView.as_view(), name='top_result'),
    # 公開API
    path('api/result/', ResultView.as_view(), name='api_result'),
    # 管理用API
    path('api/settings/', SettingsView.as_view(), name='api_settings'),
    path('api/ai/generate/', AiGenerateView.as_view(), name='api_ai_generate'),
]
