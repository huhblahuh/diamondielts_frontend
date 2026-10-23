import styles from './Input.module.css';

export default function Input({ className = '', appearance = 'default', type = 'text', ...props }) {
  return <input type={type} className={[styles.input, appearance === 'bare' && styles.bare, className].filter(Boolean).join(' ')} {...props} />;
}
