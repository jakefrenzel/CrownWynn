import styles from '@/css/Header.module.css';
import Image from "next/image";
import { useEffect, useState } from 'react';
import api from "@/lib/axiosInstance";
import { useUser } from "@/context/UserContext";

export default function Header() {
    const { user, balance, setBalance } = useUser(); // ✅ get balance from context
    const [loading, setLoading] = useState(true);    // ✅ local loading only

    useEffect(() => {
        const fetchBalance = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get("/api/user/balance/");
                setBalance(res.data.balance);
            } catch (err) {
                // Not logged in or request failed; show placeholder
                console.warn("Balance fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBalance();
    }, [user, setBalance]);

    return (
        <header className={styles.header}>
            <div className={`${styles.header_segments} ${styles.header_logo_container}`}>
                <div className={styles.header_logo}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#e3e3e3">
                        <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
                    </svg>
                    <div className={styles.logo}>test</div>
                </div>
            </div>

            <div className={styles.header_segments}>
                <div className={styles.balance_container}>
                    <div className={styles.text}>
                        {loading ? "loading..." : balance ?? "—"}
                    </div>
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
