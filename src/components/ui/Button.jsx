import styles from './Button.module.css';

export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...props} />;
}
