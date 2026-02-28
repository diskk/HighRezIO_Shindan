// shindan プラグイン管理UIコンポーネント
// window.PluginSettings.shindan に登録し、設定ページのプラグインタブからレンダリング
// NOTE: IIFEでラップして他JSXとの変数名衝突を回避
(function() {

const getCsrfToken = () => {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
    }
    return '';
};

const ShindanSettings = () => {
    const toast = window.useToast();

    const [activeSubTab, setActiveSubTab] = React.useState('general');
    const [data, setData] = React.useState({ public: false, ad_blocker_detection: false, components: [], questions: [], birds: [], settings: { title: '', top_media_id: '' } });
    const [prompts, setPrompts] = React.useState({ component: '', question: '', bird: '' });
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);

    const subTabs = [
        { id: 'general', label: '全般' },
        { id: 'components', label: '成分' },
        { id: 'questions', label: '質問' },
        { id: 'birds', label: '野鳥' },
    ];

    // データ読み込み
    React.useEffect(() => {
        fetch('/plugins/shindan/api/settings/')
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    setData({
                        public: res.data.public || false,
                        ad_blocker_detection: res.data.ad_blocker_detection || false,
                        components: res.data.components || [],
                        questions: res.data.questions || [],
                        birds: res.data.birds || [],
                        settings: res.data.settings || { title: '', top_media_id: '' },
                    });
                    setPrompts(res.prompts || { component: '', question: '', bird: '' });
                }
                setIsLoading(false);
            })
            .catch(() => {
                toast.showError('データの読み込みに失敗しました');
                setIsLoading(false);
            });
    }, []);

    // データ保存
    const handleSave = () => {
        setIsSaving(true);
        fetch('/plugins/shindan/api/settings/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ data, prompts }),
        })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    toast.showSuccess('保存しました');
                } else {
                    toast.showError(res.error || '保存に失敗しました');
                }
                setIsSaving(false);
            })
            .catch(() => {
                toast.showError('保存に失敗しました');
                setIsSaving(false);
            });
    };

    if (isLoading) {
        return <div className="text-sm text-slate-500">読み込み中...</div>;
    }

    return (
        <div className="space-y-4">
            {/* サブタブ */}
            <div className="flex border-b border-slate-200">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeSubTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* サブタブの内容 */}
            {activeSubTab === 'general' && (
                <GeneralTab
                    settings={data.settings || {}}
                    onChange={(settings) => setData({ ...data, settings })}
                    isPublic={data.public || false}
                    onPublicChange={(value) => setData({ ...data, public: value })}
                    adBlockerDetection={data.ad_blocker_detection || false}
                    onAdBlockerDetectionChange={(value) => setData({ ...data, ad_blocker_detection: value })}
                />
            )}
            {activeSubTab === 'components' && (
                <ComponentsTab
                    components={data.components}
                    onChange={(components) => setData({ ...data, components })}
                    prompt={prompts.component}
                    onPromptChange={(value) => setPrompts({ ...prompts, component: value })}
                />
            )}
            {activeSubTab === 'questions' && (
                <QuestionsTab
                    questions={data.questions}
                    components={data.components}
                    onChange={(questions) => setData({ ...data, questions })}
                    prompt={prompts.question}
                    onPromptChange={(value) => setPrompts({ ...prompts, question: value })}
                />
            )}
            {activeSubTab === 'birds' && (
                <BirdsTab
                    birds={data.birds}
                    components={data.components}
                    onChange={(birds) => setData({ ...data, birds })}
                    prompt={prompts.bird}
                    onPromptChange={(value) => setPrompts({ ...prompts, bird: value })}
                />
            )}

            {/* 保存ボタン */}
            <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:pointer-events-none"
                >
                    {isSaving ? '保存中...' : '保存'}
                </button>
            </div>
        </div>
    );
};

