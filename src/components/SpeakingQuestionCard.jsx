import React from 'react';
import { normalizeSpeakingContent } from '../utils/speakingContent';

export default function SpeakingQuestionCard({ content, type, className = '' }) {
    const { question, suggestions } = normalizeSpeakingContent(content);
    const isCueCard = type === 'Part 2';

    if (!isCueCard) {
        return <p className={className} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{question}</p>;
    }

    return (
        <div
            className={className}
            style={{
                padding: '1.25rem',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                background: '#f8fafc'
            }}
        >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{question}</p>
            {suggestions.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <strong>You should say:</strong>
                    <ul style={{ margin: '0.6rem 0 0', paddingLeft: '1.4rem' }}>
                        {suggestions.map((suggestion, index) => (
                            <li key={`${index}-${suggestion}`} style={{ marginBottom: '0.35rem' }}>
                                {suggestion}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
