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
