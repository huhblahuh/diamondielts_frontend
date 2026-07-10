import React, { useState, useRef, useEffect, useCallback } from 'react';
import s from './AttemptDetailView.module.css';

const HL_CLASSES = {
    fluency: 'hlFluency', lexical: 'hlLexical',
    grammar: 'hlGrammar', pronun: 'hlPronun',
};

const CAT_CLASSES = {
    fluency: 'catFluency', lexical: 'catLexical',
    grammar: 'catGrammar', pronun: 'catPronun', suggest: 'catSuggest',
};

const CAT_LABELS = {
    fluency: 'Lỗi Lưu loát', lexical: 'Lỗi Từ vựng',
    grammar: 'Lỗi Ngữ pháp', pronun: 'Lỗi Phát âm',
};

// ── helpers ──
const pct = (v) => ((v ?? 0) / 9 * 100).toFixed(2);
const escHtml = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escRe = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (str) => (str || '').trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
const fmtTime = (sec) => {
    if (!sec || !isFinite(sec)) return '0:00';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

// Parse tagged_fix string -> [{wrong, right, description}]
function parseTaggedFix(taggedFix) {
    if (!taggedFix) return [];
    const issues = [];
    const re = /\[([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/g;
    let match;
    while ((match = re.exec(taggedFix)) !== null) {
        const wrong = match[1].trim();
        const right = match[2].trim();
        const description = match[3].trim();
        if (wrong) {
            issues.push({
                wrong,
                right,
                description
            });
        }
    }
    return issues;
}

// ── Extract issues from results ──
function getIssues(results, cat) {
    if (cat === 'fluency') return results?.fluency_coherence?.issues || [];
    if (cat === 'lexical') {
        const issues = results?.lexical_resource?.issues || [];
        if (issues.length > 0) return issues;
        return parseTaggedFix(results?.lexical_resource?.tagged_fix);
    }
    if (cat === 'grammar') {
        const issues = results?.grammar?.issues || [];
        if (issues.length > 0) return issues;
        return parseTaggedFix(results?.grammar?.tagged_fix);
    }
    return [];
}

function getLowWords(results) {
    return results?.pronunciationReport?.low_words || [];
}

function getPronWords(results) {
    const words = results?.pronunciationReport?.words || [];
    if (words.length > 0) return words;
    return getLowWords(results).map(w => ({
        ...w,
        effectiveAccuracyScore: w.accuracyScore,
        isLowAccuracy: true,
        expectedIpa: (w.phonemes || []).map(ph => ph.phoneme).join(' '),
        spokenIpa: (w.phonemes || []).map(ph => ph.spokenPhoneme || ph.phoneme).join(' ')
    }));
}

const wordTone = (score = 0, lowConfidence = false) => {
    if (lowConfidence) return 'pronWordNeutral';
    if (score > 70) return 'pronWordGood';
    if (score >= 50) return 'pronWordOk';
    return 'pronWordWeak';
};

const getPhonemeTone = (ph) => {
    const expected = ph?.phoneme || '';
    const spoken = ph?.spokenPhoneme || expected;
    const score = ph?.accuracyScore ?? ph?.spokenScore ?? 100;
    if (spoken !== expected || score < 50) return 'phonemeInlineBad';
    if (score <= 70) return 'phonemeInlineWarn';
    return 'phonemeInlineGood';
};

// ── TTS ──
function speakWord(word) {
    if (!('speechSynthesis' in window)) return;
    const clean = (word || '').replace(/[^\w'\-\s]/g, '').trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices() || [];
    const v = voices.find(x => (x.lang || '').startsWith('en-US')) || voices.find(x => (x.lang || '').startsWith('en')) || voices[0];
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-US'; }
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
}

// ══════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════
export default function AttemptDetailView({ results, onBack }) {
    const [activeTab, setActiveTab] = useState('lexical'); // Để mặc định là lexical như mẫu của user
    const [selectedIssue, setSelectedIssue] = useState(null); // { cat, wrong, right, desc, idx }
    const [popover, setPopover] = useState(null); // Chỉ dùng cho suggest / pronun nếu cần dịch nhanh
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [curTime, setCurTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const transcriptRef = useRef(null);

    // Tự động chọn issue đầu tiên khi đổi tab hoặc khi results thay đổi
    useEffect(() => {
        const issues = getIssues(results, activeTab);
        if (issues && issues.length > 0) {
            const first = issues[0];
            setSelectedIssue({ cat: activeTab, wrong: first.wrong, right: first.right, desc: first.description, idx: 0 });
        } else if (activeTab === 'suggest' && results?.vocabulary_boost?.length > 0) {
            const first = results.vocabulary_boost[0];
            setSelectedIssue({ cat: 'suggest', wrong: '', right: first.expression, desc: first.meaning_vi, idx: 0, item: first });
        } else if (activeTab === 'pronun' && getPronWords(results).length > 0) {
            const weak = getPronWords(results).find(w => w.isLowAccuracy && !w.isLowConfidence);
            const first = weak || getPronWords(results)[0];
            setSelectedIssue({ cat: 'pronun', wrong: first.word, right: '', desc: '', idx: first.id, word: first });
        } else {
            setSelectedIssue(null);
        }
        setPopover(null);
    }, [activeTab, results]);

    if (!results) return null;

    const getSuggestedVocab = () => {
        const suggestion = results.suggestion_answer || '';
        const list = [];
        const regex = /\[(.*?)\|(.*?)\]/g;
        let match;
        while ((match = regex.exec(suggestion)) !== null) {
            const word = match[1].trim();
            const definition = match[2].trim();
            if (word && !list.some(item => item.word.toLowerCase() === word.toLowerCase())) {
                list.push({ word, definition });
            }
        }
        return list;
    };

    // ── scores ──
    const fluScore = results.fluency_coherence?.score ?? 0;
    const lexicalScore = results.lexical_resource?.score ?? 0;
    const grammarScore = results.grammar?.score ?? 0;
    const pronunciationScoreRaw = results.pronunciationReport?.overall?.pronunciationScore ?? 0;
    const pronunciationScore = pronunciationScoreRaw;
    const overall = results.overallScore ?? ((fluScore + lexicalScore + grammarScore + pronunciationScore) / 4);

    // ── audio handlers ──
    const togglePlay = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) a.play(); else a.pause();
    };

    const onTimeUpdate = () => {
        const a = audioRef.current;
        if (a) setCurTime(a.currentTime);
    };

    const onLoadedMeta = () => {
        const a = audioRef.current;
        if (a) setDuration(a.duration);
    };

    const seekAudio = (val) => {
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = val;
        setCurTime(val);
    };

    const playSegment = (start, end) => {
        const a = audioRef.current;
        if (!a) return;
        a.currentTime = Math.max(0, start);
        a.play();
        if (end) {
            const stopHandler = () => {
                if (a.currentTime >= end) {
                    a.pause();
                    a.removeEventListener('timeupdate', stopHandler);
                }
            };
            a.addEventListener('timeupdate', stopHandler);
        }
    };

    // ── build transcript HTML ──
    const buildTranscriptHtml = () => {
        const raw = results.transcript || '';
        if (!raw) return '<span style="color:#94a3b8;font-style:italic">Không có transcript.</span>';

        // Suggest tab
        if (activeTab === 'suggest') {
            const suggestion = results.suggestion_answer || '';
            if (!suggestion) return '<span style="color:#94a3b8;font-style:italic">Không có bài mẫu gợi ý.</span>';
            let html = escHtml(suggestion).replace(/\n/g, '<br/>');
            html = html.replace(/\[(.*?)\|(.*?)\]/g, (_, eng, vie) =>
                `<span class="${s.suggestNote}" data-vie="${escHtml(vie)}" data-eng="${escHtml(eng)}">${escHtml(eng)}</span>`
            );
            return html;
        }

        // Fluency tab
        if (activeTab === 'fluency') {
            const breakMap = results.breakMap || '';
            if (!breakMap) return escHtml(raw).replace(/\n/g, '<br/>');
            let html = '';
            const parts = breakMap.split(/(\[\d+(?:[.,]\d+)?s\])/g);
            parts.forEach(part => {
                const pauseMatch = part.match(/^\[(\d+(?:[.,]\d+)?)s\]$/);
                if (pauseMatch) {
                    const sec = parseFloat(pauseMatch[1].replace(',', '.'));
                    let color = '';
                    let width = 10;
                    if (sec >= 0.2 && sec < 0.5) {
                        // Khoảng ngắt ngắn: màu vàng
                        color = '#eab308';
                        width = 18;
                    } else if (sec >= 0.5) {
                        // Khoảng ngắt dài: màu đỏ
                        color = '#ef4444';
                        width = 28;
                    }
                    
                    if (color) {
                        html += `<span style="display: inline-block; width: ${width}px; height: 8px; background-color: ${color}; border-radius: 4px; margin: 0 4px; vertical-align: middle;" title="Khoảng nghỉ ${sec}s"></span>`;
                    }
                } else {
                    html += escHtml(part);
                }
            });
            return html || escHtml(raw).replace(/\n/g, '<br/>');
        }

        // Pronunciation tab
        if (activeTab === 'pronun') {
            const pronWords = getPronWords(results);
            if (!pronWords.length) return escHtml(raw).replace(/\n/g, '<br/>');

            return `
                <div class="${s.pronInlineTranscript}">
                    ${pronWords.map(w => {
                        const score = Math.round(w.effectiveAccuracyScore ?? w.accuracyScore ?? 0);
                        const tone = wordTone(score, w.isLowConfidence);
                        const isSelected = selectedIssue && selectedIssue.cat === 'pronun' && selectedIssue.idx === w.id;
                        const phonemes = (w.phonemes || []).length > 0 ? w.phonemes : [{ phoneme: w.expectedIpa || '', spokenPhoneme: w.spokenIpa || '', accuracyScore: score }];
                        return `
                            <span role="button" tabindex="0"
                                class="${s.pronInlineWord} ${s[tone]} ${isSelected ? s.pronInlineSelected : ''}"
                                data-cat="pronun"
                                data-word="${escHtml(w.word)}"
                                data-id="${w.id}">
                                <span class="${s.pronInlinePhonemes}">
                                    ${phonemes.map(ph => `
                                        <span class="${s[getPhonemeTone(ph)]}" title="${escHtml(ph.spokenPhoneme && ph.spokenPhoneme !== ph.phoneme ? `Bạn nói: ${ph.spokenPhoneme}` : 'Đúng âm')}">
                                            ${escHtml(ph.phoneme || '-')}
                                        </span>
                                    `).join('')}
                                </span>
                                <span class="${s.pronInlineText}">${escHtml(w.word)}</span>
                            </span>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // Lexical / Grammar tabs
        const issues = getIssues(results, activeTab);
        const sorted = [...issues].filter(i => i.wrong).sort((a, b) => b.wrong.length - a.wrong.length);
        if (!sorted.length) return escHtml(raw).replace(/\n/g, '<br/>');

        const marks = [];
        let text = raw;
        sorted.forEach((entry, i) => {
            const re = new RegExp(escRe(entry.wrong), 'gi');
            text = text.replace(re, m => {
                const tok = `@@HL${i}_${marks.length}@@`;
                marks.push({ tok, match: m, entry });
                return tok;
            });
        });

        let html = escHtml(text);
        marks.forEach((m, idx) => {
            const hlClass = HL_CLASSES[activeTab] || '';
            const isSelected = selectedIssue && selectedIssue.cat === activeTab && selectedIssue.wrong?.toLowerCase() === m.match?.toLowerCase();
            html = html.split(m.tok).join(
                `<span class="${s.hlTap} ${s[hlClass] || ''} ${isSelected ? s.hlActive : ''}" data-cat="${activeTab}" data-idx="${idx}" data-wrong="${escHtml(m.match)}" data-right="${escHtml(m.entry.right || '')}" data-desc="${escHtml(m.entry.description || '')}">${escHtml(m.match)}</span>`
            );
        });
        return html.replace(/\n/g, '<br/>');
    };

    // ── handle click on transcript highlights ──
    const handleTranscriptClick = (e) => {
        const span = e.target.closest(`.${s.hlTap}, .${s.suggestNote}, .${s.pronInlineWord}`);
        if (!span) return;
        e.stopPropagation();

        if (span.classList.contains(s.suggestNote)) {
            const rect = span.getBoundingClientRect();
            const panelRect = transcriptRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
            const x = rect.left - panelRect.left;
            const y = rect.bottom - panelRect.top + 8;
            setPopover({ x, y, type: 'suggest', eng: span.dataset.eng || span.textContent, vie: span.dataset.vie || '' });
            return;
        }

        const cat = span.dataset.cat || activeTab;
        if (cat === 'pronun') {
            const wordId = parseInt(span.dataset.id);
            const pronWord = getPronWords(results).find(w => w.id === wordId);
            setSelectedIssue({ cat: 'pronun', wrong: span.dataset.word, right: '', desc: '', idx: wordId, word: pronWord });
        } else {
            const idx = parseInt(span.dataset.idx || '0');
            setSelectedIssue({
                cat,
                wrong: span.dataset.wrong,
                right: span.dataset.right,
                desc: span.dataset.desc,
                idx
            });
        }
    };

    // ── collect visible error cards ──
    const visibleCards = [];
    if (activeTab === 'suggest') {
        (results.vocabulary_boost || []).forEach((item, idx) => {
            visibleCards.push({ type: 'suggest', idx, item });
        });
    } else if (activeTab === 'pronun') {
        getPronWords(results).filter(w => w.isLowAccuracy && !w.isLowConfidence).forEach((w, idx) => {
            visibleCards.push({ type: 'pronun', idx, word: w });
        });
    } else {
        getIssues(results, activeTab).forEach((issue, idx) => {
            if (issue.wrong) visibleCards.push({ type: 'issue', idx, cat: activeTab, issue });
        });
    }

    const progressPct = duration > 0 ? (curTime / duration) * 100 : 0;
    const selectedPronFixes = selectedIssue?.cat === 'pronun'
        ? (selectedIssue.word?.phonemes || []).filter(ph => {
            const spoken = ph.spokenPhoneme || ph.phoneme;
            const score = ph.accuracyScore ?? ph.spokenScore ?? 100;
            return spoken !== ph.phoneme || score < 85;
        })
        : [];


    return (
        <div className={s.detailContainer}>
            {/* ── HEADER WITH BACK BUTTON ── */}
            {onBack && (
                <div className={s.viewHeader}>
                    <button className={s.backBtn} onClick={onBack} type="button">
                        <i className="bi bi-arrow-left" /> Quay lại phòng thu
                    </button>
                    <span className={s.viewTitle}>Kết quả phân tích AI chi tiết</span>
                </div>
            )}

            {/* ── MAIN WORKSPACE (Gộp chung Điểm số + Transcript + Ghi âm nghe lại làm một khối) ── */}
            <section className={s.bottomLayout}>
                {/* Transcript Panel (Khối chính bên trái) */}
                <div className={s.transcriptCard}>
                    {/* Analytics Score Bar */}
                    <div className={s.topSection}>
                        {/* Overall pill */}
                        <div className={s.overallPill}>
                            <span className={s.overallLabel}>OVERALL</span>
                            <span className={s.overallScore}>{overall > 0 ? overall.toFixed(1) : '--'}</span>
                        </div>

                        {/* Sub-metric pill badges */}
                        <div className={s.subMetricPills}>
                            {[
                                { key: 'fluency', cls: 'pillFluency', label: 'Fluency', val: fluScore, hasScore: true },
                                { key: 'lexical', cls: 'pillLexical', label: 'Lexical', val: lexicalScore, hasScore: true },
                                { key: 'grammar', cls: 'pillGrammar', label: 'Grammar', val: grammarScore, hasScore: true },
                                { key: 'pronun', cls: 'pillPronun', label: 'Pron', val: pronunciationScore, hasScore: true },
                                { key: 'suggest', cls: 'pillSuggest', label: 'Suggested', val: null, hasScore: false },
                            ].map(m => {
                                const isActive = activeTab === m.key;
                                return (
                                    <button 
                                        key={m.key} 
                                        type="button" 
                                        className={`${s.metricPill} ${s[m.cls]} ${isActive ? s.active : ''}`}
                                        onClick={() => setActiveTab(m.key)}
                                    >
                                        <span className={s.metricPillName}>{m.label}</span>
                                        {m.hasScore && (
                                            <span className={s.metricPillVal}>{m.val > 0 ? m.val.toFixed(1) : '--'}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={s.transcriptHeader}>
                        <h3 className={s.transcriptTitle}>
                            <i className="bi bi-body-text" /> Transcript
                        </h3>
                    </div>

                    <div
                        ref={transcriptRef}
                        className={`${s.transcriptPanel} ${activeTab === 'suggest' ? s.suggestMode : ''}`}
                        onClick={handleTranscriptClick}
                        dangerouslySetInnerHTML={{ __html: buildTranscriptHtml() }}
                    />

                    {/* Audio Player Dock ở dưới cùng của Transcript Card */}
                    {results.audioBlobUrl && (
                        <div className={s.audioSection}>
                            <button className={s.playBtn} onClick={togglePlay} type="button">
                                <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} style={!playing ? { marginLeft: 2 } : {}} />
                            </button>
                            <span className={s.audioCur}>{fmtTime(curTime)}</span>
                            <input
                                type="range"
                                className={s.audioSlider}
                                min={0}
                                max={duration || 100}
                                value={curTime}
                                step={0.1}
                                onChange={(e) => seekAudio(parseFloat(e.target.value))}
                                style={{
                                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${progressPct}%, #e2e8f0 ${progressPct}%, #e2e8f0 100%)`
                                }}
                            />
                            <span className={s.audioDur}>{fmtTime(duration)}</span>
                            <audio
                                ref={audioRef}
                                src={results.audioBlobUrl}
                                preload="metadata"
                                onTimeUpdate={onTimeUpdate}
                                onLoadedMetadata={onLoadedMeta}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onEnded={() => setPlaying(false)}
                            />
                        </div>
                    )}

                    {/* Popover chỉ cho dịch nghĩa cụ thể nếu có */}
                    {popover && (
                        <div className={s.popover} style={{ left: Math.min(popover.x, 200), top: popover.y }} onClick={e => e.stopPropagation()}>
                            <div className={s.popHead}>
                                <div className={s.popTitle}>Dịch nghĩa</div>
                                <button className={s.popClose} onClick={() => setPopover(null)} type="button">×</button>
                            </div>
                            <div className={s.popRow}><strong style={{ color: '#6d28d9' }}>EN:</strong> {popover.eng}</div>
                            <div className={s.popRow}><strong style={{ color: '#10b981' }}>VI:</strong> {popover.vie}</div>
                        </div>
                    )}
                </div>

                {/* Cột phải chứa các card phân tích */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Grammarly Advice Panel */}
                    <div
                        className={s.errorCardsCard}
                        style={{
                            borderColor: activeTab === 'suggest' ? '#d8b4fe' :
                                selectedIssue?.cat === 'lexical' ? 'var(--color-lexical)' :
                                    selectedIssue?.cat === 'grammar' ? 'var(--color-grammar)' :
                                        selectedIssue?.cat === 'fluency' ? 'var(--color-fluency)' :
                                            selectedIssue?.cat === 'pronun' ? 'var(--color-pron)' : 'var(--border)',
                            boxShadow: activeTab === 'suggest' ? '0 4px 12px rgba(109, 40, 217, 0.1)' :
                                selectedIssue?.cat === 'lexical' ? '0 4px 12px rgba(16, 163, 127, 0.1)' :
                                    selectedIssue?.cat === 'grammar' ? '0 4px 12px rgba(240, 81, 82, 0.1)' :
                                        selectedIssue?.cat === 'fluency' ? '0 4px 12px rgba(0, 112, 243, 0.1)' :
                                            selectedIssue?.cat === 'pronun' ? '0 4px 12px rgba(245, 166, 35, 0.1)' : 'none',
                            position: 'relative',
                            top: 0
                        }}
                    >
                        {activeTab === 'suggest' ? (
                            <>
                                <div className={s.errorCardsTitle} style={{ color: '#6d28d9' }}>
                                    <div className={s.statusDot} style={{ backgroundColor: '#6d28d9' }} />
                                    GỢI Ý TỪ AI
                                </div>
                                <div className={s.panelBody} style={{ color: 'var(--text-main)' }}>
                                    Đây là bài nói mẫu đạt băng điểm <strong>IELTS Band 8.0+</strong> được AI biên soạn lại từ câu trả lời của bạn.
                                    <br /><br />
                                    💡 <strong>Hướng dẫn:</strong> Nhấn vào các cụm từ màu tím được tô sáng trong transcript để xem dịch nghĩa tiếng Việt trực tiếp.
                                </div>
                                {getSuggestedVocab().length > 0 && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingBottom: '1.25rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#6d28d9', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <i className="bi bi-book-half"></i> Từ vựng mới trong bài mẫu:
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                                            {getSuggestedVocab().map((item, idx) => (
                                                <div 
                                                    key={idx} 
                                                    style={{ 
                                                        padding: '10px 14px', 
                                                        backgroundColor: '#f5f3ff', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #ddd6fe',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <strong style={{ color: '#6d28d9', fontSize: '0.92rem' }}>{item.word}</strong>
                                                        <button 
                                                            onClick={() => speakWord(item.word)} 
                                                            style={{ 
                                                                background: 'none', 
                                                                border: 'none', 
                                                                cursor: 'pointer', 
                                                                fontSize: '1rem',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                lineHeight: '1'
                                                            }}
                                                            title="Nghe phát âm"
                                                        >
                                                            🔊
                                                        </button>
                                                    </div>
                                                    <div style={{ color: '#4b5563', fontSize: '0.82rem', borderTop: '1px dashed #e9d5ff', paddingTop: '4px', marginTop: '2px' }}>
                                                        {item.definition}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : selectedIssue ? (
                            <>
                                <div
                                    className={s.errorCardsTitle}
                                    style={{
                                        color: selectedIssue.cat === 'lexical' ? 'var(--color-lexical)' :
                                            selectedIssue.cat === 'grammar' ? 'var(--color-grammar)' :
                                                selectedIssue.cat === 'fluency' ? 'var(--color-fluency)' :
                                                    selectedIssue.cat === 'pronun' ? 'var(--color-pron)' : 'var(--text-main)'
                                    }}
                                >
                                    <div
                                        className={s.statusDot}
                                        style={{
                                            backgroundColor: selectedIssue.cat === 'lexical' ? 'var(--color-lexical)' :
                                                selectedIssue.cat === 'grammar' ? 'var(--color-grammar)' :
                                                    selectedIssue.cat === 'fluency' ? 'var(--color-fluency)' :
                                                        selectedIssue.cat === 'pronun' ? 'var(--color-pron)' : 'transparent'
                                        }}
                                    />
                                    {selectedIssue.cat === 'lexical' ? 'TỪ VỰNG & TRÔI CHẢY' :
                                        selectedIssue.cat === 'grammar' ? 'CẤU TRÚC NGỮ PHÁP' :
                                            selectedIssue.cat === 'fluency' ? 'ĐỘ TRÔI CHẢY & MẠCH LẠC' :
                                                selectedIssue.cat === 'pronun' ? 'POSITION FIX' : 'GỢI Ý TỪ AI'}
                                </div>

                                <div className={s.panelBody}>
                                    {selectedIssue.cat === 'lexical' && (
                                        selectedIssue.desc || `Từ '${selectedIssue.wrong}' được lặp lại hoặc dùng chưa tự nhiên trong ngữ cảnh nói này.`
                                    )}
                                    {selectedIssue.cat === 'grammar' && (
                                        selectedIssue.desc || `Phát hiện lỗi cấu trúc ngữ pháp khi bạn nói cụm từ '${selectedIssue.wrong}'.`
                                    )}
                                    {selectedIssue.cat === 'fluency' && (
                                        selectedIssue.desc || `Độ trôi chảy bị ảnh hưởng bởi lỗi dừng hoặc ngắt câu không tự nhiên tại khoảng nói này.`
                                    )}
                                    {selectedIssue.cat === 'pronun' && selectedIssue.word && (
                                        <div className={s.pronFocusSummary}>
                                            <div className={s.pronFocusWord}>{selectedIssue.word.word}</div>
                                            <div className={s.pronFocusMeta}>
                                                <span>Điểm: <strong>{Math.round(selectedIssue.word.effectiveAccuracyScore ?? selectedIssue.word.accuracyScore ?? 0)}</strong></span>
                                                {selectedIssue.word.isLowConfidence && <span className={s.pronMiniBadge}>Tin cậy thấp</span>}
                                            </div>
                                            {selectedPronFixes.length > 0 && (
                                                <div className={s.pronFixList}>
                                                    {selectedPronFixes.map((ph, idx) => (
                                                        <span key={idx} className={s.pronFixPill}>
                                                            <strong>{ph.phoneme}</strong>
                                                            <span>{ph.spokenPhoneme && ph.spokenPhoneme !== ph.phoneme ? `Bạn nói ${ph.spokenPhoneme}` : `Điểm ${Math.round(ph.accuracyScore || 0)}`}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Solution Box */}
                                {selectedIssue.cat === 'pronun' && selectedIssue.word?.phonemes?.length > 0 && (
                                    <div className={s.solutionBox}>
                                        💡 <strong>Chi tiết âm tiết:</strong>
                                        <div className={s.pronCompareGrid}>
                                            <div className={s.pronCompareCard}>
                                                <span>Từ đúng</span>
                                                <strong>{selectedIssue.word.expectedIpa || '-'}</strong>
                                            </div>
                                            <div className={s.pronCompareCard}>
                                                <span>Bạn nói</span>
                                                <strong>{selectedIssue.word.spokenIpa || '-'}</strong>
                                            </div>
                                        </div>
                                        <div className={s.phonemeWrap}>
                                            {selectedIssue.word.phonemes.map((ph, idx) => (
                                                <span key={idx} className={`${s.phonemeChip} ${(ph.accuracyScore || 0) < 80 ? s.phonemeBad : ''}`}>
                                                    <span className={s.phonemeText}>
                                                        {ph.phoneme}{ph.spokenPhoneme && ph.spokenPhoneme !== ph.phoneme ? ` -> ${ph.spokenPhoneme}` : ''}
                                                    </span>
                                                    <span className={s.phonemeScore}>{Math.round(ph.accuracyScore || 0)}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className={`${s.pronActionBtn} ${s.pronPlaySeg}`}
                                                onClick={() => playSegment(selectedIssue.word.startSec || 0, selectedIssue.word.endSec || 0)}
                                                title="Nghe lại bài nói của bạn"
                                            >
                                                🔊 Nghe lại
                                            </button>
                                            <button
                                                type="button"
                                                className={`${s.pronActionBtn} ${s.pronSpeakWord}`}
                                                onClick={() => speakWord(selectedIssue.wrong)}
                                                title="Nghe phát âm bản xứ"
                                            >
                                                🗣️ Mẫu
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedIssue.cat !== 'pronun' && selectedIssue.right && (
                                    <div className={s.solutionBox}>
                                        💡 <strong>Thay thế bằng:</strong><br /><br />
                                        <em>{selectedIssue.right}</em>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={s.emptyState}>
                                <i className="bi bi-check-circle" />
                                Không có gợi ý lỗi nào được chọn.
                            </div>
                        )}
                    </div>

                    {/* Box Chú thích riêng cho Fluency */}
                    {activeTab === 'fluency' && (
                        <div
                            className={s.errorCardsCard}
                            style={{
                                borderColor: 'var(--color-fluency)',
                                boxShadow: '0 4px 12px rgba(0, 112, 243, 0.05)',
                                minHeight: 'auto',
                                top: 0
                            }}
                        >
                            <div className={s.errorCardsTitle} style={{ color: 'var(--color-fluency)' }}>
                                <i className="bi bi-info-circle-fill"></i>
                                CHÚ THÍCH KHOẢNG NGẮT
                            </div>
                            <div className={s.panelBody} style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ display: 'inline-block', width: '18px', height: '8px', backgroundColor: '#eab308', borderRadius: '4px' }}></span>
                                    <span><strong>Khoảng ngắt ngắn</strong> (0.2s - 0.5s)</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ display: 'inline-block', width: '28px', height: '8px', backgroundColor: '#ef4444', borderRadius: '4px' }}></span>
                                    <span><strong>Khoảng ngắt dài</strong> (Ngắt nghỉ lâu &ge; 0.5s)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Backdrop xử lý close popovers */}
            {popover && <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setPopover(null)} />}
        </div>
    );
}
