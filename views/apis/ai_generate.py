import json

from django.http import JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator

from utils.ai_provider import AIProviderFactory
from utils.ai_provider.ai_base import AIProviderError
from utils.decorators import admin_required
from utils.logger_util import LoggerUtil
from utils.setting_util import SettingUtil


# shindan プラグインのAI生成API
# 成分・質問・野鳥の各データをAIで生成
@method_decorator(admin_required, name='dispatch')
@method_decorator(csrf_protect, name='dispatch')
class AiGenerateView(View):
    _KEY_MAP = {
        'gemini': 'ai_gemini_api_key',
        'openai': 'ai_openai_api_key',
        'claude': 'ai_claude_api_key',
    }

    # AI生成リクエスト処理
    # Request body:
    #   type: 生成タイプ（'component', 'question', 'bird'）
    #   provider: プロバイダー名
    #   model: モデルID
    #   system_prompt: システムプロンプト
    #   user_prompt: ユーザープロンプト（生成対象のデータ）
    def post(self, request):
        LoggerUtil.prepare()
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': '無効なJSONです'}, status=400)

        generate_type = body.get('type', '').strip()
        provider_name = body.get('provider', '').strip()
        model_id = body.get('model', '').strip()
        system_prompt = body.get('system_prompt', '').strip()
        user_prompt = body.get('user_prompt', '').strip()

        if not generate_type:
            return JsonResponse({'error': '生成タイプが指定されていません'}, status=400)
        if not provider_name:
            return JsonResponse({'error': 'プロバイダーが指定されていません'}, status=400)
        if not model_id:
            return JsonResponse({'error': 'モデルが指定されていません'}, status=400)
        if not user_prompt:
            return JsonResponse({'error': 'プロンプトが指定されていません'}, status=400)

        # APIキーを取得
        setting_util = SettingUtil()
        key_field = self._KEY_MAP.get(provider_name)
        if not key_field:
            return JsonResponse({'error': '不正なプロバイダーです'}, status=400)
        api_key = setting_util.get(key_field)
        if not api_key:
            return JsonResponse({'error': 'APIキーが設定されていません'}, status=400)

        try:
            provider = AIProviderFactory.create(provider_name, api_key, model_id)
            generated_text = provider.generate_text(system_prompt, user_prompt)

            # JSONレスポンスを抽出（マークダウンコードブロックの除去）
            result = self._extract_json(generated_text)

            # 最終使用モデルを保存
            self._save_selected_model(setting_util, provider_name, model_id)

            return JsonResponse({'success': True, 'result': result})
        except AIProviderError as e:
            return JsonResponse({'error': str(e)}, status=400)
        except json.JSONDecodeError:
            LoggerUtil.warn(f"AI生成結果のJSONパースに失敗: {generated_text[:500]}")
            return JsonResponse({'error': 'AI生成結果のJSONパースに失敗しました。再度お試しください。'}, status=400)
        except Exception as e:
            LoggerUtil.error(f"AI生成エラー: {e}", e)
            return JsonResponse({'error': 'AI生成に失敗しました'}, status=500)

    # AI生成結果からJSONを抽出
    # マークダウンのコードブロック（```json ... ```）を除去してパース
    def _extract_json(self, text):
        text = text.strip()
        # ```json ... ``` の除去
        if text.startswith('```'):
            lines = text.split('\n')
            # 最初の行（```json等）を除去
            lines = lines[1:]
            # 最後の行（```）を除去
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            text = '\n'.join(lines).strip()
        return json.loads(text)

    # 最終使用モデルを保存
    def _save_selected_model(self, setting_util, provider_name, model_id):
        try:
            selected_models = setting_util.get('ai_selected_models')
            if selected_models.get(provider_name) != model_id:
                selected_models = {**selected_models, provider_name: model_id}
                setting_util.set('ai_selected_models', selected_models)
        except Exception as e:
            LoggerUtil.warn(f"最終使用モデルの保存に失敗: {e}")
