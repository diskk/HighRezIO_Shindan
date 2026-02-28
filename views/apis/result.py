import json
import math

from django.http import JsonResponse
from django.views import View

from plugins.shindan.plugin import ShindanPlugin
from utils.logger_util import LoggerUtil


# 結果算出API
# クライアントから全回答を受け取り、スコア計算 + 野鳥マッチングを行う
# 公開時は認証不要、非公開時は管理者のみ
class ResultView(View):
    # POST /plugins/shindan/api/result/
    # Args:
    #   request.body: { answers: { question_id: "yes"|"slightly_yes"|"slightly_no"|"no", ... } }
    # Returns:
    #   JsonResponse: { success, scores, bird, similarity }
    def post(self, request):
        LoggerUtil.prepare()
        LoggerUtil.info(f"POST {request.path}")

        plugin = ShindanPlugin()

        # アクセス制御: 非公開かつ非管理者 → 403
        if not plugin.is_public() and not request.session.get('is_admin', False):
            return JsonResponse({'error': 'Forbidden'}, status=403)

        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': '無効なJSONです'}, status=400)

        answers = body.get('answers', {})
        if not answers:
            return JsonResponse({'error': '回答がありません'}, status=400)

        data = plugin.get_data()

        components = data.get('components', [])
        questions = data.get('questions', [])
        birds = data.get('birds', [])

        if not components or not questions or not birds:
            return JsonResponse({'error': '診断データが未設定です'}, status=400)

        # 成分名リスト（sort_order順）
        component_names = [c['name'] for c in sorted(
            components, key=lambda c: c.get('sort_order', 0)
        )]

        # スコア計算: 各質問の回答スコアを合算
        raw_scores = {name: 0 for name in component_names}
        question_map = {q['id']: q for q in questions}
        answer_choices = ('yes', 'slightly_yes', 'slightly_no', 'no')

        for q_id, answer in answers.items():
            question = question_map.get(q_id)
            if not question or answer not in answer_choices:
                continue
            answer_scores = question.get('scores', {}).get(answer, {})
            for comp_name, value in answer_scores.items():
                if comp_name in raw_scores:
                    raw_scores[comp_name] += value

        # 正規化（0-100）: 各成分の理論上の最大・最小から線形正規化
        max_possible = {name: 0 for name in component_names}
        min_possible = {name: 0 for name in component_names}

        for question in questions:
            scores = question.get('scores', {})
            for comp_name in component_names:
                choice_values = [
                    scores.get(choice, {}).get(comp_name, 0)
                    for choice in answer_choices
                ]
                max_possible[comp_name] += max(choice_values)
                min_possible[comp_name] += min(choice_values)

        normalized_scores = {}
        for name in component_names:
            score_range = max_possible[name] - min_possible[name]
            if score_range > 0:
                normalized = (raw_scores[name] - min_possible[name]) / score_range * 100
                normalized_scores[name] = round(max(0, min(100, normalized)), 1)
            else:
                normalized_scores[name] = 50.0

        # 野鳥マッチング: コサイン類似度で最も近い鳥を選出
        user_vector = [normalized_scores.get(name, 0) for name in component_names]
        best_bird = None
        best_similarity = -1

        for bird in birds:
            bird_scores = bird.get('scores', {})
            # 鳥のスコア（1-10）を 0-100 にスケール
            bird_vector = [
                (bird_scores.get(name, 5) - 1) / 9 * 100
                for name in component_names
            ]
            similarity = self._cosine_similarity(user_vector, bird_vector)
            if similarity > best_similarity:
                best_similarity = similarity
                best_bird = bird

        if not best_bird:
            return JsonResponse({'error': '野鳥データがありません'}, status=400)

        return JsonResponse({
            'success': True,
            'scores': normalized_scores,
            'bird': {
                'id': best_bird['id'],
                'name': best_bird['name'],
            },
            'similarity': round(best_similarity * 100, 1),
        })

    # コサイン類似度を計算
    @staticmethod
    def _cosine_similarity(vec_a, vec_b):
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        magnitude_a = math.sqrt(sum(a ** 2 for a in vec_a))
        magnitude_b = math.sqrt(sum(b ** 2 for b in vec_b))
        if magnitude_a == 0 or magnitude_b == 0:
            return 0
        return dot_product / (magnitude_a * magnitude_b)
