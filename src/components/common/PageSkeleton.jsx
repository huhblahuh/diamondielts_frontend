import React from 'react';
import { useLocation } from 'react-router-dom';
import styles from './PageSkeleton.module.css';

const Shape = ({ className = '' }) => <span className={`${styles.shape} ${className}`} />;
const Lines = ({ count = 2 }) => <div className={styles.lines}>{Array.from({ length: count }, (_, i) => <Shape key={i} className={i === count - 1 ? styles.shortLine : styles.line} />)}</div>;
const Heading = ({ action = false }) => <div className={styles.heading}><Lines /><Shape className={action ? styles.button : styles.pill} /></div>;
const Card = ({ children, className = '' }) => <div className={`${styles.card} ${className}`}>{children}</div>;
const Hero = ({ tall = false }) => <div className={`${styles.hero} ${tall ? styles.heroTall : ''}`}><div className={styles.heroCopy}><Shape className={styles.heroEyebrow} /><Shape className={styles.heroTitle} /><Shape className={styles.heroSubtitle} /></div><Shape className={styles.heroArt} /></div>;
const Toolbar = () => <Card className={styles.toolbar}><Shape className={styles.search} /><div className={styles.toolbarActions}><Shape className={styles.pill} /><Shape className={styles.pill} /><Shape className={styles.button} /></div></Card>;
const Rows = ({ count = 4 }) => <div className={styles.rows}>{Array.from({ length: count }, (_, i) => <div className={styles.row} key={i}><Shape className={styles.avatar} /><Lines /><Shape className={styles.button} /></div>)}</div>;
const Stats = ({ count = 3 }) => <div className={`${styles.stats} ${count === 4 ? styles.statsFour : ''} ${count === 2 ? styles.statsTwo : ''}`}>{Array.from({ length: count }, (_, i) => <Card className={styles.stat} key={i}><Shape className={styles.icon} /><Lines /></Card>)}</div>;
const Table = () => <Card className={styles.table}><div className={styles.tableHead}>{Array.from({ length: 5 }, (_, i) => <Shape className={styles.line} key={i} />)}</div>{Array.from({ length: 5 }, (_, i) => <div className={styles.tableRow} key={i}>{Array.from({ length: 5 }, (_, j) => <Shape className={styles.line} key={j} />)}</div>)}</Card>;
const TopicRows = () => <div className={styles.topicRows}>{Array.from({ length: 2 }, (_, row) => <div className={styles.topicRow} key={row}>{Array.from({ length: 3 }, (_, column) => <Card className={styles.topicCard} key={column}><Lines /><Shape className={styles.pill} /></Card>)}</div>)}</div>;
const Home = () => <><Hero /><Stats /><Card className={styles.quotaStrip}><Shape className={styles.icon} /><Lines /></Card><div className={styles.homePrimary}><Card className={styles.homePractice}><Lines count={3} /><Shape className={styles.button} /></Card><Card className={styles.homeDeadline}><Heading /><Rows count={1} /></Card></div><Card className={styles.homeRhythm}><Heading /><div className={styles.weekGrid}>{Array.from({ length: 7 }, (_, i) => <Shape className={styles.day} key={i} />)}</div></Card><Card className={styles.homeQuick}><Heading /><div className={styles.quickGrid}>{Array.from({ length: 3 }, (_, i) => <Shape className={styles.quickItem} key={i} />)}</div></Card></>;

