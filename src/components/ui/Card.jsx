import styles from './Card.module.css';

export default function Card({ as: Element = 'div', className = '', ...props }) {
  return <Element className={[styles.card, className].filter(Boolean).join(' ')} {...props} />;
}
