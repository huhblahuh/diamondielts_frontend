import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import s from './AttemptDetailView.module.css';
const COMPACT_REVIEW_MEDIA = '(max-width: 1024px)';
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
const getScoreGradient = (score) => {
    const num = typeof score === 'number' ? score : parseFloat(score);
    if (!Number.isFinite(num)) {
        return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
    const clamped = Math.max(3, Math.min(9, num));
    const ratio = (clamped - 3) / 6; // 3.0 (3đ = đỏ) -> 9.0 (9đ = xanh lá)
    // <= 3.0 = Đỏ (0deg), 6.0 = Vàng/Cam (~67.5deg), 9.0 = Xanh lá (135deg)
    const hue = ratio * 135;
    const h1 = Math.round(Math.max(0, hue - 12));
    const h2 = Math.round(Math.min(145, hue + 12));
    return `linear-gradient(135deg, hsl(${h1}, 84%, 44%) 0%, hsl(${h2}, 82%, 36%) 100%)`;
};
const getBandDescriptor = (score) => {
    if (!Number.isFinite(score)) {
        return {
            label: 'Đang cập nhật',
            note: 'Kết quả tổng quan sẽ xuất hiện khi các tiêu chí được chấm đầy đủ.'
        };
    }
    if (score >= 8.5) {
        return {
            label: 'Expert User',
            note: 'Sử dụng ngôn ngữ rất linh hoạt, chính xác và tự nhiên.'
        };
    }
    if (score >= 7.5) {
        return {
            label: 'Very Good User',
            note: 'Sử dụng ngôn ngữ linh hoạt, chính xác và tự nhiên trong hầu hết tình huống.'
        };
    }
    if (score >= 6.5) {
        return {
            label: 'Good User',
            note: 'Giao tiếp hiệu quả với khả năng kiểm soát ngôn ngữ tốt.'
        };
    }
    return {
        label: 'Competent User',
        note: 'Đã truyền đạt được ý chính và còn nhiều cơ hội để cải thiện.'
    };
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
    const report = results?.pronunciationReport || results?.pronunciation_report || results?.pronunciation;
    return report?.low_words || report?.lowWords || [];
}
function getPronWords(results) {
    const report = results?.pronunciationReport || results?.pronunciation_report || results?.pronunciation;
    const words = report?.words || [];
    if (words.length > 0) {
        return words.map((w, index) => ({
            ...w,
            id: w.id ?? index
        }));
    }
    return getLowWords(results).map((w, index) => ({
        ...w,
        id: w.id ?? index,
        isLowAccuracy: true,
        expectedIpa: (w.phonemes || []).map(ph => ph.phoneme).join(' '),
        spokenIpa: (w.phonemes || []).map(ph => ph.spokenPhoneme || ph.phoneme).join(' ')
    }));
}
const wordTone = (score = 0) => {
    if (score > 70) return 'pronWordGood';
    if (score >= 50) return 'pronWordOk';
    return 'pronWordWeak';
};
const getPhonemeTone = (ph) => {
    const expected = ph?.phoneme || '';
    const spoken = ph?.spokenPhoneme || expected;
    const score = ph?.accuracyScore ?? ph?.spokenScore ?? 100;
    if (score >= 80) return 'phonemeInlineGood';
    if (spoken !== expected || score < 50) return 'phonemeInlineBad';
    if (score <= 70) return 'phonemeInlineWarn';
    return 'phonemeInlineGood';
};
// ── TTS ──
let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const loadVoices = () => {
        cachedVoices = window.speechSynthesis.getVoices() || [];
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}
function speakWord(word) {
    if (!('speechSynthesis' in window)) return;
    const clean = (word || '').replace(/[^\w'\-\s]/g, '').trim();
    if (!clean) return;
    try {
        window.speechSynthesis.cancel();
    } catch (e) { }
    setTimeout(() => {
        const u = new SpeechSynthesisUtterance(clean);
        const voices = (cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices()) || [];
        const enVoice = voices.find(x => (x.lang || '').toLowerCase() === 'en-us')
            || voices.find(x => (x.lang || '').toLowerCase().startsWith('en-us'))
            || voices.find(x => (x.lang || '').toLowerCase().startsWith('en'))
            || voices[0];
        if (enVoice) {
            u.voice = enVoice;
            u.lang = enVoice.lang;
        } else {
            u.lang = 'en-US';
        }
        u.rate = 0.9;
        window.currentSpeechUtterance = u;
        u.onend = () => { window.currentSpeechUtterance = null; };
        u.onerror = () => { window.currentSpeechUtterance = null; };
        window.speechSynthesis.speak(u);
    }, 50);
}
function getSecFromField(obj, key) {
    const v = obj?.[key];
    if (typeof v !== 'number' || v < 0) return null;
    // Heuristic: if value > 1000000 it's 100-ns ticks, if > 1000 it's ms, otherwise seconds
    if (v > 1000000) return v / 10000000;
    if (v > 1000) return v / 1000;
    return v;
}

function parseWordTimeRange(wordObj, issueObj) {
    const target = wordObj || issueObj || {};

    // Word timing is produced from Soniox. Never use Azure phoneme/word frames
    // to seek the original recording.
    let start = getSecFromField(target, 'startSec')
        ?? getSecFromField(target, 'start_sec')
        ?? getSecFromField(target, 'startTime')
        ?? getSecFromField(target, 'start_time')
        ?? (typeof target.offset === 'number' && target.offset > 0 ? target.offset / 10000000 : null)
        ?? 0;

    let end = getSecFromField(target, 'endSec')
        ?? getSecFromField(target, 'end_sec')
        ?? (typeof target.durationSec === 'number' && target.durationSec > 0 ? start + target.durationSec : null)
        ?? (typeof target.duration === 'number' && target.duration > 0
            ? start + (target.duration > 1000000 ? target.duration / 10000000 : target.duration > 1000 ? target.duration / 1000 : target.duration)
            : null)
        ?? (start + 0.8);

    return { start: Math.max(0, start), end: Math.max(start, end) };
}

// ══════════════════════════════════════════════
//  COMPONENT
// ══════════════════════════════════════════════
export default function AttemptDetailView({ results }) {
    const audioSource = results?.audioBlobUrl
        || results?.audioUrl
        || results?.audio_url
        || results?.secureUrl
        || results?.downloadUrl
        || results?.audioFile
        || results?.fileUrl
        || null;

    const [activeTab, setActiveTab] = useState('lexical');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [popover, setPopover] = useState(null);
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [curTime, setCurTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const transcriptRef = useRef(null);
    const popoverRef = useRef(null);
    const popoverAnchorRef = useRef(null);
    const popoverAnchorFragmentRef = useRef(0);
    const durationProbeRef = useRef({ active: false, restoreTime: 0 });
    const activeSegmentRafRef = useRef(null);
    const activeSegmentListenerRef = useRef(null);
    const stopActiveSegmentListener = useCallback(() => {
        if (activeSegmentRafRef.current) {
            cancelAnimationFrame(activeSegmentRafRef.current);
            activeSegmentRafRef.current = null;
        }
        const a = audioRef.current;
        if (a && activeSegmentListenerRef.current) {
            a.removeEventListener('timeupdate', activeSegmentListenerRef.current);
            activeSegmentListenerRef.current = null;
        }
    }, []);
    useEffect(() => {
        return () => {
            stopActiveSegmentListener();
            if ('speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (e) { }
            }
        };
    }, [stopActiveSegmentListener]);
    useEffect(() => {
        setCurTime(0);
        setDuration(0);
        durationProbeRef.current = { active: false, restoreTime: 0 };
        stopActiveSegmentListener();
        if (audioRef.current) {
            try { audioRef.current.load(); } catch (e) { }
        }
    }, [audioSource, stopActiveSegmentListener]);

    const placePopover = useCallback(() => {
        const anchor = popoverAnchorRef.current;
        const notion = popoverRef.current;
        if (!anchor || !notion || !document.body.contains(anchor)) return;

        const anchorFragments = Array.from(anchor.getClientRects());
        const anchorRect = anchorFragments[
            Math.min(popoverAnchorFragmentRef.current, Math.max(0, anchorFragments.length - 1))
        ] || anchor.getBoundingClientRect();
        const notionRect = notion.getBoundingClientRect();
        const edge = 12;
        const gap = 8;
        const maxLeft = Math.max(edge, window.innerWidth - notionRect.width - edge);
        const viewportLeft = Math.min(
            Math.max(anchorRect.left + (anchorRect.width - notionRect.width) / 2, edge),
            maxLeft
        );

        const fitsBelow = anchorRect.bottom + gap + notionRect.height <= window.innerHeight - edge;
        const fitsAbove = anchorRect.top - gap - notionRect.height >= edge;
        let viewportTop;
        if (fitsBelow) {
            viewportTop = anchorRect.bottom + gap;
        } else if (fitsAbove) {
            viewportTop = anchorRect.top - notionRect.height - gap;
        } else {
            viewportTop = Math.min(
                Math.max(anchorRect.bottom + gap, edge),
                Math.max(edge, window.innerHeight - notionRect.height - edge)
            );
        }

        setPopover(current => current ? {
            ...current,
            left: viewportLeft + window.scrollX,
            top: viewportTop + window.scrollY,
            ready: true
        } : current);
    }, []);

    useLayoutEffect(() => {
        if (!popover) return undefined;
        const frame = requestAnimationFrame(placePopover);
        return () => cancelAnimationFrame(frame);
    }, [popover?.type, popover?.issue, placePopover]);

    useEffect(() => {
        if (!popover) return undefined;

        const reposition = () => {
            if (!window.matchMedia(COMPACT_REVIEW_MEDIA).matches) {
                setPopover(null);
                return;
            }
            requestAnimationFrame(placePopover);
        };
        const closeWhenClickingAway = (event) => {
            if (popoverRef.current?.contains(event.target) || popoverAnchorRef.current?.contains(event.target)) return;
            setPopover(null);
        };

        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        document.addEventListener('pointerdown', closeWhenClickingAway);
        return () => {
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
            document.removeEventListener('pointerdown', closeWhenClickingAway);
        };
    }, [popover?.type, placePopover]);
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
            const weak = getPronWords(results).find(w => w.isLowAccuracy);
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
    const fluScore = results.fluency_coherence?.score ?? null;
    const lexicalScore = results.lexical_resource?.score ?? null;
    const grammarScore = results.grammar?.score ?? null;
    const pronunciationScore =
        results.pronunciationReport?.overall?.pronunciationScore ?? null;
    const criteriaScores = [
        fluScore,
        lexicalScore,
        grammarScore,
        pronunciationScore
    ];
    const computedOverall = criteriaScores.every(Number.isFinite)
        ? criteriaScores.reduce((sum, score) => sum + score, 0) / 4
        : null;
    const overall = Number.isFinite(results.overallScore)
        ? results.overallScore
        : computedOverall;
    const bandDescriptor = getBandDescriptor(overall);
    const overallProgress = Number.isFinite(overall)
        ? `${Math.max(0, Math.min(100, Number(pct(overall))))}%`
        : '0%';
    const scoreMetrics = [
        { key: 'fluency', cls: 'pillFluency', label: 'Fluency', val: fluScore, hasScore: true },
        { key: 'lexical', cls: 'pillLexical', label: 'Lexical', val: lexicalScore, hasScore: true },
        { key: 'grammar', cls: 'pillGrammar', label: 'Grammar', val: grammarScore, hasScore: true },
        { key: 'pronun', cls: 'pillPronun', label: 'Pron', val: pronunciationScore, hasScore: true },
        { key: 'suggest', cls: 'pillSuggest', label: 'Suggested', val: null, hasScore: false },
    ];
    const activeMetricIndex = Math.max(0, scoreMetrics.findIndex(metric => metric.key === activeTab));
    // ── audio handlers ──
    const togglePlay = () => {
        const a = audioRef.current;
        if (!a) return;
        stopActiveSegmentListener();
        if (a.paused) {
            a.play().catch(err => console.warn("Audio play error:", err));
        } else {
            a.pause();
        }
    };
    const onTimeUpdate = () => {
        const a = audioRef.current;
        if (a && Number.isFinite(a.currentTime)) {
            setCurTime(Math.min(Math.max(0, a.currentTime), duration || a.currentTime));
        }
    };
    const syncAudioDuration = () => {
        const a = audioRef.current;
        if (!a) return;
        if (Number.isFinite(a.duration) && a.duration > 0) {
            setDuration(a.duration);
            setCurTime(current => Math.min(Math.max(0, current), a.duration));
            if (durationProbeRef.current.active) {
                const restoreTime = Math.min(
                    Math.max(0, durationProbeRef.current.restoreTime),
                    a.duration
                );
                durationProbeRef.current = { active: false, restoreTime: 0 };
                a.currentTime = restoreTime;
            }
            return;
        }
        if (a.duration === Infinity && !durationProbeRef.current.active) {
            durationProbeRef.current = {
                active: true,
                restoreTime: Number.isFinite(a.currentTime) ? a.currentTime : 0
            };
            a.currentTime = Number.MAX_SAFE_INTEGER;
        }
    };
    const seekAudio = (val) => {
        const a = audioRef.current;
        if (!a) return;
        stopActiveSegmentListener();
        const seekLimit = Number.isFinite(duration) && duration > 0 ? duration : 100;
        const nextTime = Math.min(Math.max(0, val), seekLimit);
        try {
            a.currentTime = nextTime;
        } catch {
            // Metadata may still be loading.
        }
        setCurTime(nextTime);
    };
    const playSegment = useCallback((start, end) => {
        const a = audioRef.current;
        if (!a) return;
        stopActiveSegmentListener();

        const safeStart = Math.max(0, Number.isFinite(start) ? start : 0);
        const targetEnd = Number.isFinite(end) && end > safeStart ? end : (safeStart + 0.8);

        console.log('[playSegment] safeStart=', safeStart, 'targetEnd=', targetEnd, 'a.readyState=', a.readyState, 'a.src=', a.src?.slice(-60));

        const startPlaying = () => {
            console.log('[playSegment] after seek, a.currentTime=', a.currentTime);
            const playPromise = a.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => console.warn("Segment playback error:", err));
            }

            if (targetEnd > safeStart) {
                const stopTime = targetEnd + 0.08;

                const checkStop = () => {
                    if (!audioRef.current) return;
                    if (audioRef.current.currentTime >= stopTime || audioRef.current.paused) {
                        if (!audioRef.current.paused) {
                            audioRef.current.pause();
                        }
                        stopActiveSegmentListener();
                    } else {
                        activeSegmentRafRef.current = requestAnimationFrame(checkStop);
                    }
                };

                activeSegmentListenerRef.current = checkStop;
                a.addEventListener('timeupdate', checkStop);
                activeSegmentRafRef.current = requestAnimationFrame(checkStop);
            }
        };

        const executePlay = () => {
            // Cancel any in-progress duration probe that could override our seek
            if (durationProbeRef.current.active) {
                durationProbeRef.current = { active: false, restoreTime: 0 };
            }

            // Wait for 'seeked' event so play() starts from exactly safeStart
            const onSeeked = () => {
                a.removeEventListener('seeked', onSeeked);
                startPlaying();
            };
            a.addEventListener('seeked', onSeeked);

            try {
                a.currentTime = safeStart;
            } catch (e) {
                a.removeEventListener('seeked', onSeeked);
                console.warn("Audio seek error:", e);
                startPlaying(); // Fallback: try playing from wherever we are
            }
        };

        if (a.readyState < 1) {
            const onLoaded = () => {
                a.removeEventListener('loadedmetadata', onLoaded);
                executePlay();
            };
            a.addEventListener('loadedmetadata', onLoaded);
            try { a.load(); } catch (e) {}
        } else {
            executePlay();
        }
    }, [stopActiveSegmentListener]);
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
                        color = '#eab308';
                        width = 18;
                    } else if (sec >= 0.5) {
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
                const score = Math.round(w.accuracyScore ?? 0);
                const tone = wordTone(score);
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
        const taggedFix = activeTab === 'lexical' ? results?.lexical_resource?.tagged_fix : results?.grammar?.tagged_fix;
        if (taggedFix && (taggedFix.includes('[') || taggedFix.includes(']'))) {
            const re = /\[([^|\]]+)\|([^|\]]+)\|([^\]]+)\]/g;
            let html = '';
            let lastIndex = 0;
            let match;
            let idx = 0;
            while ((match = re.exec(taggedFix)) !== null) {
                html += escHtml(taggedFix.substring(lastIndex, match.index));
                const wrong = match[1].trim();
                const right = match[2].trim();
                const description = match[3].trim();
                const hlClass = HL_CLASSES[activeTab] || '';
                const isSelected = selectedIssue && selectedIssue.cat === activeTab && selectedIssue.idx === idx;

                html += `<span class="${s.hlTap} ${s.inlineFix} ${s[hlClass] || ''} ${isSelected ? s.hlActive : ''}" data-cat="${activeTab}" data-idx="${idx}" data-wrong="${escHtml(wrong)}" data-right="${escHtml(right)}" data-desc="${escHtml(description)}"><span>${escHtml(wrong)}</span><span class="${s.inlineFixArrow}">→</span><strong>${escHtml(right)}</strong></span>`;
                lastIndex = re.lastIndex;
                idx++;
            }
            html += escHtml(taggedFix.substring(lastIndex));
            return html.replace(/\n/g, '<br/>');
        }
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
                `<span class="${s.hlTap} ${s.inlineFix} ${s[hlClass] || ''} ${isSelected ? s.hlActive : ''}" data-cat="${activeTab}" data-idx="${idx}" data-wrong="${escHtml(m.match)}" data-right="${escHtml(m.entry.right || '')}" data-desc="${escHtml(m.entry.description || '')}"><span>${escHtml(m.match)}</span><span class="${s.inlineFixArrow}">→</span><strong>${escHtml(m.entry.right || '')}</strong></span>`
            );
        });
        return html.replace(/\n/g, '<br/>');
    };
    // ── handle click on transcript highlights ──
    const handleTranscriptClick = (e) => {
        const span = e.target.closest(`.${s.hlTap}, .${s.suggestNote}, .${s.pronInlineWord}`);
        if (!span) return;
        e.stopPropagation();
        const showNotion = window.matchMedia(COMPACT_REVIEW_MEDIA).matches;
        popoverAnchorRef.current = span;
        const fragments = Array.from(span.getClientRects());
        const clickedFragment = fragments.findIndex(rect =>
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
        );
        popoverAnchorFragmentRef.current = clickedFragment >= 0 ? clickedFragment : 0;
        if (span.classList.contains(s.suggestNote)) {
            setPopover(showNotion ? {
                type: 'suggest',
                eng: span.dataset.eng || span.textContent,
                vie: span.dataset.vie || '',
                left: 0,
                top: 0,
                ready: false
            } : null);
            return;
        }
        const cat = span.dataset.cat || activeTab;
        if (cat === 'pronun') {
            const wordId = parseInt(span.dataset.id);
            const pronWord = getPronWords(results).find(w => w.id === wordId);
            const issue = { cat: 'pronun', wrong: span.dataset.word, right: '', desc: '', idx: wordId, word: pronWord };
            setSelectedIssue(issue);
            setPopover(showNotion ? { type: 'pronun', issue, left: 0, top: 0, ready: false } : null);
        } else {
            const idx = parseInt(span.dataset.idx || '0');
            const issue = {
                cat,
                wrong: span.dataset.wrong,
                right: span.dataset.right,
                desc: span.dataset.desc,
                idx
            };
            setSelectedIssue(issue);
            setPopover(showNotion && cat !== 'fluency' ? { type: cat, issue, left: 0, top: 0, ready: false } : null);
        }
    };
    const sliderMax = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const rangeMax = sliderMax || 100;
    const sliderValue = sliderMax > 0
        ? Math.min(Math.max(0, curTime), sliderMax)
        : Math.min(Math.max(0, curTime), rangeMax);
    const progressPct = sliderMax > 0
        ? Math.min(100, Math.max(0, (sliderValue / sliderMax) * 100))
        : 0;
    return (
        <div className={s.detailContainer}>
            <section className={s.reportSurface}>
                <div
                    className={s.overallHero}
                    style={{ background: getScoreGradient(overall) }}
                >
                    <div className={s.overallScoreBlock}>
                        <span className={s.overallLabel}>OVERALL</span>
                        <span className={s.overallScore}>
                            {Number.isFinite(overall) ? overall.toFixed(1) : '--'}
                        </span>
                    </div>
                    <div className={s.bandInsight}>
                        <div className={s.bandInsightHead}>
                            <span className={s.bandDescriptor}>{bandDescriptor.label}</span>
                            <span className={s.bandValue}>
                                {Number.isFinite(overall) ? `${overall.toFixed(1)} / 9.0` : '-- / 9.0'}
                            </span>
                        </div>
                        <div
                            className={s.bandTrack}
                            role="progressbar"
                            aria-label="Điểm Overall"
                            aria-valuemin={0}
                            aria-valuemax={9}
                            aria-valuenow={Number.isFinite(overall) ? overall : undefined}
                        >
                            <span className={s.bandFill} style={{ width: overallProgress }} />
                        </div>
                        <div className={s.bandTicks} aria-hidden="true">
                            <span>0</span><span>3</span><span>6</span><span>9</span>
                        </div>
                        <p className={s.bandNote}>{bandDescriptor.note}</p>
                    </div>
                </div>

                <div
                    className={s.metricGrid}
                    aria-label="Tiêu chí chấm điểm"
                    style={{ '--active-metric-index': activeMetricIndex }}
                >
                    <span className={s.metricSlider} aria-hidden="true" />
                    {scoreMetrics.map(m => {
                        const isActive = activeTab === m.key;
                        return (
                            <button
                                key={m.key}
                                type="button"
                                aria-pressed={isActive}
                                className={`${s.metricCard} ${s[m.cls]} ${isActive ? s.active : ''}`}
                                onClick={() => setActiveTab(m.key)}
                            >
                                <span className={s.metricScoreBadge}>
                                    {m.hasScore && Number.isFinite(m.val) ? m.val.toFixed(1) : '--'}
                                </span>
                                <span className={s.metricLabel}>{m.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={s.bottomLayout}>
                    <div className={s.transcriptCard}>
                    {results.processingWarning && (
                        <div className={s.processingWarning} role="status">
                            <i className="bi bi-exclamation-triangle" />
                            <span>Một phần kết quả chưa thể xử lý đầy đủ. Vui lòng thử lại sau.</span>
                        </div>
                    )}
                    {results.__partial && (
                        <div className={s.processingWarning} role="status">
                            <i className="bi bi-hourglass-split" />
                            <span>Pronunciation đã chấm xong. Các tiêu chí còn lại đang được xử lý.</span>
                        </div>
                    )}
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
                    {/* Audio Player Dock */}
                    {audioSource && (
                        <div className={s.audioSection}>
                            <button className={s.playBtn} onClick={togglePlay} type="button">
                                <i className={`bi ${playing ? 'bi-pause-fill' : 'bi-play-fill'}`} style={!playing ? { marginLeft: 2 } : {}} />
                            </button>
                            <span className={s.audioCur}>{fmtTime(curTime)}</span>
                            <input
                                type="range"
                                className={s.audioSlider}
                                min={0}
                                max={rangeMax}
                                value={sliderValue}
                                step="any"
                                onChange={(e) => seekAudio(parseFloat(e.target.value))}
                                style={{
                                    background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${progressPct}%, #e2e8f0 ${progressPct}%, #e2e8f0 100%)`
                                }}
                            />
                            <span className={s.audioDur}>{fmtTime(duration)}</span>
                            <audio
                                ref={audioRef}
                                src={audioSource}
                                preload="auto"
                                onTimeUpdate={onTimeUpdate}
                                onLoadedMetadata={syncAudioDuration}
                                onDurationChange={syncAudioDuration}
                                onPlay={() => setPlaying(true)}
                                onPause={() => setPlaying(false)}
                                onEnded={() => {
                                    setPlaying(false);
                                    stopActiveSegmentListener();
                                    setCurTime(sliderMax);
                                }}
                            />
                        </div>
                    )}
                    </div>
                    {/* Cột phải chứa các card phân tích */}
                    <div className={s.analysisColumn}>
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
                                    GỢI Ý CẢI THIỆN
                                </div>
                                <div className={s.panelBody} style={{ color: 'var(--text-main)' }}>
                                    Đây là bài nói tham khảo được biên soạn lại từ câu trả lời của bạn.
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
                                                selectedIssue.cat === 'pronun' ? 'PHÁT ÂM CHI TIẾT' : 'GỢI Ý CẢI THIỆN'}
                                </div>
                                <div className={s.panelBody}>
                                    {selectedIssue.cat !== 'pronun' && (
                                        <div className={s.issueList}>
                                            {getIssues(results, selectedIssue.cat).map((issue, index) => (
                                                <div className={`${s.issueCard} ${issue.wrong?.toLowerCase() === selectedIssue.wrong?.toLowerCase() ? s.selectedIssueCard : ''}`} key={`${selectedIssue.cat}-${index}`}>
                                                    <div className={s.issueCardHeader}>
                                                        <span className={s.issueIndex}>{String(index + 1).padStart(2, '0')}</span>
                                                        <span className={s.issueLabel}>{issue.description || 'Nhận xét'}</span>
                                                    </div>
                                                    <div className={s.issueBlock}>
                                                        <span className={s.issueBlockLabel}>Vấn đề</span>
                                                        <div>{issue.wrong}</div>
                                                    </div>
                                                    {issue.right && (
                                                        <div className={`${s.issueBlock} ${s.issueImprovement}`}>
                                                            <span className={s.issueBlockLabel}>Cải thiện</span>
                                                            <div>{issue.right}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {selectedIssue.cat === 'pronun' && selectedIssue.word && (
                                        <div className={s.pronFocusSummary}>
                                            <div className={s.pronFocusWord}>{selectedIssue.word.word}</div>
                                            <div className={s.pronFocusMeta}>
                                                <span>Điểm: <strong>{Math.round(selectedIssue.word.accuracyScore ?? 0)}</strong></span>
                                            </div>
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
                                                <div className={s.pronCompareExpectedPhonemes}>
                                                    {selectedIssue.word.phonemes.map((ph, idx) => (
                                                        <strong key={idx}>{ph.phoneme || '-'}</strong>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className={s.pronCompareCard}>
                                                <span>Bạn nói</span>
                                                <div className={s.pronComparePhonemes}>
                                                    {selectedIssue.word.phonemes.map((ph, idx) => (
                                                        <span key={idx} className={`${s.pronComparePhoneme} ${s[getPhonemeTone(ph)]}`}>
                                                            <small>{Math.round(ph.accuracyScore ?? ph.spokenScore ?? 0)}</small>
                                                            <strong>{ph.spokenPhoneme || ph.phoneme || '-'}</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={s.pronActions}>
                                            <button
                                                type="button"
                                                className={`${s.pronActionBtn} ${s.pronPlaySeg}`}
                                                onClick={() => {
                                                    const wordObj = selectedIssue?.word;
                                                    console.log('[Nghe lại] word object:', JSON.stringify(wordObj));
                                                    const { start, end } = parseWordTimeRange(wordObj, selectedIssue);
                                                    console.log('[Nghe lại] computed start=', start, 'end=', end);
                                                    playSegment(start, end);
                                                }}
                                                title="Nghe lại bài nói của bạn"
                                            >
                                                🔊 Nghe lại
                                            </button>
                                            <button
                                                type="button"
                                                className={`${s.pronActionBtn} ${s.pronSpeakWord}`}
                                                onClick={() => speakWord(selectedIssue?.word?.word || selectedIssue?.wrong)}
                                                title="Nghe phát âm bản xứ"
                                            >
                                                🗣️ Mẫu
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {selectedIssue.cat === 'pronun' && selectedIssue.right && (
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
                </div>
            </section>
            {popover && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    className={s.popover}
                    role="dialog"
                    aria-modal="false"
                    aria-label="Chi tiết nhận xét"
                    style={{
                        left: popover.left,
                        top: popover.top,
                        visibility: popover.ready ? 'visible' : 'hidden'
                    }}
                >
                    <div className={s.popHead}>
                        <div
                            className={s.popTitle}
                            style={{
                                color: popover.type === 'lexical' ? 'var(--color-lexical)' :
                                    popover.type === 'grammar' ? 'var(--color-grammar)' :
                                        popover.type === 'pronun' ? 'var(--color-pron)' : '#6d28d9'
                            }}
                        >
                            {popover.type === 'lexical' ? 'TỪ VỰNG & TRÔI CHẢY' :
                                popover.type === 'grammar' ? 'CẤU TRÚC NGỮ PHÁP' :
                                    popover.type === 'pronun' ? 'PHÁT ÂM CHI TIẾT' : 'DỊCH NGHĨA'}
                        </div>
                        <button className={s.popClose} onClick={() => setPopover(null)} type="button" aria-label="Đóng">×</button>
                    </div>

                    {popover.type === 'suggest' && (
                        <div className={s.popContent}>
                            <div className={s.popRow}><strong style={{ color: '#6d28d9' }}>EN:</strong> {popover.eng}</div>
                            <div className={s.popRow}><strong style={{ color: '#10b981' }}>VI:</strong> {popover.vie}</div>
                        </div>
                    )}

                    {(popover.type === 'lexical' || popover.type === 'grammar') && popover.issue && (
                        <div className={s.popContent}>
                            <div className={s.popDescription}>{popover.issue.desc || 'Nhận xét'}</div>
                            <div className={s.issueBlock}>
                                <span className={s.issueBlockLabel}>Vấn đề</span>
                                <div>{popover.issue.wrong}</div>
                            </div>
                            {popover.issue.right && (
                                <div className={`${s.issueBlock} ${s.issueImprovement}`}>
                                    <span className={s.issueBlockLabel}>Cải thiện</span>
                                    <div>{popover.issue.right}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {popover.type === 'pronun' && popover.issue?.word && (
                        <div className={s.popContent}>
                            <div className={s.pronFocusSummary}>
                                <div className={s.pronFocusWord}>{popover.issue.word.word}</div>
                                <div className={s.pronFocusMeta}>
                                    <span>Điểm: <strong>{Math.round(popover.issue.word.accuracyScore ?? 0)}</strong></span>
                                </div>
                            </div>
                            <div className={s.popPronCompare}>
                                <div className={s.pronCompareCard}>
                                    <span>Từ đúng</span>
                                    {(popover.issue.word.phonemes || []).length > 0 ? (
                                        <div className={s.pronCompareExpectedPhonemes}>
                                            {popover.issue.word.phonemes.map((ph, idx) => (
                                                <strong key={idx}>{ph.phoneme || '-'}</strong>
                                            ))}
                                        </div>
                                    ) : (
                                        <strong>{popover.issue.word.expectedIpa || '-'}</strong>
                                    )}
                                </div>
                                <div className={s.pronCompareCard}>
                                    <span>Bạn nói</span>
                                    <div className={s.pronComparePhonemes}>
                                        {(popover.issue.word.phonemes || []).map((ph, idx) => (
                                            <span key={idx} className={`${s.pronComparePhoneme} ${s[getPhonemeTone(ph)]}`}>
                                                <small>{Math.round(ph.accuracyScore ?? ph.spokenScore ?? 0)}</small>
                                                <strong>{ph.spokenPhoneme || ph.phoneme || '-'}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={s.pronActions}>
                                <button
                                    type="button"
                                    className={`${s.pronActionBtn} ${s.pronPlaySeg}`}
                                    onClick={() => {
                                        const { start, end } = parseWordTimeRange(popover.issue.word, popover.issue);
                                        playSegment(start, end);
                                    }}
                                >
                                    🔊 Nghe lại
                                </button>
                                <button
                                    type="button"
                                    className={`${s.pronActionBtn} ${s.pronSpeakWord}`}
                                    onClick={() => speakWord(popover.issue.word.word || popover.issue.wrong)}
                                >
                                    🗣️ Mẫu
                                </button>
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
