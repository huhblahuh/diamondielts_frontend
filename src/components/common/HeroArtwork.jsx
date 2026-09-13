import styles from './HeroArtwork.module.css';

function HomeArtwork() {
    return (
        <svg viewBox="0 0 280 160" role="presentation">
            <defs>
                <linearGradient id="home-card" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#fff" stopOpacity=".98" />
                    <stop offset="1" stopColor="#dff5ff" stopOpacity=".9" />
                </linearGradient>
                <filter id="home-shadow" x="-30%" y="-30%" width="160%" height="180%">
                    <feDropShadow dy="10" stdDeviation="9" floodColor="#021744" floodOpacity=".28" />
                </filter>
            </defs>
            <path d="M18 132C64 108 91 122 129 92s79-31 137-68" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="2" strokeDasharray="5 8" />
            <g className={styles.pulse}>
                <circle cx="231" cy="36" r="25" fill="#FFC83D" opacity=".16" />
                <circle cx="231" cy="36" r="15" fill="#FFC83D" />
                <path d="M231 12V4m0 64v-8m24-24h8m-64 0h8m41-17 6-6m-46 46 6-6m34 0 6 6m-46-46 6 6" stroke="#FFE89A" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className={styles.floatSlow} filter="url(#home-shadow)" transform="translate(68 35) rotate(-6)">
                <rect width="120" height="86" rx="18" fill="url(#home-card)" />
                <rect x="15" y="16" width="38" height="38" rx="12" fill="#0B58D5" />
                <path d="M24 34l8 8 13-18" fill="none" stroke="#FFC83D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="64" y="19" width="40" height="7" rx="3.5" fill="#0A3D9A" opacity=".85" />
                <rect x="64" y="33" width="27" height="5" rx="2.5" fill="#70CFF4" />
                <rect x="15" y="64" width="88" height="7" rx="3.5" fill="#D7E8F7" />
                <rect x="15" y="64" width="61" height="7" rx="3.5" fill="#FFC83D" />
            </g>
            <g fill="#FFD65A">
                <path d="M34 38l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
                <circle cx="45" cy="112" r="5" opacity=".8" />
                <circle cx="204" cy="117" r="3" />
            </g>
        </svg>
    );
}

function PracticeArtwork() {
    return (
        <svg viewBox="0 0 280 160" role="presentation">
            <defs>
                <linearGradient id="practice-mic" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#FFE58A" />
                    <stop offset="1" stopColor="#FFB800" />
                </linearGradient>
                <filter id="practice-shadow" x="-40%" y="-30%" width="180%" height="190%">
                    <feDropShadow dy="10" stdDeviation="10" floodColor="#021744" floodOpacity=".3" />
                </filter>
            </defs>
            <g fill="none" stroke="#77D9FF" strokeLinecap="round">
                <path d="M28 49v28m13-39v50m13-28v11m13-23v36" strokeWidth="5" opacity=".55" />
                <path d="M218 53v44m13-58v72m13-49v26m13-41v56" strokeWidth="4" opacity=".42" />
            </g>
            <circle cx="141" cy="78" r="61" fill="#fff" opacity=".07" />
            <circle cx="141" cy="78" r="46" fill="#fff" opacity=".09" />
            <g className={styles.floatFast} filter="url(#practice-shadow)">
                <rect x="118" y="25" width="46" height="76" rx="23" fill="url(#practice-mic)" />
                <rect x="128" y="35" width="26" height="38" rx="13" fill="#0A4AB9" opacity=".92" />
                <path d="M102 76v5c0 22 17 39 39 39s39-17 39-39v-5" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
                <path d="M141 120v20m-20 0h40" stroke="#FFC83D" strokeWidth="7" strokeLinecap="round" />
            </g>
            <g fill="#FFE078">
                <circle cx="82" cy="29" r="5" />
                <circle cx="201" cy="25" r="3" />
                <path d="M201 111l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            </g>
        </svg>
    );
}

function AssignmentArtwork() {
    return (
        <svg viewBox="0 0 280 160" role="presentation">
            <defs>
                <linearGradient id="assignment-paper" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#fff" />
                    <stop offset="1" stopColor="#E5F5FF" />
                </linearGradient>
                <filter id="assignment-shadow" x="-30%" y="-30%" width="180%" height="190%">
                    <feDropShadow dy="11" stdDeviation="11" floodColor="#01143C" floodOpacity=".3" />
                </filter>
            </defs>
            <path d="M35 30h40M24 46h31M218 122h38M232 106h26" stroke="#fff" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" />
            <g className={styles.floatSlow} filter="url(#assignment-shadow)" transform="translate(78 13) rotate(-4 63 68)">
                <rect x="10" y="9" width="126" height="128" rx="18" fill="#FFC83D" />
                <rect x="0" y="0" width="126" height="128" rx="18" fill="url(#assignment-paper)" />
                <rect x="43" y="-7" width="42" height="20" rx="8" fill="#FFC83D" />
                <g fill="none" stroke="#0B58D5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 34l5 5 9-11" />
                    <path d="M21 65l5 5 9-11" />
                    <path d="M21 96l5 5 9-11" />
                </g>
                <g fill="#BBD7F0">
                    <rect x="46" y="29" width="58" height="7" rx="3.5" />
                    <rect x="46" y="60" width="47" height="7" rx="3.5" />
                    <rect x="46" y="91" width="64" height="7" rx="3.5" />
                </g>
            </g>
            <g className={styles.floatFast} transform="translate(202 62) rotate(14)">
                <rect width="18" height="72" rx="9" fill="#FFD34E" />
                <path d="M0 59h18L9 78z" fill="#F1B78F" />
                <path d="M6 72h6l-3 6z" fill="#123A76" />
                <rect y="8" width="18" height="8" fill="#0A55C7" opacity=".85" />
            </g>
            <circle cx="45" cy="113" r="12" fill="none" stroke="#76D8FF" strokeWidth="4" opacity=".75" />
        </svg>
    );
}

