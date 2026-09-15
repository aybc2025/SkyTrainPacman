import styles from './Button.module.css';

export default function Button({ variant = 'primary', children, ...rest }) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[variant]} pressable`}
      {...rest}
    >
      {children}
    </button>
  );
}
