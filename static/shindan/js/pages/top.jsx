// 野鳥撮影者タイプ診断 — 公開ページ
// 開始画面 → 質問フロー → 結果表示 をReactで管理するSPA
(function() {

const { useState, useEffect, useRef, useCallback } = React;

// --- データ・設定の読み込み ---
const shindanData = JSON.parse(document.getElementById('shindan-data').textContent);
const config = window.SHINDAN_CONFIG;
const { components, questions, birds } = shindanData;

// 回答選択肢
const CHOICES = [
    { key: 'yes', label: 'はい' },
    { key: 'slightly_yes', label: 'ややそう' },
    { key: 'slightly_no', label: 'やや違う' },
    { key: 'no', label: 'いいえ' },
];

// --- ユーティリティ ---

// 画像の実サイズを取得するフック
const useImageSize = (url) => {
    const [size, setSize] = useState(null);
    useEffect(() => {
        if (!url) { setSize(null); return; }
        const img = new Image();
        img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;
    }, [url]);
    return size;
};

// コンテナサイズに対する cover スケールで画像を配置するスタイルを計算
// NOTE: 管理画面の computeCropStyle と同一ロジック
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

// --- AdSlot コンポーネント ---
const AdSlot = () => {
    const ref = useRef(null);

    useEffect(() => {
        if (!config.adsensePublisherId || !config.adUnitId) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            // AdSense エラーは無視
        }
    }, []);

    // 管理者プレビュー
    if (config.adPreview) {
        return (
            <div className="shindan-ad-slot shindan-ad-slot--preview">
                <span>広告</span>
            </div>
        );
    }

    if (!config.adsensePublisherId || !config.adUnitId) return null;

    return (
        <div className="shindan-ad-slot">
            <ins className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={config.adsensePublisherId}
                data-ad-slot={config.adUnitId}
                data-ad-format="horizontal"
                ref={ref}
            />
        </div>
    );
};

// --- 開始画面 ---
const StartScreen = ({ onStart }) => {
    return (
        <div className="shindan-start">
            <AdSlot key="ad-start" />
            {config.topImageUrl ? (
                <img className="shindan-start__image" src={config.topImageUrl} alt="" />
            ) : (
                <div className="shindan-start__icon">🐦</div>
            )}
            <h1 className="shindan-start__title">{config.title || 'AIとりや成分診断'}</h1>
            <p className="shindan-start__description">
                {config.description || `約${questions.length}問の質問に答えて、あなたの野鳥撮影スタイルを診断！あなたに似た野鳥も見つかります。`}
            </p>
            <p className="shindan-start__meta">所要時間：約3分</p>
            <button className="shindan-start-btn" onClick={onStart}>
                診断スタート
            </button>
            {config.siteUrl && (
                <a className="shindan-start__site-link" href={config.siteUrl}>
                    {config.siteTitle || 'サイト'} HOMEへ →
                </a>
            )}
        </div>
    );
};

// --- プログレスバー ---
const ProgressBar = ({ current, total }) => {
    const percent = ((current + 1) / total) * 100;
    return (
        <div className="shindan-progress">
            <div className="shindan-progress__label">
                <span className="shindan-progress__current">Q{current + 1}</span>
                <span className="shindan-progress__count">{current + 1} / {total}</span>
            </div>
            <div className="shindan-progress__bar">
                <div className="shindan-progress__fill" style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
};

// --- 質問カード ---
const QuestionCard = ({ question, onAnswer, animKey }) => {
    return (
        <div className="shindan-qcard shindan-qcard--enter" key={animKey}>
            <p className="shindan-qcard__text">{question.question_text}</p>
            <div className="shindan-choices">
                {CHOICES.map(choice => (
                    <button
                        key={choice.key}
                        className="shindan-choice-btn"
                        onClick={() => onAnswer(choice.key)}
                    >
                        {choice.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- 質問画面 ---
const QuestionScreen = ({ currentQuestion, onAnswer }) => {
    const question = questions[currentQuestion];
    return (
        <div className="shindan-question">
            <AdSlot key={`ad-question-${Math.floor(currentQuestion / 3)}`} />
            <ProgressBar current={currentQuestion} total={questions.length} />
            <QuestionCard
                question={question}
                onAnswer={onAnswer}
                animKey={currentQuestion}
            />
        </div>
    );
};

// --- ローディング画面 ---
const LoadingScreen = () => {
    return (
        <div className="shindan-loading">
            <div className="shindan-loading__spinner" />
            <p className="shindan-loading__text">結果を分析中...</p>
        </div>
    );
};

// --- 鳥アバター（丸型切り抜き） ---
const BirdAvatar = ({ bird, size }) => {
    const imgSize = useImageSize(bird.media_url);
    const cx = bird.crop?.center_x ?? 50;
    const cy = bird.crop?.center_y ?? 50;
    const zoom = bird.crop?.zoom ?? 100;
    const style = computeCropStyle(imgSize, size, cx, cy, zoom);

    return (
        <div className="shindan-bird-card__avatar" style={{ width: `${size}px`, height: `${size}px` }}>
            {bird.media_url && (
                <img src={bird.media_url} alt={bird.name} style={style} />
            )}
        </div>
    );
};

// --- レーダーチャート ラベルボタン風プラグイン ---
const radarLabelPlugin = {
    id: 'radarLabelButtons',
    afterDraw(chart) {
        const scale = chart.scales.r;
        if (!scale) return;
        const ctx = chart.ctx;
        const labels = chart.data.labels;
        for (let i = 0; i < labels.length; i++) {
            const lp = scale.getPointLabelPosition(i);
            const cx = (lp.left + lp.right) / 2;
            const cy = (lp.top + lp.bottom) / 2;
            const w = (lp.right - lp.left) + 16;
            const h = (lp.bottom - lp.top) + 8;
            const r = h / 2;
            // ピル型背景
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            // テキスト再描画
            ctx.save();
            ctx.font = '600 12px "Noto Sans JP"';
            ctx.fillStyle = '#64748b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[i], cx, cy);
            ctx.restore();
        }
    },
};

// --- レーダーチャート ---
const RadarChart = ({ scores, onLabelClick, onRetry }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    const onLabelClickRef = useRef(onLabelClick);
    onLabelClickRef.current = onLabelClick;

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }
        const labels = components.map(c => c.name);
        const data = components.map(c => scores[c.name] || 0);

        const hitTestLabel = (e, chart) => {
            const scale = chart.scales.r;
            const pos = Chart.helpers.getRelativePosition(e, chart);
            for (let i = 0; i < labels.length; i++) {
                const lp = scale.getPointLabelPosition(i);
                const dx = pos.x - lp.left - (lp.right - lp.left) / 2;
                const dy = pos.y - lp.top - (lp.bottom - lp.top) / 2;
                if (Math.abs(dx) < 40 && Math.abs(dy) < 16) return i;
            }
            return -1;
        };

        chartRef.current = new Chart(canvasRef.current, {
            type: 'radar',
            plugins: [radarLabelPlugin],
            data: {
                labels: labels,
                datasets: [{
                    label: 'あなたのスコア',
                    data: data,
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    borderColor: 'rgba(37, 99, 235, 0.8)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                    pointRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: false,
                layout: { padding: 8 },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20, display: false },
                        grid: { color: 'rgba(0,0,0,0.06)' },
                        angleLines: { color: 'rgba(0,0,0,0.06)' },
                        pointLabels: {
                            font: { size: 12, family: 'Noto Sans JP', weight: '600' },
                            color: 'transparent',
                            padding: 8,
                        },
                    },
                },
                plugins: {
                    legend: { display: false },
                    radarLabelButtons: {},
                },
                onClick: (e, elements, chart) => {
                    const idx = hitTestLabel(e, chart);
                    if (idx >= 0 && onLabelClickRef.current) {
                        onLabelClickRef.current(components[idx]);
                    }
                },
                onHover: (e, elements, chart) => {
                    const idx = hitTestLabel(e, chart);
                    chart.canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
                },
            },
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [scores]);

    return (
        <div className="shindan-radar">
            <h2 className="shindan-radar__title">あなたの成分</h2>
            <div className="shindan-radar__canvas-wrap">
                <canvas ref={canvasRef} />
            </div>
            {onRetry && (
                <div className="shindan-radar__footer">
                    <button className="shindan-retry-btn" onClick={onRetry}>
                        もう一度診断する
                    </button>
                </div>
            )}
        </div>
    );
};

// --- 成分詳細ポップアップ ---
const ComponentPopup = ({ component, onClose }) => {
    // オーバーレイクリックで閉じる
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="shindan-overlay" onClick={handleOverlayClick}>
            <div className="shindan-popup">
                <h3 className="shindan-popup__title">{component.name}</h3>
                <p className="shindan-popup__description">{component.description}</p>
                {component.positive && (
                    <div className="shindan-popup__section">
                        <p className="shindan-popup__section-label">ポジティブな面</p>
                        <p className="shindan-popup__section-text">{component.positive}</p>
                    </div>
                )}
                {component.negative && (
                    <div className="shindan-popup__section">
                        <p className="shindan-popup__section-label">ネガティブな面</p>
                        <p className="shindan-popup__section-text">{component.negative}</p>
                    </div>
                )}
                <button className="shindan-popup__close" onClick={onClose}>閉じる</button>
            </div>
        </div>
    );
};

// --- 鳥説明ポップアップ ---
const BirdPopup = ({ bird, onClose }) => {
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="shindan-overlay" onClick={handleOverlayClick}>
            <div className="shindan-popup">
                <h3 className="shindan-popup__title">{bird.name}</h3>
                <p className="shindan-popup__description">{bird.description}</p>
                <button className="shindan-popup__close" onClick={onClose}>閉じる</button>
            </div>
        </div>
    );
};

// --- 結果画面 ---
const ResultScreen = ({ result, onRetry }) => {
    const [selectedComponent, setSelectedComponent] = useState(null);
    const [showBirdPopup, setShowBirdPopup] = useState(false);
    const { scores, bird, similarity } = result;

    return (
        <div className="shindan-result">
            {/* トップ画像 + タイトル */}
            {config.topImageUrl && (
                <img className="shindan-result__image" src={config.topImageUrl} alt="" />
            )}
            <h1 className="shindan-result__title">{config.title || 'AIとりや成分診断'} 結果</h1>

            {/* 鳥 + レーダーチャート 統合カード */}
            <div className="shindan-result-card">
                <p className="shindan-result-card__label">あなたに似ている鳥</p>
                <div className="shindan-result-card__bird">
                    <BirdAvatar bird={bird} size={96} />
                    <h2 className="shindan-result-card__name">
                        {bird.name}
                        {bird.description && (
                            <button
                                className="shindan-result-card__info-btn"
                                onClick={() => setShowBirdPopup(true)}
                                title="この鳥について"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                </svg>
                            </button>
                        )}
                    </h2>
                </div>
                <RadarChart scores={scores} onLabelClick={(comp) => setSelectedComponent(comp)} onRetry={onRetry} />
            </div>

            {/* サイトリンク */}
            {config.siteUrl && (
                <a className="shindan-start__site-link" href={config.siteUrl} style={{ display: 'flex', justifyContent: 'center' }}>
                    {config.siteTitle || 'サイト'} HOMEへ →
                </a>
            )}

            {/* 成分詳細ポップアップ */}
            {selectedComponent && (
                <ComponentPopup
                    component={selectedComponent}
                    onClose={() => setSelectedComponent(null)}
                />
            )}

            {/* 鳥説明ポップアップ */}
            {showBirdPopup && bird.description && (
                <BirdPopup bird={bird} onClose={() => setShowBirdPopup(false)} />
            )}
        </div>
    );
};

// --- メインアプリ ---
const ShindanApp = () => {
    const [phase, setPhase] = useState('start');
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);

    // 診断開始
    const handleStart = useCallback(() => {
        setPhase('question');
        setCurrentQuestion(0);
        setAnswers({});
        setResult(null);
        history.pushState(null, '', '/plugins/shindan/q/1/');
        window.scrollTo(0, 0);
    }, []);

    // 回答処理
    const handleAnswer = useCallback((choiceKey) => {
        const question = questions[currentQuestion];
        const newAnswers = { ...answers, [question.id]: choiceKey };
        setAnswers(newAnswers);

        const nextIndex = currentQuestion + 1;
        if (nextIndex < questions.length) {
            // 次の質問へ
            setCurrentQuestion(nextIndex);
            history.pushState(null, '', `/plugins/shindan/q/${nextIndex + 1}/`);
            window.scrollTo(0, 0);
        } else {
            // 全問回答 → 結果取得
            submitAnswers(newAnswers);
        }
    }, [currentQuestion, answers]);

    // 結果API呼び出し
    const submitAnswers = async (allAnswers) => {
        setPhase('loading');
        history.pushState(null, '', '/plugins/shindan/result/');
        window.scrollTo(0, 0);

        try {
            const response = await fetch('/plugins/shindan/api/result/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': config.csrfToken,
                },
                body: JSON.stringify({ answers: allAnswers }),
            });
            const data = await response.json();
            if (data.success) {
                // マッチした鳥の詳細をクライアントデータから取得
                const matchedBird = birds.find(b => b.id === data.bird.id);
                setResult({
                    scores: data.scores,
                    bird: matchedBird || { id: data.bird.id, name: data.bird.name },
                    similarity: data.similarity,
                });
                setPhase('result');
            } else {
                setPhase('start');
                history.replaceState(null, '', '/plugins/shindan/');
            }
        } catch (e) {
            setPhase('start');
            history.replaceState(null, '', '/plugins/shindan/');
        }
    };

    // もう一度
    const handleRetry = useCallback(() => {
        setPhase('start');
        setCurrentQuestion(0);
        setAnswers({});
        setResult(null);
        history.pushState(null, '', '/plugins/shindan/');
        window.scrollTo(0, 0);
    }, []);

    // ブラウザバック対応
    useEffect(() => {
        const handlePopState = () => {
            const path = location.pathname;
            const qMatch = path.match(/\/plugins\/shindan\/q\/(\d+)\//);
            if (qMatch) {
                const idx = parseInt(qMatch[1]) - 1;
                if (idx >= 0 && idx < questions.length) {
                    setPhase('question');
                    setCurrentQuestion(idx);
                    return;
                }
            }
            if (path.includes('/plugins/shindan/result/') && result) {
                setPhase('result');
                return;
            }
            // デフォルト: トップに戻る
            setPhase('start');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [result]);

    return (
        <div className="shindan-container">
            {phase === 'start' && <StartScreen onStart={handleStart} />}
            {phase === 'question' && (
                <QuestionScreen
                    currentQuestion={currentQuestion}
                    onAnswer={handleAnswer}
                />
            )}
            {phase === 'loading' && <LoadingScreen />}
            {phase === 'result' && result && (
                <ResultScreen result={result} onRetry={handleRetry} />
            )}
        </div>
    );
};

// --- マウント ---
const root = ReactDOM.createRoot(document.getElementById('shindan-root'));
root.render(<ShindanApp />);

})();
