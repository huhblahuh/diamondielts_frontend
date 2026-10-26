export { sonioxTokensToWords } from '../speakingAssessmentPipeline';

export function finalizedText(tokens) {
    return tokens.map(token => token.text || '').join('').replace(/\s+/g, ' ').trim();
}
