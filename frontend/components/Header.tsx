import styles from '@/css/Header.module.css';
import Image from "next/image";

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={`${styles.header_segments} ${styles.header_logo_container}`}>
                <div className={styles.header_logo}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#e3e3e3"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
                    <div className={styles.logo}>test</div>
                </div>
            </div>
            <div className={styles.header_segments}>
                <div className={styles.balance_container}>
                    <div className={styles.text}>1000</div>
                    <Image
                        src="/assets/crown.png"
                        alt="Crown currency icon"
                        className={styles.crown_image}
                        width={32}
                        height={32}
                        priority
                    />
                </div>
            </div>
            <div className={`${styles.header_segments} ${styles.header_button_container}`}>
                <button className={styles.login_button}>Login</button>
                <button className={styles.header_button}>Register</button>
            </div>
        </header>
    );
}