function HistoryArtwork() {
    return (
        <svg viewBox="0 0 280 160" role="presentation">
            <defs>
                <linearGradient id="history-clock" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#FFF4BD" />
                    <stop offset="1" stopColor="#FFC83D" />
                </linearGradient>
                <filter id="history-shadow" x="-40%" y="-40%" width="180%" height="190%">
                    <feDropShadow dy="10" stdDeviation="10" floodColor="#021744" floodOpacity=".3" />
                </filter>
            </defs>
            <path d="M25 118C65 118 62 50 111 50s43 69 93 69h50" fill="none" stroke="#75D7FF" strokeWidth="4" strokeDasharray="3 9" strokeLinecap="round" opacity=".65" />
            <g fill="#FFC83D">
                <circle cx="25" cy="118" r="7" /><circle cx="111" cy="50" r="7" /><circle cx="254" cy="119" r="7" />
            </g>
            <g className={styles.floatSlow} filter="url(#history-shadow)">
                <circle cx="179" cy="77" r="54" fill="#fff" opacity=".16" />
                <circle cx="179" cy="77" r="43" fill="url(#history-clock)" />
                <circle cx="179" cy="77" r="34" fill="#fff" />
                <path d="M179 55v24l18 11" fill="none" stroke="#0B55C9" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="179" cy="77" r="5" fill="#0B55C9" />
            </g>
            <g className={styles.floatFast} transform="translate(39 25) rotate(-8)">
                <rect width="72" height="47" rx="12" fill="#fff" opacity=".96" />
                <path d="M15 28h5l5-12 8 23 8-18 6 12 5-5h7" fill="none" stroke="#0A58D3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="59" cy="13" r="5" fill="#FFC83D" />
            </g>
            <path d="M235 35l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FFE37B" />
        </svg>
    );
}

function ProfileArtwork() {
    return (
        <svg viewBox="0 0 280 160" role="presentation">
            <defs>
                <linearGradient id="profile-card" x1="0" y1="0" x2="1" y2="1">
                    <stop stopColor="#fff" stopOpacity=".98" />
                    <stop offset="1" stopColor="#DDF4FF" stopOpacity=".92" />
                </linearGradient>
                <filter id="profile-shadow" x="-35%" y="-35%" width="180%" height="190%">
                    <feDropShadow dy="10" stdDeviation="10" floodColor="#021744" floodOpacity=".3" />
                </filter>
            </defs>
            <g fill="none" stroke="#fff" strokeOpacity=".2">
                <ellipse cx="143" cy="80" rx="117" ry="48" transform="rotate(-12 143 80)" />
                <ellipse cx="143" cy="80" rx="86" ry="35" transform="rotate(19 143 80)" />
            </g>
            <circle cx="42" cy="93" r="6" fill="#FFC83D" />
            <circle cx="242" cy="52" r="5" fill="#73D8FF" />
            <g className={styles.floatSlow} filter="url(#profile-shadow)" transform="translate(69 27) rotate(3 70 53)">
                <rect width="142" height="106" rx="20" fill="url(#profile-card)" />
                <circle cx="42" cy="45" r="23" fill="#0A56CE" />
                <circle cx="42" cy="39" r="8" fill="#FFE181" />
                <path d="M27 61c4-12 26-12 30 0" fill="#FFE181" />
                <rect x="76" y="28" width="45" height="7" rx="3.5" fill="#0A429F" />
                <rect x="76" y="43" width="32" height="5" rx="2.5" fill="#75CDEA" />
                <rect x="23" y="79" width="91" height="6" rx="3" fill="#D0E5F4" />
            </g>
            <g className={styles.pulse} transform="translate(190 94)">
                <circle cx="21" cy="21" r="21" fill="#FFC83D" />
                <path d="M21 8l4 8 9 1-6 6 2 9-9-5-8 5 2-9-7-6 9-1z" fill="#fff" />
                <path d="M10 37l-4 15 13-7m13-8 4 15-13-7" fill="#F3B500" />
            </g>
        </svg>
    );
}

const artworkByVariant = {
    home: HomeArtwork,
    practice: PracticeArtwork,
    assignment: AssignmentArtwork,
    history: HistoryArtwork,
    profile: ProfileArtwork,
};

export default function HeroArtwork({ variant, className = '' }) {
    const Artwork = artworkByVariant[variant];
    if (!Artwork) return null;

    return (
        <div className={`${styles.artwork} ${className}`} aria-hidden="true">
            <Artwork />
        </div>
    );
}
