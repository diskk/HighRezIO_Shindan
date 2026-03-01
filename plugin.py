import random

import numpy as np

from plugins.base import PluginBase


# 野鳥撮影者タイプ診断プラグイン
class ShindanPlugin(PluginBase):
    name = "shindan"
    display_name = "野鳥撮影者タイプ診断"
    version = "1.0"

    # プラグイン固有のデフォルト設定
    DEFAULTS = {
        'ai_component_prompt': 'あなたは野鳥撮影者の性格診断を設計する専門家です。\n与えられた成分名から、その成分の「説明」「ポジティブな面」「ネガティブな面」を生成してください。\n\n【文脈】\n野鳥撮影者を7つの成分（性格軸）で分析する診断です。各成分は撮影者の特徴を表します。\n\n【出力形式】\nJSON配列で出力してください。各要素は以下の形式:\n{"name": "成分名", "description": "成分の概要説明（50〜100文字）", "positive": "この成分が強い人の良い特徴（50〜100文字）", "negative": "この成分が強すぎる場合の注意点（50〜100文字）"}\n\n【厳守ルール】\n- 出力はJSON配列のみ。説明や補足は一切付けないこと。\n- 野鳥撮影の文脈に沿った内容にすること。\n- ポジティブとネガティブは対照的な内容にすること。',
        'ai_question_prompt': 'あなたは野鳥撮影者の性格診断の質問を作成する専門家です。\n与えられた成分データに基づいて、診断用の質問とスコアを生成してください。\n\n【文脈】\n野鳥撮影者を成分（性格軸）で分析する診断です。各質問に「はい」「どちらかといえばそう」「どちらかといえば違う」「いいえ」の4択で回答します。\n\n【ターゲット層】\n- 野鳥撮影を趣味として楽しんでいるアマチュア〜ハイアマチュア層が中心\n- プロカメラマンや仕事として撮影している人はごく少数\n- 機材は高価（ボディ+レンズで数十万〜百万円超）だが、あくまで趣味への投資として購入している\n- 「収益化」「ビジネス」「プロとして」のようなダイレクトな表現は大半の人にとって現実的でなく、共感を得にくい\n- 機材のメンテナンスは基本的にメーカーや専門業者に任せるのが常識で、自分で分解・清掃する人はまずいない\n\n【出力形式】\nJSON配列で出力してください。各要素は以下の形式:\n{"question_text": "質問文", "scores": {"yes": {"成分名1": 数値, ...}, "slightly_yes": {"成分名1": 数値, ...}, "slightly_no": {"成分名1": 数値, ...}, "no": {"成分名1": 数値, ...}}}\n\nスコアの範囲: -3〜+3（整数）\nスコアの大小関係: 通常 yes > slightly_yes > slightly_no > no となるようにすること（逆転項目では逆）\n\n【厳守ルール】\n- 出力はJSON配列のみ。説明や補足は一切付けないこと。\n- 7成分へのスコア影響が全質問を通して均等になるようにすること。\n- 【逆転項目の必須ルール】全体の約3割（例: 30問中9〜10問）は逆転項目にすること。逆転項目とは「いいえ」と答えたほうがスコアが高くなる質問のこと。逆転項目では no > slightly_no > slightly_yes > yes のスコア順にすること。逆転項目が不足すると「はい」ばかり答える回答パターンを防げず診断精度が落ちるため、必ず規定数を含めること。\n  逆転項目の例: 「新しい機材が出ても、今の装備で十分だと感じるほうだ」→ yes: 機材好き-2, no: 機材好き+2\n- 質問文は野鳥撮影者が共感しやすい具体的なシナリオにすること。\n- 年配層にも伝わる平易な日本語を使うこと。「キャプション」「コミュニティ」「フィードバック」「モチベーション」「アプローチ」等のカタカナ英語は避け、誰にでもわかる言葉に言い換えること。\n- 回答が極端に偏る質問（ほぼ全員が「はい」または「いいえ」になる）は避け、回答が分かれる質問にすること。\n- ターゲット層の実態からかけ離れた質問（プロ前提・収益化前提・非現実的な行動）は避けること。\n- 質問文の中で「AよりB」「AよりもB」「AではなくB」のように2つの要素を直接比較する文構造は避けること。ただし、スコアは複数の成分に影響して構わない。1つの具体的な行動・嗜好を問う質問が、結果として複数成分に影響するのは自然で望ましい。\n  悪い例: 「カタログスペックよりも実際に使いこなせるかを重視するタイプだ」（文中で2つを対比）\n  良い例: 「撮影に出かける前に、天気や潮汐を細かく調べるほうだ」（1つの行動を問い、計画性・探究心など複数成分にスコア影響）\n- 倫理観・マナー・常識を問うだけの質問は避けること（例:「傷ついた鳥を保護する」「環境に配慮する」など）。ほぼ全員が同じ回答になり、性格の違いを測れない。質問は趣味としての行動傾向や嗜好の違いを測るものにすること。\n- 【重要】質問文は「〜ですか？」「〜ますか？」「〜でしょうか？」のような疑問文にしないこと。質問文は「自分はこういうタイプだ」という自己申告の文（断定調）にし、ユーザーはそれに対して「はい/ややそう/やや違う/いいえ」で答える形式にすること。\n- 語尾のバリエーション例（これらを均等に混ぜること。同じ語尾が連続しないこと）:\n  - 「〜するほうだ」「〜しがちだ」「〜するタイプだ」（性格描写）\n  - 「〜したことがある」「〜した経験がある」（経験）\n  - 「〜することが多い」「〜する傾向がある」（行動傾向）\n  - 「〜のほうが好きだ」「〜のほうが気になる」（嗜好）\n  - 「〜を大切にしている」「〜にこだわりがある」（価値観）\n- 既存の質問と重複しないこと。',
        'ai_bird_prompt': 'あなたは野鳥の生態に詳しい専門家です。\n与えられた野鳥名から、性格診断の成分パラメータと説明文を生成してください。\n\n【文脈】\n野鳥撮影者タイプ診断で、ユーザーの回答結果とマッチする野鳥を表示します。各野鳥にも成分パラメータを持たせ、ユーザーとの類似度で判定します。\n\n【出力形式】\nJSONオブジェクトで出力してください:\n{"scores": {"成分名1": 数値, ...}, "description": "この鳥についての説明文（100〜200文字）"}\n\nスコアの範囲: 1〜10（整数）\n\n【厳守ルール】\n- 出力はJSONオブジェクトのみ。説明や補足は一切付けないこと。\n- description内に試行錯誤番号・注釈・メタ情報（例:「試行錯誤N」「バージョンN」等）を絶対に含めないこと。\n- descriptionは純粋にその鳥の生態・習性・特徴の説明のみにすること。成分名やパラメータに言及しないこと。\n- scoresは鳥の生態・習性・行動パターンに基づいて設定すること。\n- 説明文は野鳥撮影者が興味を持つような自然な文章にすること。',
    }

    def get_url_patterns(self):
        from plugins.shindan.urls import urlpatterns
        return urlpatterns

    # 管理画面用設定JSXコンポーネントのパスを返す
    def get_settings_component(self):
        return 'shindan/js/manage/settings.jsx'

    # sitemap 用エントリ（公開時のみ）
    def get_sitemap_entries(self, site_url):
        if not self.is_public():
            return []
        return [{
            'loc': f'{site_url}/plugins/shindan/',
            'changefreq': 'monthly',
            'priority': '0.5',
        }]

    # プラグインデフォルト値を取得
    # Args:
    #   key: 設定キー
    # Returns:
    #   デフォルト値
    def get_default(self, key):
        if key not in self.DEFAULTS:
            raise KeyError(f"Plugin default key '{key}' not found")
        return self.DEFAULTS[key]

    # プロンプト設定を取得（プラグインデータ内のオーバーライド → デフォルトの順）
    # Returns:
    #   dict: {component, question, bird} のプロンプト辞書
    def get_prompts(self):
        data = self.get_data()
        prompts = data.get('prompts', {})
        prompt_keys = {
            'component': 'ai_component_prompt',
            'question': 'ai_question_prompt',
            'bird': 'ai_bird_prompt',
        }
        return {
            key: prompts.get(key, self.DEFAULTS[default_key])
            for key, default_key in prompt_keys.items()
        }

    # 鳥の matching_scores を算出してデータに書き込む
    # ランダム回答シミュレーション + 反復最適化で全鳥が均等に選ばれるスコアを算出
    # NOTICE: data オブジェクトを直接変更する（保存は呼び出し側で行う）
    # Args:
    #   data: プラグインデータ（components, questions, birds を含む）
    #   n_samples: ランダム回答のサンプル数
    #   n_iterations: 最適化の反復回数
    #   lr: 学習率
    #   regularization: 元スコアへの引き戻し強度
    def compute_matching_scores(self, data, n_samples=5000, n_iterations=100,
                                lr=0.1, regularization=0.03):
        components = data.get('components', [])
        questions = data.get('questions', [])
        birds = data.get('birds', [])

        if not components or not questions or not birds:
            return

        component_names = [c['name'] for c in sorted(
            components, key=lambda c: c.get('sort_order', 0)
        )]
        n_comp = len(component_names)
        n_birds = len(birds)
        answer_choices = ('yes', 'slightly_yes', 'slightly_no', 'no')

        # 質問スコアを行列化: (n_questions, 4, n_comp)
        n_questions = len(questions)
        q_scores = np.zeros((n_questions, 4, n_comp))
        for qi, question in enumerate(questions):
            scores = question.get('scores', {})
            for ai, choice in enumerate(answer_choices):
                choice_scores = scores.get(choice, {})
                for ci, comp_name in enumerate(component_names):
                    q_scores[qi, ai, ci] = choice_scores.get(comp_name, 0)

        # 正規化用の最大・最小
        max_possible = q_scores.max(axis=1).sum(axis=0)  # (n_comp,)
        min_possible = q_scores.min(axis=1).sum(axis=0)  # (n_comp,)
        score_range = max_possible - min_possible
        score_range[score_range == 0] = 1  # ゼロ除算防止

        # ユーザースコアサンプルを一括生成
        # ランダム回答インデックス: (n_samples, n_questions)
        answer_indices = np.random.randint(0, 4, size=(n_samples, n_questions))
        # 各サンプル・各質問の選択されたスコアを取得: (n_samples, n_questions, n_comp)
        q_idx = np.arange(n_questions)[np.newaxis, :]  # (1, n_questions)
        raw_samples = q_scores[q_idx, answer_indices, :]  # (n_samples, n_questions, n_comp)
        raw_totals = raw_samples.sum(axis=1)  # (n_samples, n_comp)
        # 正規化 0-100
        user_samples = np.clip((raw_totals - min_possible) / score_range * 100, 0, 100)

        user_centroid = user_samples.mean(axis=0)  # (n_comp,)

        # 鳥ベクトル初期化（z-score正規化）
        bird_raw = np.array([
            [b.get('scores', {}).get(name, 5) for name in component_names]
            for b in birds
        ], dtype=np.float64)  # (n_birds, n_comp)
        bird_mean = bird_raw.mean(axis=0)
        bird_std = bird_raw.std(axis=0)
        bird_std_safe = np.where(bird_std > 0, bird_std, 1.0)
        bird_vectors = np.clip((bird_raw - bird_mean) / bird_std_safe * 25 + 50, 0, 100)
        # std==0 の成分は 50.0
        bird_vectors[:, bird_std == 0] = 50.0

        original_vectors = bird_vectors.copy()

        # 反復最適化（numpy行列演算）
        target = n_samples / n_birds
        for _ in range(n_iterations):
            # 全サンプル×全鳥のユークリッド距離: (n_samples, n_birds)
            diff = user_samples[:, np.newaxis, :] - bird_vectors[np.newaxis, :, :]
            distances = np.sqrt((diff ** 2).sum(axis=2))

            # 最近傍の鳥インデックス: (n_samples,)
            nearest = distances.argmin(axis=1)

            # 鳥ごとの集計
            counts = np.bincount(nearest, minlength=n_birds)

            # 鳥ごとのマッチユーザー重心
            centroids = np.zeros((n_birds, n_comp))
            for i in range(n_birds):
                mask = nearest == i
                if counts[i] > 0:
                    centroids[i] = user_samples[mask].mean(axis=0)

            # ベクトル調整
            for i in range(n_birds):
                if counts[i] == 0:
                    bird_vectors[i] += lr * 2 * (user_centroid - bird_vectors[i])
                elif counts[i] > target * 1.2:
                    factor = lr * (counts[i] / target - 1)
                    bird_vectors[i] += factor * (bird_vectors[i] - centroids[i])
                elif counts[i] < target * 0.8:
                    factor = lr * (1 - counts[i] / target)
                    bird_vectors[i] += factor * (centroids[i] - bird_vectors[i])

            # 正則化 + クランプ（一括）
            bird_vectors += regularization * (original_vectors - bird_vectors)
            np.clip(bird_vectors, 0, 100, out=bird_vectors)

        # 結果を birds に書き込み
        for i, bird in enumerate(birds):
            bird['matching_scores'] = {
                name: round(float(bird_vectors[i, j]), 1)
                for j, name in enumerate(component_names)
            }

    # プロンプト設定を保存（デフォルト値と同じ場合は保存しない）
    # Args:
    #   prompts: {component?, question?, bird?} のプロンプト辞書
    def save_prompts(self, prompts):
        data = self.get_data()
        saved_prompts = data.get('prompts', {})
        prompt_keys = {
            'component': 'ai_component_prompt',
            'question': 'ai_question_prompt',
            'bird': 'ai_bird_prompt',
        }
        for key, value in prompts.items():
            default_key = prompt_keys.get(key)
            if not default_key or value is None:
                continue
            # デフォルトと同じならオーバーライドを削除
            if value == self.DEFAULTS[default_key]:
                saved_prompts.pop(key, None)
            else:
                saved_prompts[key] = value
        if saved_prompts:
            data['prompts'] = saved_prompts
        else:
            data.pop('prompts', None)
        self.save_data(data)