function getPageKind(path) {
    if (/\/settings(?:\/|$)/.test(path)) return 'settings';
    if (/\/dashboard\/progress$/.test(path)) return 'progress';
    if (/\/quota-dashboard$/.test(path)) return 'quota';
    if (/\/users$/.test(path)) return 'users';
    if (/\/history$/.test(path)) return 'history';
    if (/\/speaking\//.test(path)) return 'speaking';
    if (/\/assignments\/[^/]+$/.test(path)) return 'assignmentDetail';
    if (/\/assignment\/edit\/|\/create-speaking$/.test(path)) return 'builder';
    if (/\/assignment\/[^/]+$/.test(path)) return 'review';
    if (/\/exercises$/.test(path)) return 'exercises';
    if (/\/practice$/.test(path)) return 'practice';
    if (/\/classrooms$/.test(path) && !path.startsWith('/student')) return 'teacherClassrooms';
    if (/\/classrooms$|\/assignments$/.test(path)) return 'classrooms';
    if (/\/dashboard$|\/(student|teacher|admin)$/.test(path)) return path.startsWith('/student') ? 'studentDashboard' : 'teacherDashboard';
    return 'studentDashboard';
}

export default function PageSkeleton({ variant }) {
    const { pathname } = useLocation();
    const kind = variant || getPageKind(pathname);
    let content;

    switch (kind) {
        case 'studentDashboard':
            content = <Home />;
            break;
        case 'teacherDashboard':
            content = <><Toolbar /><div className={styles.twoColumns}><Card><Heading /><Shape className={styles.largeBlock} /></Card><Card><Heading /><Shape className={styles.largeBlock} /></Card></div><Card><Heading /><Shape className={styles.chart} /></Card></>;
            break;
        case 'progress':
            content = <><Home /><Card className={styles.progressDialog}><Shape className={styles.avatarLarge} /><Lines count={3} /><Stats count={2} /><Shape className={styles.chart} /></Card></>;
            break;
        case 'quota':
            content = <><Hero /><Card className={styles.quotaFilters}><div className={styles.formGrid}>{Array.from({ length: 4 }, (_, i) => <div key={i}><Shape className={styles.shortLine} /><Shape className={styles.input} /></div>)}</div></Card><div className={styles.twoColumns}><Card><Heading /><Shape className={styles.chart} /></Card><Card><Heading /><Shape className={styles.chart} /></Card></div><Card><Heading /><Shape className={styles.chart} /></Card></>;
            break;
        case 'practice':
            content = <><Hero /><TopicRows /></>;
            break;
        case 'classrooms':
            content = <><Hero /><Card className={styles.classroomContent}><Toolbar /><Rows count={5} /></Card></>;
            break;
        case 'teacherClassrooms':
            content = <><Heading action /><div className={styles.cardGrid}>{Array.from({ length: 6 }, (_, i) => <Card key={i}><Shape className={styles.pill} /><Lines count={3} /><Shape className={styles.wideLine} /></Card>)}</div></>;
            break;
        case 'history':
            content = <><Hero /><Card className={styles.historyContent}><Toolbar /><Table /></Card></>;
            break;
        case 'users':
            content = <><Heading action /><Toolbar /><Table /></>;
            break;
        case 'table':
            content = <Table />;
            break;
        case 'charts':
            content = <><div className={styles.twoColumns}><Card><Heading /><Shape className={styles.chart} /></Card><Card><Heading /><Shape className={styles.chart} /></Card></div><Card><Heading /><Shape className={styles.chart} /></Card></>;
            break;
        case 'settings':
            content = <div className={styles.settingsShell}><div className={styles.settingsSidebar}><Shape className={styles.avatarLarge} /><Lines count={3} /><Rows count={3} /></div><div className={styles.settingsContent}><Heading /><div className={styles.formGrid}>{Array.from({ length: 4 }, (_, i) => <div key={i}><Shape className={styles.shortLine} /><Shape className={styles.input} /></div>)}</div><Shape className={styles.button} /></div></div>;
            break;
        case 'assignmentDetail':
        case 'review':
            content = <><Hero /><Card><Heading action /><Rows count={3} /></Card><Card><Heading /><Rows count={4} /></Card></>;
            break;
        case 'builder':
            content = <><Heading action /><div className={styles.builderGrid}><Card><Heading /><div className={styles.formGrid}>{Array.from({ length: 4 }, (_, i) => <div key={i}><Shape className={styles.shortLine} /><Shape className={styles.input} /></div>)}</div></Card><Card><Heading /><Shape className={styles.largeBlock} /><Shape className={styles.largeBlock} /></Card></div></>;
            break;
        case 'speaking':
            content = <div className={styles.studioShell}><div className={styles.studioSidebar}><Heading /><Rows count={4} /></div><div className={styles.studio}><Heading action /><Shape className={styles.largeBlock} /><Shape className={styles.recordButton} /><Shape className={styles.wideLine} /></div></div>;
            break;
        case 'exercises':
            content = <><Heading action /><Toolbar /><div className={styles.cardGrid}>{Array.from({ length: 6 }, (_, i) => <Card key={i}><Shape className={styles.icon} /><Lines count={3} /><Shape className={styles.button} /></Card>)}</div></>;
            break;
        case 'topicGrid':
            content = <div className={styles.cardGrid}>{Array.from({ length: 6 }, (_, i) => <Card key={i}><Shape className={styles.icon} /><Lines count={3} /><Shape className={styles.button} /></Card>)}</div>;
            break;
        default:
            content = <><Heading /><Rows /></>;
    }

    return <div className={`${styles.page} ${styles[kind] || ''} ${kind === 'settings' && /\/settings$/.test(pathname) ? styles.settingsRoot : ''}`} role="status" aria-label="Đang tải trang" aria-busy="true">{content}</div>;
}
