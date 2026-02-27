from django.shortcuts import render
from django.views import View

from utils.logger_util import LoggerUtil


# 診断トップページ
class TopView(View):
    def get(self, request):
        LoggerUtil.prepare()
        LoggerUtil.info(f"GET {request.path}")

        context = {
            'plugin_name': '野鳥撮影者タイプ診断',
        }
        return render(request, 'shindan/top.html', context)
