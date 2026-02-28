import json
import uuid

from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator

from plugins.shindan.plugin import ShindanPlugin
from utils.decorators import admin_required
from utils.logger_util import LoggerUtil
from utils.setting_util import SettingUtil


# shindan プラグインのデータ読み書きAPI
@method_decorator(admin_required, name='dispatch')
@method_decorator(csrf_protect, name='dispatch')
class SettingsView(View):
    # データ取得
    # Returns:
    #   JsonResponse: {data: {...}, prompts: {...}}
    def get(self, request):
        LoggerUtil.prepare()
        plugin = ShindanPlugin()
        data = plugin.get_data()

        # デフォルトのシステムプロンプトを取得
        setting_util = SettingUtil()
        prompts = {
            'component': setting_util.get('shindan_ai_component_prompt'),
            'question': setting_util.get('shindan_ai_question_prompt'),
            'bird': setting_util.get('shindan_ai_bird_prompt'),
        }

        return JsonResponse({
            'success': True,
            'data': data,
            'prompts': prompts,
        })

    # データ保存
    # Request body:
    #   data: プラグインデータ（components, questions, birds）
    #   prompts: システムプロンプト（変更分のみ）
    def post(self, request):
        LoggerUtil.prepare()
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': '無効なJSONです'}, status=400)

        plugin = ShindanPlugin()

        # プラグインデータの保存
        data = body.get('data')
        if data is not None:
            # 新規アイテムにIDがなければ自動付与
            for key in ('components', 'questions', 'birds'):
                items = data.get(key, [])
                for item in items:
                    if not item.get('id'):
                        item['id'] = str(uuid.uuid4())
            plugin.save_data(data)

        # システムプロンプトの保存（変更がある場合のみ）
        prompts = body.get('prompts')
        if prompts:
            setting_util = SettingUtil()
            prompt_key_map = {
                'component': 'shindan_ai_component_prompt',
                'question': 'shindan_ai_question_prompt',
                'bird': 'shindan_ai_bird_prompt',
            }
            for prompt_type, value in prompts.items():
                setting_key = prompt_key_map.get(prompt_type)
                if setting_key and value is not None:
                    setting_util.set(setting_key, value)

        return JsonResponse({'success': True})
