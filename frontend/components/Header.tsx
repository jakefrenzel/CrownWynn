import styles from '@/css/Header.module.css';
import Image from "next/image";
import { useEffect, useState } from 'react';
import api from "@/lib/axiosInstance";
import { useUI } from "@/context/UIContext";
import { useUser, formatBalanceDisplay } from "@/context/UserContext";
import Link from "next/link";
import { checkDailyReward, claimDailyReward } from '@/lib/dailyRewardApi';

interface HeaderProps {
    onStatsClick?: () => void;
}

export default function Header({ onStatsClick }: HeaderProps = {}) {
    const { user, balance, setBalance, logout } = useUser(); // ✅ get logout from context
    const [loading, setLoading] = useState(true);    // ✅ local loading only
    const { toggleMenu } = useUI();
    const [canClaim, setCanClaim] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [dailyMessage, setDailyMessage] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

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

    useEffect(() => {
        const checkDaily = async () => {
            if (!user) return;
            try {
                const status = await checkDailyReward();
                setCanClaim(status.can_claim);
                setTimeRemaining(status.time_remaining);
            } catch (err) {
                console.warn('Daily reward check failed', err);
            }
        };

        checkDaily();
        const interval = setInterval(checkDaily, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        if (timeRemaining <= 0) return;
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    setCanClaim(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeRemaining]);

    const handleClaimDaily = async () => {
        setIsClaiming(true);
        try {
            const response = await claimDailyReward();
            setDailyMessage(response.message);
            setShowDailyModal(true);
            setCanClaim(false);
            setTimeRemaining(12 * 60 * 60);
            setBalance(parseFloat(response.new_balance));
        } catch (err: any) {
            setDailyMessage(err.response?.data?.error || 'Failed to claim daily reward');
            setShowDailyModal(true);
        } finally {
            setIsClaiming(false);
        }
    };

    const formatTimeRemaining = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}h ${minutes}m ${secs}s`;
    };

    return (
        <header className={styles.header}>
            <div className={`${styles.header_segments} ${styles.header_logo_container}`}>
                <div className={styles.header_logo}>
                    <button onClick={toggleMenu} aria-label="Open menu">
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="#e3e3e3">
                            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/>
                        </svg>
                    </button>
                    <div className={styles.logo}>CrownWynn</div>
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
                    <>
                        <button 
                            onClick={handleClaimDaily} 
                            className={styles.header_button}
                            disabled={!canClaim || isClaiming}
                            style={{
                                opacity: (canClaim && !isClaiming) ? 1 : 0.6,
                                cursor: (canClaim && !isClaiming) ? 'pointer' : 'not-allowed',
                                position: 'relative'
                            }}
                        >
                            {isClaiming ? (
                                <svg className={styles.daily_spinner} width="16" height="16" viewBox="0 0 50 50">
                                    <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4"></circle>
                                    <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"></path>
                                </svg>
                            ) : canClaim ? 'Daily' : formatTimeRemaining(timeRemaining)}
                        </button>
                        {onStatsClick && (
                            <button onClick={onStatsClick} className={styles.header_button}>
                                Stats
                            </button>
                        )}
                        <button onClick={handleLogout} className={styles.header_button}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/auth/login" className={styles.login_button}>Login</Link>
                        <Link href="/auth/register" className={styles.header_button}>Register</Link>
                    </>
                )}
            </div>

            {showDailyModal && (
                <div className={styles.modal_overlay} onClick={() => setShowDailyModal(false)}>
                    <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modal_header}>
                            <h2>Daily Reward</h2>
                            <button className={styles.modal_close} onClick={() => setShowDailyModal(false)}>✕</button>
                        </div>
                        <div className={styles.modal_body}>
                            <p>{dailyMessage}</p>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
