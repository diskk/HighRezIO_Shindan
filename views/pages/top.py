import json
import random
import uuid as uuid_mod

from django.http import HttpResponse
from django.shortcuts import render
from django.views import View

from common.models import MediaFile
from plugins.shindan.plugin import ShindanPlugin
from utils.bot_detect_util import BotDetectUtil
from utils.logger_util import LoggerUtil
from utils.setting_util import SettingUtil
from utils.stats_util import StatsUtil

PAGE_KEY = 'plugin:shindan'


# 診断トップページ
# 全質問データ・成分データ・野鳥データをJSONで埋め込んでHTMLを返す
class TopView(View):
    def get(self, request, **kwargs):
        LoggerUtil.prepare()
        LoggerUtil.info(f"GET {request.path}")

        plugin = ShindanPlugin()

        # アクセス制御: 非公開かつ非管理者 → 403
        if not plugin.is_public() and not request.session.get('is_admin', False):
            return HttpResponse('Forbidden', status=403)

        data = plugin.get_data()
        setting_util = SettingUtil()

        components = data.get('components', [])
        questions = data.get('questions', [])
        birds = data.get('birds', [])

        # プラグイン設定
        plugin_settings = data.get('settings', {})
        plugin_title = plugin_settings.get('title', '') or 'AIとりや成分診断'
        plugin_description = plugin_settings.get('description', '')
        top_media_id = plugin_settings.get('top_media_id', '')

        # 写真URL構築対象: 野鳥 + トップ画像
        media_ids = [b['media_id'] for b in birds if b.get('media_id')]
        if top_media_id:
            media_ids.append(top_media_id)
        media_map = {}
        if media_ids:
            for media in MediaFile.objects.filter(id__in=media_ids).only(
                'id', 'type', 'processed_at'
            ):
                media_map[str(media.id)] = {
                    'type': media.type,
                    'processed_at': media.processed_at,
                }

        # 公開用の成分データ（sort_order順）
        components_sorted = sorted(components, key=lambda c: c.get('sort_order', 0))
        components_public = [{
            'id': c['id'],
            'name': c['name'],
            'description': c.get('description', ''),
            'positive': c.get('positive', ''),
            'negative': c.get('negative', ''),
        } for c in components_sorted]

        # 公開用の質問データ（ランダム順）
        questions_sorted = sorted(questions, key=lambda q: q.get('sort_order', 0))
        random.shuffle(questions_sorted)
        questions_public = [{
            'id': q['id'],
            'question_text': q['question_text'],
            'scores': q['scores'],
        } for q in questions_sorted]

        # 公開用の鳥データ（media_url付き）
        birds_public = []
        for bird in birds:
            media_id = bird.get('media_id')
            media_info = media_map.get(media_id)
            media_url = ''
            if media_info:
                media_type = media_info['type']
                pa = media_info.get('processed_at', 0)
                # 丸型切り抜きアバター表示には mid（1024px）で十分
                media_url = f'/api/download/{media_type}/{media_id}/mid/'
                if pa:
                    media_url = f'/api/download/{media_type}/{media_id}/mid/{pa}/'

            birds_public.append({
                'id': bird['id'],
                'name': bird['name'],
                'description': bird.get('description', ''),
                'crop': bird.get('crop', {}),
                'scores': bird.get('scores', {}),
                'media_url': media_url,
            })

        # トップ画像URL構築
        top_image_url = ''
        if top_media_id:
            top_media_info = media_map.get(top_media_id)
            if top_media_info:
                media_type = top_media_info['type']
                pa = top_media_info.get('processed_at', 0)
                top_image_url = f'/api/download/{media_type}/{top_media_id}/mid/'
                if pa:
                    top_image_url = f'/api/download/{media_type}/{top_media_id}/mid/{pa}/'

        # AdSense設定（管理者ログイン時は実広告を出力しない）
        is_admin = request.session.get('is_admin', False)
        ad_preview = is_admin and setting_util.get('ad_preview_for_admin')
        publisher_id = '' if is_admin else (setting_util.get('adsense_publisher_id') or '')
        ad_unit_id = '' if is_admin else (setting_util.get('ad_default_unit_id') or '')

        # 広告ブロッカー検出（設定ON + 広告設定あり + 非管理者）
        detect_ad_blocker = (
            data.get('ad_blocker_detection', False)
            and bool(publisher_id)
            and not is_admin
        )

        # サイト情報
        site_title = setting_util.get('site_title') or ''
        site_url = setting_util.get('site_url') or ''

        # OGP画像: サイトOGP画像を使用
        site_ogp_image_id = setting_util.get('site_ogp_image_id')
        og_image = ''
        if site_ogp_image_id and site_url:
            try:
                ogp_media = MediaFile.objects.only('type', 'processed_at').get(id=site_ogp_image_id)
                pa = ogp_media.processed_at
                og_image = f"{site_url}/api/download/{ogp_media.type}/{site_ogp_image_id}/full/"
                if pa:
                    og_image = f"{site_url}/api/download/{ogp_media.type}/{site_ogp_image_id}/full/{pa}/"
            except MediaFile.DoesNotExist:
                pass

        context = {
            'plugin_name': plugin_title,
            'plugin_description': plugin_description,
            'site_title': site_title,
            'site_url': site_url,
            'top_image_url': top_image_url,
            'og_image': og_image,
            'shindan_data_json': json.dumps({
                'components': components_public,
                'questions': questions_public,
                'birds': birds_public,
            }, ensure_ascii=False),
            'adsense_publisher_id': publisher_id,
            'ad_unit_id': ad_unit_id,
            'ad_preview': ad_preview,
            'detect_ad_blocker': detect_ad_blocker,
        }
        response = render(request, 'shindan/top.html', context)

        # PV/UU記録
        visitor_uuid = request.COOKIES.get('viz_uuid') or str(uuid_mod.uuid4())
        ua = request.META.get('HTTP_USER_AGENT', '')
        is_bot = BotDetectUtil.is_bot(ua)
        if not is_admin and not is_bot:
            StatsUtil.record_page_view(PAGE_KEY, visitor_uuid)
        response.set_cookie('viz_uuid', visitor_uuid, max_age=365 * 86400, samesite='Lax')

        return response
