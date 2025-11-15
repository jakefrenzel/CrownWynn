import styles from '@/css/Header.module.css';
import Image from "next/image";
import { useEffect, useState } from 'react';
import api from "@/lib/axiosInstance";
import { useUI } from "@/context/UIContext";
import { useUser, formatBalanceDisplay } from "@/context/UserContext";
import Link from "next/link";

export default function Header() {
    const { user, balance, setBalance, logout } = useUser(); // ✅ get logout from context
    const [loading, setLoading] = useState(true);    // ✅ local loading only
    const { toggleMenu } = useUI();

    const handleLogout = async () => {
        await logout();
    };



    useEffect(() => {
        const formatBalance = (balance: number | string): number => {
            const num = typeof balance === 'string' ? parseFloat(balance) : balance;
            return Math.round((num || 0) * 100) / 100;
        };

        const fetchBalance = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get("/api/user/balance/");
                setBalance(formatBalance(res.data.balance));
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
                    <button onClick={toggleMenu} aria-label="Open menu">
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#e3e3e3">
                            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
                        </svg>
                    </button>
                    <div className={styles.logo}>test</div>
                </div>
            </div>

            <div className={styles.header_segments}>
                <div className={styles.balance_container}>
                    <div className={styles.text}>
                        {loading ? "loading..." : formatBalanceDisplay(balance ?? 0)}
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
                {user ? (
                    <button onClick={handleLogout} className={styles.header_button}>
                        Logout
                    </button>
                ) : (
                    <>
                        <Link href="/login" className={styles.login_button}>Login</Link>
                        <Link href="/register" className={styles.header_button}>Register</Link>
                    </>
                )}
            </div>
        </header>
    );
}
