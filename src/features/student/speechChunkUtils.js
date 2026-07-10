import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export function createPronunciationAssessmentConfig() {
    return SpeechSDK.PronunciationAssessmentConfig.fromJSON(JSON.stringify({
        referenceText: '',
        gradingSystem: 'HundredMark',
        granularity: 'Phoneme',
        phonemeAlphabet: 'IPA',
        nBestPhonemeCount: 1,
        enableMiscue: false
    }));
}

function cleanPronunciationAssessment(pa = {}) {
    const cleaned = {};
    if (pa.AccuracyScore !== undefined) cleaned.AccuracyScore = pa.AccuracyScore;
    if (pa.FluencyScore !== undefined) cleaned.FluencyScore = pa.FluencyScore;
    if (pa.CompletenessScore !== undefined) cleaned.CompletenessScore = pa.CompletenessScore;
    return cleaned;
}

function cleanPhoneme(ph = {}) {
    const pa = ph.PronunciationAssessment || {};
    const best = Array.isArray(pa.NBestPhonemes) ? pa.NBestPhonemes.slice(0, 1) : [];

    return {
        Phoneme: ph.Phoneme || '',
        Offset: ph.Offset || 0,
        Duration: ph.Duration || 0,
        PronunciationAssessment: {
            AccuracyScore: pa.AccuracyScore,
            NBestPhonemes: best.map(item => ({
                Phoneme: item.Phoneme || '',
                Score: item.Score
            }))
        }
    };
}

function cleanWord(word = {}, fallbackConfidence) {
    const phonemes = Array.isArray(word.Phonemes) ? word.Phonemes : [];
    const syllables = Array.isArray(word.Syllables) ? word.Syllables : [];

    const cleaned = {
        Word: word.Word || '',
        Offset: word.Offset || 0,
        Duration: word.Duration || 0,
        PronunciationAssessment: {
            AccuracyScore: word.PronunciationAssessment?.AccuracyScore
        },
        Phonemes: phonemes.map(cleanPhoneme)
    };

    if (word.Confidence !== undefined) {
        cleaned.Confidence = word.Confidence;
    } else if (fallbackConfidence !== undefined) {
        cleaned.Confidence = fallbackConfidence;
    }

    if (cleaned.Phonemes.length === 0 && syllables.length > 0) {
        cleaned.Syllables = syllables.map(syl => ({
            Syllable: syl.Syllable || '',
            Offset: syl.Offset || 0,
            Duration: syl.Duration || 0,
            PronunciationAssessment: {
                AccuracyScore: syl.PronunciationAssessment?.AccuracyScore
            },
            Phonemes: Array.isArray(syl.Phonemes) ? syl.Phonemes.map(cleanPhoneme) : []
        }));
    }

    return cleaned;
}

export function buildSpeechChunk(result) {
    let serviceJson = null;
    try {
        const raw = result?.properties?.getProperty?.(SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult)
            || result?.privJson;
        serviceJson = raw ? JSON.parse(raw) : null;
    } catch (err) {
        serviceJson = null;
    }

    const nbest0 = serviceJson?.NBest?.[0] || {};
    const words = Array.isArray(nbest0.Words) ? nbest0.Words : [];

    return {
        DisplayText: serviceJson?.DisplayText || result?.text || '',
        NBest: [{
            Confidence: nbest0.Confidence,
            Display: nbest0.Display || result?.text || '',
            Lexical: nbest0.Lexical || result?.text || '',
            PronunciationAssessment: cleanPronunciationAssessment(nbest0.PronunciationAssessment || {}),
            Words: words.map(word => cleanWord(word, nbest0.Confidence))
        }]
    };
}