// --- 全般設定タブ ---
const GeneralTab = ({ settings, onChange, isPublic, onPublicChange, adBlockerDetection, onAdBlockerDetectionChange }) => {
    const [mediaSelecting, setMediaSelecting] = React.useState(false);
    const [topImageUrl, setTopImageUrl] = React.useState('');
    const MediaSelector = window.MediaSelector;

    const update = (key, value) => {
        onChange({ ...settings, [key]: value });
    };

    // メディアURLをAPIから取得
    React.useEffect(() => {
        if (!settings.top_media_id) { setTopImageUrl(''); return; }
        fetch(`/api/media/${settings.top_media_id}/`)
            .then(res => res.json())
            .then(data => {
                if (data.urls) setTopImageUrl(data.urls.icon || data.urls.low || '');
            })
            .catch(() => setTopImageUrl(''));
    }, [settings.top_media_id]);

    const handleMediaSelect = (media) => {
        update('top_media_id', media.id);
        setMediaSelecting(false);
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">診断ページの基本設定を行います。</p>

            {/* 一般公開 */}
            <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => onPublicChange(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <span className="text-sm font-medium text-slate-700">一般公開</span>
            </div>
            <p className="text-xs text-slate-400 -mt-2">OFFの場合、管理者のみアクセスできます</p>

            {/* 広告ブロッカー検出 */}
            <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={adBlockerDetection}
                        onChange={(e) => onAdBlockerDetectionChange(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                </label>
                <span className="text-sm font-medium text-slate-700">広告ブロッカー検出</span>
            </div>
            <p className="text-xs text-slate-400 -mt-2">ONの場合、広告ブロッカーを検出してページ閲覧をブロックします</p>

            {/* タイトル */}
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">診断タイトル</label>
                <input
                    type="text"
                    value={settings.title || ''}
                    onChange={(e) => update('title', e.target.value)}
                    placeholder="AIとりや成分診断"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">空の場合は「AIとりや成分診断」が使用されます</p>
            </div>

            {/* 説明文 */}
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">説明文</label>
                <textarea
                    value={settings.description || ''}
                    onChange={(e) => update('description', e.target.value)}
                    rows={2}
                    placeholder="約25問の質問に答えて、あなたの野鳥撮影スタイルを診断！あなたに似た野鳥も見つかります。"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">開始画面に表示される説明文。空の場合はデフォルトの文章が使用されます</p>
            </div>

            {/* トップ画像 */}
            <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">トップ画像</label>
                <div className="flex items-center gap-3">
                    {settings.top_media_id ? (
                        <div className="relative group">
                            {topImageUrl ? (
                                <img
                                    src={topImageUrl}
                                    alt="トップ画像"
                                    className="w-36 h-24 rounded-lg object-cover border border-slate-200"
                                />
                            ) : (
                                <div className="w-36 h-24 rounded-lg bg-slate-200 animate-pulse" />
                            )}
                            <button
                                onClick={() => update('top_media_id', '')}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <div className="w-36 h-24 rounded-lg bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-2xl">
                            🐦
                        </div>
                    )}
                    <button
                        onClick={() => setMediaSelecting(true)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                    >
                        {settings.top_media_id ? '変更' : '選択'}
                    </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">開始画面に表示される画像（3:2で切り抜き）。未設定の場合は🐦が表示されます</p>
            </div>

            {/* メディア選択ダイアログ */}
            {mediaSelecting && MediaSelector && ReactDOM.createPortal(
                <MediaSelector
                    csrfToken={getCsrfToken()}
                    selectionMode="single"
                    allowedTypes={['photo', 'image']}
                    onConfirm={handleMediaSelect}
                    onCancel={() => setMediaSelecting(false)}
                    initialSelectedIds={settings.top_media_id ? [settings.top_media_id] : []}
                />,
                document.body
            )}
        </div>
    );
};

// --- AI生成セレクタ ---
// プロバイダー・モデル選択 + 生成ボタンの共通コンポーネント
const AiGenerateSection = ({ systemPrompt, onSystemPromptChange, onGenerate, isGenerating, label, provider: extProvider, model: extModel, onProviderChange, onModelChange }) => {
    const toast = window.useToast();

    const [intProvider, setIntProvider] = React.useState('');
    const [models, setModels] = React.useState([]);
    const [intModel, setIntModel] = React.useState('');

    // 外部制御がある場合はそちらを優先、なければ内部 state
    const provider = extProvider !== undefined ? extProvider : intProvider;
    const setProvider = onProviderChange || setIntProvider;
    const model = extModel !== undefined ? extModel : intModel;
    const setModel = onModelChange || setIntModel;
    const [isLoadingModels, setIsLoadingModels] = React.useState(false);
    const [showPrompt, setShowPrompt] = React.useState(false);
    // 一時的なシステムプロンプト（編集してもデフォルトは変更しない）
    const [tempPrompt, setTempPrompt] = React.useState(systemPrompt);

    // 初回: 利用可能なプロバイダーを自動検出
    React.useEffect(() => {
        // 設定APIからAPIキーの有無を取得
        fetch('/api/settings/')
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    const available = [];
                    if (data.settings.ai_gemini_api_key_is_set) available.push('gemini');
                    if (data.settings.ai_openai_api_key_is_set) available.push('openai');
                    if (data.settings.ai_claude_api_key_is_set) available.push('claude');
                    if (available.length > 0) setProvider(available[0]);
                }
            })
            .catch(() => {});
    }, []);

    // プロバイダー変更時にモデル一覧を取得
    React.useEffect(() => {
        if (!provider) return;
        setIsLoadingModels(true);
        setModels([]);
        setModel('');

        fetch('/manage/api/ai_models/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ provider }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success && data.models) {
                    setModels(data.models);
                    setModel(data.models[0]?.id || '');
                } else {
                    toast.showError(data.error || 'モデル一覧の取得に失敗しました');
                }
                setIsLoadingModels(false);
            })
            .catch(() => {
                toast.showError('モデル一覧の取得に失敗しました');
                setIsLoadingModels(false);
            });
    }, [provider]);

    React.useEffect(() => {
        setTempPrompt(systemPrompt);
    }, [systemPrompt]);

    const providerOptions = [
        { id: 'gemini', name: 'Google Gemini' },
        { id: 'openai', name: 'OpenAI' },
        { id: 'claude', name: 'Anthropic Claude' },
    ];

    return (
        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">AI生成</h4>
                <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                >
                    {showPrompt ? 'プロンプトを隠す' : 'プロンプトを表示'}
                </button>
            </div>

            {/* プロバイダー・モデル選択 */}
            <div className="flex gap-3 flex-wrap">
                <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white"
                >
                    <option value="">プロバイダー</option>
                    {providerOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={isLoadingModels || models.length === 0}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white min-w-[200px]"
                >
                    {isLoadingModels ? (
                        <option>読み込み中...</option>
                    ) : models.length === 0 ? (
                        <option>モデルなし</option>
                    ) : (
                        models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                    )}
                </select>
            </div>

            {/* システムプロンプト（折りたたみ） */}
            {showPrompt && (
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">システムプロンプト（一時的な編集）</label>
                    <textarea
                        value={tempPrompt}
                        onChange={(e) => setTempPrompt(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex justify-between mt-1">
                        <button
                            onClick={() => setTempPrompt(systemPrompt)}
                            className="text-xs text-slate-500 hover:text-blue-600"
                        >
                            デフォルトに戻す
                        </button>
                        <button
                            onClick={() => onSystemPromptChange(tempPrompt)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            デフォルトとして保存
                        </button>
                    </div>
                </div>
            )}

            {/* 生成ボタン */}
            <button
                onClick={() => onGenerate({ provider, model, systemPrompt: tempPrompt })}
                disabled={isGenerating || !provider || !model}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
            >
                {isGenerating ? '生成中...' : (label || 'AI生成')}
            </button>
        </div>
    );
};

// --- 成分サブタブ ---
const ComponentsTab = ({ components, onChange, prompt, onPromptChange }) => {
    const toast = window.useToast();
    const [isGenerating, setIsGenerating] = React.useState(false);

    const addComponent = () => {
        onChange([...components, {
            id: '',
            name: '',
            description: '',
            positive: '',
            negative: '',
            sort_order: components.length + 1,
        }]);
    };

    const updateComponent = (index, field, value) => {
        const updated = [...components];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeComponent = (index) => {
        onChange(components.filter((_, i) => i !== index));
    };

    // AI生成: 成分名から説明・ポジティブ・ネガティブを生成
    const handleAiGenerate = ({ provider, model, systemPrompt }) => {
        const names = components.filter(c => c.name.trim()).map(c => c.name.trim());
        if (names.length === 0) {
            toast.showError('成分名を1つ以上入力してください');
            return;
        }

        setIsGenerating(true);
        fetch('/plugins/shindan/api/ai/generate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({
                type: 'component',
                provider,
                model,
                system_prompt: systemPrompt,
                user_prompt: `以下の成分名について、それぞれの説明・ポジティブな面・ネガティブな面を生成してください。\n\n成分名: ${names.join(', ')}`,
            }),
        })
            .then(res => res.json())
            .then(res => {
                if (res.success && Array.isArray(res.result)) {
                    // 生成結果を既存データにマージ
                    const updated = [...components];
                    res.result.forEach(generated => {
                        const idx = updated.findIndex(c => c.name === generated.name);
                        if (idx >= 0) {
                            if (generated.description) updated[idx].description = generated.description;
                            if (generated.positive) updated[idx].positive = generated.positive;
                            if (generated.negative) updated[idx].negative = generated.negative;
                        }
                    });
                    onChange(updated);
                    toast.showSuccess('AI生成が完了しました');
                } else {
                    toast.showError(res.error || 'AI生成に失敗しました');
                }
                setIsGenerating(false);
            })
            .catch(() => {
                toast.showError('AI生成に失敗しました');
                setIsGenerating(false);
            });
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">レーダーチャートの7軸となる成分を定義します。</p>

            {/* 成分一覧 */}
            {components.map((comp, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">成分 #{index + 1}</span>
                        <button
                            onClick={() => removeComponent(index)}
                            className="text-xs text-red-500 hover:text-red-700"
                        >
                            削除
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">名前</label>
                            <input
                                type="text"
                                value={comp.name}
                                onChange={(e) => updateComponent(index, 'name', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="例: ビジネス"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">表示順</label>
                            <input
                                type="number"
                                value={comp.sort_order}
                                onChange={(e) => updateComponent(index, 'sort_order', parseInt(e.target.value) || 0)}
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">説明</label>
                        <textarea
                            value={comp.description}
                            onChange={(e) => updateComponent(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">ポジティブな面</label>
                            <textarea
                                value={comp.positive}
                                onChange={(e) => updateComponent(index, 'positive', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">ネガティブな面</label>
                            <textarea
                                value={comp.negative}
                                onChange={(e) => updateComponent(index, 'negative', e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            ))}

            {/* 追加ボタン */}
            <button
                onClick={addComponent}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
                + 成分を追加
            </button>

            {/* AI生成 */}
            <AiGenerateSection
                systemPrompt={prompt}
                onSystemPromptChange={onPromptChange}
                onGenerate={handleAiGenerate}
                isGenerating={isGenerating}
                label="名前からAI生成"
            />
        </div>
    );
};

// --- 質問サブタブ ---
const QuestionsTab = ({ questions, components, onChange, prompt, onPromptChange }) => {
    const toast = window.useToast();
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [generateCount, setGenerateCount] = React.useState(10);
    const ConfirmModal = window.ConfirmModal;
    const [confirmClear, setConfirmClear] = React.useState(false);

    const componentNames = components.map(c => c.name).filter(n => n.trim());

    const createEmptyScores = () => {
        const scores = {};
        componentNames.forEach(name => { scores[name] = 0; });
        return scores;
    };

    const addQuestion = () => {
        onChange([...questions, {
            id: '',
            question_text: '',
            sort_order: questions.length + 1,
            scores: {
                yes: createEmptyScores(),
                slightly_yes: createEmptyScores(),
                slightly_no: createEmptyScores(),
                no: createEmptyScores(),
            },
        }]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const updateScore = (qIndex, answer, componentName, value) => {
        const updated = [...questions];
        const scores = { ...updated[qIndex].scores };
        scores[answer] = { ...scores[answer], [componentName]: parseInt(value) || 0 };
        updated[qIndex] = { ...updated[qIndex], scores };
        onChange(updated);
    };

    const removeQuestion = (index) => {
        onChange(questions.filter((_, i) => i !== index));
    };

    const clearAll = () => {
        setConfirmClear(false);
        onChange([]);
        toast.showSuccess('全質問を削除しました');
    };

    // AI生成: 成分データ + 問数から質問とスコアを生成（既存の質問は全削除して新規作成）
    const handleAiGenerate = ({ provider, model, systemPrompt }) => {
        if (componentNames.length === 0) {
            toast.showError('成分タブで成分を先に定義してください');
            return;
        }

        setIsGenerating(true);
        // 生成前に全削除
        onChange([]);

        fetch('/plugins/shindan/api/ai/generate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({
                type: 'question',
                provider,
                model,
                system_prompt: systemPrompt,
                user_prompt: `${generateCount}問の質問を生成してください。\n\n【成分】\n${componentNames.join(', ')}\n\n【スコアのキー】\nscoresオブジェクトのキーは必ず以下の成分名を使用: ${componentNames.join(', ')}`,
            }),
        })
            .then(res => res.json())
            .then(res => {
                if (res.success && Array.isArray(res.result)) {
                    const newQuestions = res.result.map((q, i) => ({
                        id: '',
                        question_text: q.question_text || '',
                        sort_order: i + 1,
                        scores: q.scores || { yes: createEmptyScores(), slightly_yes: createEmptyScores(), slightly_no: createEmptyScores(), no: createEmptyScores() },
                    }));
                    onChange(newQuestions);
                    toast.showSuccess(`${newQuestions.length}問を生成しました`);
                } else {
                    toast.showError(res.error || 'AI生成に失敗しました');
                }
                setIsGenerating(false);
            })
            .catch(() => {
                toast.showError('AI生成に失敗しました');
                setIsGenerating(false);
            });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">診断用の質問とスコア配分を設定します。（{questions.length}問）</p>
                {questions.length > 0 && (
                    <button
                        onClick={() => setConfirmClear(true)}
                        className="text-xs text-red-500 hover:text-red-700"
                    >
                        全クリア
                    </button>
                )}
            </div>

            {/* 質問一覧 */}
            {questions.map((q, qIndex) => (
                <div key={qIndex} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">質問 #{qIndex + 1}</span>
                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-500">
                                順序:
                                <input
                                    type="number"
                                    value={q.sort_order}
                                    onChange={(e) => updateQuestion(qIndex, 'sort_order', parseInt(e.target.value) || 0)}
                                    className="w-16 ml-1 rounded border border-slate-300 px-2 py-0.5 text-xs"
                                />
                            </label>
                            <button
                                onClick={() => removeQuestion(qIndex)}
                                className="text-xs text-red-500 hover:text-red-700"
                            >
                                削除
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">質問文</label>
                        <input
                            type="text"
                            value={q.question_text}
                            onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="例: 珍しい鳥の情報を聞くと、すぐに撮りに行きたくなる"
                        />
                    </div>

                    {/* スコア表（コンパクト） */}
                    {componentNames.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="text-xs border-collapse">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-1 text-left text-slate-500 font-medium"></th>
                                        {componentNames.map(name => (
                                            <th key={name} className="px-2 py-1 text-center text-slate-600 font-medium whitespace-nowrap">{name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { key: 'yes', label: 'はい' },
                                        { key: 'slightly_yes', label: 'ややそう' },
                                        { key: 'slightly_no', label: 'やや違う' },
                                        { key: 'no', label: 'いいえ' },
                                    ].map(({ key: answer, label }) => (
                                        <tr key={answer}>
                                            <td className="px-2 py-1 text-slate-500 font-medium whitespace-nowrap">
                                                {label}
                                            </td>
                                            {componentNames.map(name => (
                                                <td key={name} className="px-1 py-1">
                                                    <input
                                                        type="number"
                                                        min="-3"
                                                        max="3"
                                                        value={q.scores?.[answer]?.[name] || 0}
                                                        onChange={(e) => updateScore(qIndex, answer, name, e.target.value)}
                                                        className="w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}

            {/* 追加ボタン */}
            <button
                onClick={addQuestion}
                className="w-full rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
                + 質問を追加
            </button>

            {/* AI生成 */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600">生成する問数:</label>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
                    />
                </div>
                <AiGenerateSection
                    systemPrompt={prompt}
                    onSystemPromptChange={onPromptChange}
                    onGenerate={handleAiGenerate}
                    isGenerating={isGenerating}
                    label="質問をAI生成"
                />
            </div>

            {/* 全クリア確認モーダル */}
            {confirmClear && ConfirmModal && (
                <ConfirmModal
                    title="全質問を削除"
                    message={`${questions.length}問すべてを削除しますか？この操作は保存前なら取り消せます。`}
                    onConfirm={clearAll}
                    onCancel={() => setConfirmClear(false)}
                />
            )}
        </div>
    );
};

// --- 野鳥サブタブ ---
const BirdsTab = ({ birds, components, onChange, prompt, onPromptChange }) => {
    const toast = window.useToast();
    const [isGenerating, setIsGenerating] = React.useState(null); // 生成中の鳥のindex
    const [mediaSelecting, setMediaSelecting] = React.useState(null); // メディア選択中の鳥のindex
    const [croppingBird, setCroppingBird] = React.useState(null); // 切り抜き中の鳥のindex

    const [aiProvider, setAiProvider] = React.useState('');
    const [aiModel, setAiModel] = React.useState('');
    const [showTagImport, setShowTagImport] = React.useState(false);
    const [availableTags, setAvailableTags] = React.useState([]);
    const [selectedTags, setSelectedTags] = React.useState([]);
    const [tagsLoading, setTagsLoading] = React.useState(false);

    const componentNames = components.map(c => c.name).filter(n => n.trim());

    // タグ一覧を取得してインポートダイアログを開く
    const openTagImport = () => {
        setTagsLoading(true);
        setShowTagImport(true);
        fetch('/api/media/?per_page=1')
            .then(res => res.json())
            .then(res => {
                const tags = res.tags || [];
                const existingNames = new Set(birds.map(b => b.name.trim()));
                const filtered = tags.filter(t => !existingNames.has(t));
                setAvailableTags(filtered);
                setSelectedTags(filtered.map(() => true));
                setTagsLoading(false);
            })
            .catch(() => {
                toast.showError('タグの取得に失敗しました');
                setShowTagImport(false);
                setTagsLoading(false);
            });
    };

    // 選択したタグを野鳥として一括追加
    const importSelectedTags = () => {
        const tagsToImport = availableTags.filter((_, i) => selectedTags[i]);
        if (tagsToImport.length === 0) {
            toast.showError('タグが選択されていません');
            return;
        }
        const newBirds = tagsToImport.map(name => ({
            id: '',
            name,
            description: '',
            media_id: '',
            crop: { center_x: 50, center_y: 50, zoom: 100 },
            scores: (() => { const s = {}; componentNames.forEach(n => { s[n] = 5; }); return s; })(),
            card_processed_at: 0,
        }));
        onChange([...birds, ...newBirds]);
        setShowTagImport(false);
        toast.showSuccess(`${tagsToImport.length}件の野鳥を追加しました`);
    };

    const addBird = () => {
        onChange([...birds, {
            id: '',
            name: '',
            description: '',
            media_id: '',
            crop: { center_x: 50, center_y: 50, zoom: 100 },
            scores: (() => { const s = {}; componentNames.forEach(n => { s[n] = 5; }); return s; })(),
            card_processed_at: 0,
        }]);
    };

    const updateBird = (index, field, value) => {
        const updated = [...birds];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeBird = (index) => {
        onChange(birds.filter((_, i) => i !== index));
    };

    // メディア選択完了
    const handleMediaSelect = (media) => {
        if (mediaSelecting !== null && media && media.id) {
            updateBird(mediaSelecting, 'media_id', media.id);
        }
        setMediaSelecting(null);
    };

    // AI生成: 鳥名からパラメータ + 説明文を生成
    // 1羽分のAI生成（Promise を返す）
    const generateOneBird = (birdIndex, { provider, model, systemPrompt }, currentBirds) => {
        const bird = currentBirds[birdIndex];
        setIsGenerating(birdIndex);
        return fetch('/plugins/shindan/api/ai/generate/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({
                type: 'bird',
                provider,
                model,
                system_prompt: systemPrompt,
                user_prompt: `鳥名: ${bird.name}\n\n【成分】\n${componentNames.join(', ')}\n\nscoresオブジェクトのキーは必ず以下の成分名を使用: ${componentNames.join(', ')}`,
            }),
        })
            .then(res => res.json())
            .then(res => {
                if (res.success && res.result) {
                    const updated = [...currentBirds];
                    if (res.result.scores) updated[birdIndex].scores = res.result.scores;
                    if (res.result.description) updated[birdIndex].description = res.result.description;
                    onChange(updated);
                    toast.showSuccess(`${bird.name}のパラメータを生成しました`);
                    return updated;
                } else {
                    toast.showError(`${bird.name}: ${res.error || 'AI生成に失敗しました'}`);
                    return currentBirds;
                }
            })
            .catch(() => {
                toast.showError(`${bird.name}: AI生成に失敗しました`);
                return currentBirds;
            });
    };

    // 単体 or 複数の鳥をAI生成
    const handleAiGenerate = (birdIndex, opts) => {
        generateOneBird(birdIndex, opts, birds).then(() => setIsGenerating(null));
    };

    const handleAiGenerateBatch = (targets, opts) => {
        let chain = Promise.resolve(birds);
        for (const t of targets) {
            chain = chain.then(currentBirds => generateOneBird(t.index, opts, currentBirds));
        }
        chain
            .then(() => toast.showSuccess('全件のAI生成が完了しました'))
            .catch(() => {})
            .finally(() => setIsGenerating(null));
    };

    const MediaSelector = window.MediaSelector;

    return (
        <div className="space-y-4">
            <p className="text-xs text-slate-500">結果で表示される野鳥を登録します。</p>

            {/* 野鳥一覧 */}
            {birds.map((bird, bIndex) => (
                <div key={bIndex} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">野鳥 #{bIndex + 1}</span>
                        <button
                            onClick={() => removeBird(bIndex)}
                            className="text-xs text-red-500 hover:text-red-700"
                        >
                            削除
                        </button>
                    </div>

                    {/* 名前 + 写真 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">名前</label>
                            <input
                                type="text"
                                value={bird.name}
                                onChange={(e) => updateBird(bIndex, 'name', e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="例: カワセミ"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">写真</label>
                            <div className="flex items-center gap-2">
                                {bird.media_id ? (
                                    <MediaThumbnail mediaId={bird.media_id} crop={bird.crop} />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                        未選択
                                    </div>
                                )}
                                <button
                                    onClick={() => setMediaSelecting(bIndex)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    {bird.media_id ? '変更' : '選択'}
                                </button>
                                {bird.media_id && (
                                    <button
                                        onClick={() => setCroppingBird(bIndex)}
                                        className="text-xs text-slate-500 hover:text-blue-600"
                                    >
                                        切り抜き
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 説明文 */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">説明文</label>
                        <textarea
                            value={bird.description}
                            onChange={(e) => updateBird(bIndex, 'description', e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* 成分パラメータ */}
                    {componentNames.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">成分パラメータ（1〜10）</label>
                            <div className="flex flex-wrap gap-2">
                                {componentNames.map(name => (
                                    <div key={name} className="flex items-center gap-1">
                                        <span className="text-xs text-slate-500 whitespace-nowrap">{name}:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={bird.scores?.[name] || 5}
                                            onChange={(e) => {
                                                const scores = { ...bird.scores, [name]: parseInt(e.target.value) || 5 };
                                                updateBird(bIndex, 'scores', scores);
                                            }}
                                            className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 個別AI生成ボタン */}
                    <button
                        onClick={() => handleAiGenerate(bIndex, { provider: aiProvider, model: aiModel, systemPrompt: prompt })}
                        disabled={isGenerating !== null || !bird.name.trim() || !aiProvider || !aiModel}
                        className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isGenerating === bIndex ? '生成中...' : 'この鳥をAI生成'}
                    </button>
                </div>
            ))}

            {/* 追加ボタン */}
            <div className="flex gap-2">
                <button
                    onClick={addBird}
                    className="flex-1 rounded-lg border-2 border-dashed border-slate-300 py-3 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                    + 野鳥を追加
                </button>
                <button
                    onClick={openTagImport}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                >
                    タグから追加
                </button>
            </div>

            {/* タグインポートダイアログ */}
            {showTagImport && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) setShowTagImport(false); }}
                >
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                        <h3 className="text-lg font-semibold text-slate-800">メディアタグから野鳥を追加</h3>
                        {tagsLoading ? (
                            <p className="text-sm text-slate-500">読み込み中...</p>
                        ) : availableTags.length === 0 ? (
                            <p className="text-sm text-slate-500">追加可能なタグがありません（すべて登録済み、またはタグなし）</p>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500">{availableTags.length}件のタグ（登録済みの鳥名は除外）</p>
                                    <button
                                        onClick={() => {
                                            const allSelected = selectedTags.every(Boolean);
                                            setSelectedTags(availableTags.map(() => !allSelected));
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                        {selectedTags.every(Boolean) ? '全解除' : '全選択'}
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {availableTags.map((tag, i) => (
                                        <label key={tag} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedTags[i] || false}
                                                onChange={() => {
                                                    const next = [...selectedTags];
                                                    next[i] = !next[i];
                                                    setSelectedTags(next);
                                                }}
                                                className="rounded border-slate-300"
                                            />
                                            <span className="text-sm text-slate-700">{tag}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowTagImport(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                                キャンセル
                            </button>
                            {availableTags.length > 0 && (
                                <button
                                    onClick={importSelectedTags}
                                    disabled={!selectedTags.some(Boolean)}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {selectedTags.filter(Boolean).length}件を追加
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* AI生成セクション（共通プロバイダー・モデル選択） */}
            <AiGenerateSection
                systemPrompt={prompt}
                onSystemPromptChange={onPromptChange}
                provider={aiProvider}
                model={aiModel}
                onProviderChange={setAiProvider}
                onModelChange={setAiModel}
                onGenerate={({ provider, model, systemPrompt: sp }) => {
                    const targets = birds.map((b, i) => ({ bird: b, index: i })).filter(({ bird }) => bird.name.trim() && !bird.description);
                    if (targets.length === 0) {
                        toast.showError('名前が入力済みで説明文が空の鳥がありません');
                        return;
                    }
                    handleAiGenerateBatch(targets, { provider, model, systemPrompt: sp });
                }}
                isGenerating={isGenerating !== null}
                label="未生成の鳥をAI生成"
            />

            {/* メディア選択ダイアログ */}
            {mediaSelecting !== null && MediaSelector && ReactDOM.createPortal(
                <MediaSelector
                    csrfToken={getCsrfToken()}
                    selectionMode="single"
                    allowedTypes={['photo', 'image']}
                    onConfirm={handleMediaSelect}
                    onCancel={() => setMediaSelecting(null)}
                    initialSelectedIds={birds[mediaSelecting]?.media_id ? [birds[mediaSelecting].media_id] : []}
                />,
                document.body
            )}

            {/* 丸型切り抜きダイアログ */}
            {croppingBird !== null && (
                <CropDialog
                    mediaId={birds[croppingBird].media_id}
                    crop={birds[croppingBird].crop}
                    onSave={(crop) => {
                        updateBird(croppingBird, 'crop', crop);
                        setCroppingBird(null);
                    }}
                    onCancel={() => setCroppingBird(null)}
                />
            )}
        </div>
    );
};

// --- 画像サイズ取得ヘルパー ---
const useImageWithSize = (url) => {
    const [size, setSize] = React.useState(null);
    React.useEffect(() => {
        if (!url) { setSize(null); return; }
        const img = new Image();
        img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;
    }, [url]);
    return size;
};

// コンテナサイズに対するcoverスケールで画像を配置するstyleを計算
const computeCropStyle = (imgSize, containerSize, cx, cy, zoom) => {
    if (!imgSize) return {};
    const coverScale = Math.max(containerSize / imgSize.w, containerSize / imgSize.h);
    const scale = coverScale * (zoom / 100);
    const w = imgSize.w * scale;
    const h = imgSize.h * scale;
    return {
        position: 'absolute',
        width: `${w}px`,
        height: `${h}px`,
        maxWidth: 'none',
        left: `${-(w - containerSize) * (cx / 100)}px`,
        top: `${-(h - containerSize) * (cy / 100)}px`,
    };
};

// --- メディアサムネイル ---
// 丸型切り抜きプレビュー
const MediaThumbnail = ({ mediaId, crop }) => {
    const [url, setUrl] = React.useState('');

    React.useEffect(() => {
        if (!mediaId) return;
        fetch(`/api/media/${mediaId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.urls) setUrl(data.urls.icon || data.urls.low || '');
            })
            .catch(() => {});
    }, [mediaId]);

    const imgSize = useImageWithSize(url);

    if (!url) return <div className="w-12 h-12 rounded-full bg-slate-200" />;

    const cx = crop?.center_x || 50;
    const cy = crop?.center_y || 50;
    const zoom = crop?.zoom || 100;
    const style = computeCropStyle(imgSize, 48, cx, cy, zoom);

    return (
        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-300" style={{ position: 'relative' }}>
            <img src={url} alt="" style={style} />
        </div>
    );
};

// --- 丸型切り抜きダイアログ ---
const CropDialog = ({ mediaId, crop, onSave, onCancel }) => {
    const [url, setUrl] = React.useState('');
    const [centerX, setCenterX] = React.useState(crop?.center_x || 50);
    const [centerY, setCenterY] = React.useState(crop?.center_y || 50);
    const [zoom, setZoom] = React.useState(crop?.zoom || 100);

    React.useEffect(() => {
        if (!mediaId) return;
        fetch(`/api/media/${mediaId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.urls) setUrl(data.urls.mid || data.urls.low || '');
            })
            .catch(() => {});
    }, [mediaId]);

    const imgSize = useImageWithSize(url);
    const containerSize = 192;
    const previewStyle = computeCropStyle(imgSize, containerSize, centerX, centerY, zoom);
    const dragRef = React.useRef(null);

    // ドラッグでピクセル移動量 → centerX/centerY(%) に変換
    const applyDrag = React.useCallback((dx, dy) => {
        if (!imgSize) return;
        const coverScale = Math.max(containerSize / imgSize.w, containerSize / imgSize.h);
        const scale = coverScale * (zoom / 100);
        const w = imgSize.w * scale;
        const h = imgSize.h * scale;
        const rangeX = w - containerSize;
        const rangeY = h - containerSize;
        setCenterX(prev => Math.max(0, Math.min(100, prev - (rangeX > 0 ? dx / rangeX * 100 : 0))));
        setCenterY(prev => Math.max(0, Math.min(100, prev - (rangeY > 0 ? dy / rangeY * 100 : 0))));
    }, [imgSize, zoom, containerSize]);

    // マウスドラッグ
    const handleMouseDown = (e) => {
        e.preventDefault();
        dragRef.current = { x: e.clientX, y: e.clientY };
        const handleMouseMove = (e) => {
            const dx = e.clientX - dragRef.current.x;
            const dy = e.clientY - dragRef.current.y;
            dragRef.current = { x: e.clientX, y: e.clientY };
            applyDrag(dx, dy);
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // タッチドラッグ
    const handleTouchStart = (e) => {
        const t = e.touches[0];
        dragRef.current = { x: t.clientX, y: t.clientY };
        const handleTouchMove = (e) => {
            const t = e.touches[0];
            const dx = t.clientX - dragRef.current.x;
            const dy = t.clientY - dragRef.current.y;
            dragRef.current = { x: t.clientX, y: t.clientY };
            applyDrag(dx, dy);
        };
        const handleTouchEnd = () => {
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd);
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
        >
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">写真切り抜き</h3>

                {/* プレビュー（ドラッグで位置調整） */}
                <div className="flex justify-center">
                    <div
                        className="w-48 h-48 rounded-full overflow-hidden border-2 border-slate-300 bg-slate-100"
                        style={{ position: 'relative', cursor: 'grab', userSelect: 'none' }}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleTouchStart}
                    >
                        {url && (
                            <img src={url} alt="プレビュー" style={{ ...previewStyle, pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
                        )}
                    </div>
                </div>
                <p className="text-xs text-slate-400 text-center">ドラッグで位置を調整</p>

                {/* ズームスライダー */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ズーム: {zoom}%</label>
                    <input type="range" min="100" max="300" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))} className="w-full" />
                </div>

                {/* ボタン */}
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                        キャンセル
                    </button>
                    <button
                        onClick={() => onSave({ center_x: centerX, center_y: centerY, zoom })}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        適用
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// グローバル登録
window.PluginSettings = window.PluginSettings || {};
window.PluginSettings.shindan = ShindanSettings;

})();
