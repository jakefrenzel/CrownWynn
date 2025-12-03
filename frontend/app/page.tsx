"use client";

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import styles from './page.module.css';
import Image from 'next/image';

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser, formatBalanceDisplay } from '@/context/UserContext';
import { useUI } from '@/context/UIContext';
import axiosInstance from '@/lib/axiosInstance';

export default function Home() {

  const { user, loading, welcomeBonusClaimed, claimWelcomeBonus } = useUser();
  const router = useRouter();
  const { firstTimeVisible, hideFirstTime, scrollOffset, setScrollOffset } = useUI();
  const firstTimeSectionRef = useRef<HTMLElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const { balance, setBalance } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login"); // only redirect if not logged in
    }
  }, [loading, user, router]);

  // Auto-apply scroll offset for users who already claimed welcome bonus
  useEffect(() => {
    if (!loading && user && welcomeBonusClaimed && firstTimeSectionRef.current && scrollableRef.current) {
      // Calculate the section's total height including margins
      const style = getComputedStyle(firstTimeSectionRef.current);
      const marginTop = parseFloat(style.marginTop);
      const marginBottom = parseFloat(style.marginBottom);
      const sectionHeight = firstTimeSectionRef.current.offsetHeight;
      
      const totalHeight = sectionHeight + marginTop + marginBottom;
      
      // Apply the offset to remove the gap
      setScrollOffset(totalHeight);
      hideFirstTime(); // Ensure the section is hidden
      
      console.log(`Auto-applied scroll offset for existing user: ${totalHeight}px`);
    }
  }, [loading, user, welcomeBonusClaimed, hideFirstTime, setScrollOffset]);

  if (loading) {
    // 🌀 Show a loader instead of flashing page content
    return (
      <div className="flex items-center justify-center h-screen page_loader" role="status" aria-live="polite">
        <div className="loader_inline" role="status" aria-live="polite">
          <svg className="loader_spinner" width="28" height="28" viewBox="0 0 50 50" aria-hidden="true">
            <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"></circle>
            <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"></path>
          </svg>
          <span className="loader_text">Checking session…</span>
        </div>
      </div>
    );
  }
  if (!user) return (
    <div className="flex items-center justify-center h-screen page_loader" role="status" aria-live="polite">
      <div className="loader_inline" role="status" aria-live="polite">
        <svg className="loader_spinner" width="28" height="28" viewBox="0 0 50 50" aria-hidden="true">
          <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5"></circle>
          <path d="M45 25a20 20 0 0 1-20 20" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"></path>
        </svg>
        <span className="loader_text">Checking session…</span>
      </div>
    </div>
  );;

 const addBalance = async (): Promise<void> => {
  const amount = 100;

  setBalance((prev: number) => {
    const newBalance = Math.round((prev + amount) * 100) / 100; // Ensure 2 decimal places
    updateBalance(newBalance);
    return newBalance;
  });
};

const updateBalance = async (newBalance: number): Promise<void> => {
  try {
    const res = await axiosInstance.patch<{ balance: number }>("/api/user/balance/", {
      balance: newBalance,
    });
    console.log("Balance updated:", res.data.balance);
  } catch (err) {
    console.error(err);
  }
};

const handleThanks = async () => {
    // First claim the welcome bonus
    const success = await claimWelcomeBonus();
    
    if (success && firstTimeSectionRef.current && scrollableRef.current) {
      // Get computed styles and dimensions
      const style = getComputedStyle(firstTimeSectionRef.current);
      const marginTop = parseFloat(style.marginTop);
      const marginBottom = parseFloat(style.marginBottom);
      const sectionHeight = firstTimeSectionRef.current.offsetHeight;
      
      // Calculate total height including margins
      const totalHeight = sectionHeight + marginTop + marginBottom;
      
      // Hide the section
      hideFirstTime();
      
      // Apply the negative margin to eliminate the gap
      setScrollOffset(totalHeight);
      
      console.log(`Welcome bonus claimed! Section hidden, offset applied: ${totalHeight}px`);
    } else if (!success) {
      console.log("Welcome bonus already claimed or failed to claim");
    }
  };

  return (
    <div>
      <Header />
      <Sidebar />
      <div className={styles.section}>
        <div 
          ref={scrollableRef}
          className={styles.scrollable}
          style={{
            marginTop: scrollOffset > 0 ? `-${scrollOffset}px` : '0px'
          }}
        >
          <section 
            ref={firstTimeSectionRef}
            className={`${styles.firstTimeSection} ${(!firstTimeVisible || welcomeBonusClaimed) ? styles.hidden : ''}`} 
            id="first-time-section"
          >
            <div className={styles.firstTimeHeading}>
              Welcome! As a new player, we’ve given you 1,000
              <Image
                src="/assets/crown.png"
                alt="Crown currency icon"
                className={styles.gemstoneImage}
                width={32}
                height={32}
              />
              to kickstart your experience.
            </div>
            <div className={styles.firstTimeSubtext}>Enjoy the games and have fun!</div>
            <div className={styles.attentionGetterButtons}>
              <button
                className={styles.createAccountButton}
                id="thanks-button"
                onClick={handleThanks}
              >
                Thanks!
              </button>
            </div>
          </section>

          <section className={styles.attentionGetter} id="attention-getter">
            <div className={styles.attentionGetterText}>
              Feel the Rush, Without the Risk—The #1 Destination for No-Risk Casino-Style Games
            </div>
            <div className={styles.attentionGetterSubtext}>
              Unlimited fun, Zero risks, Experience the thrill of your favorite games!
            </div>
            <div className={styles.attentionGetterSubtext}>
              All the fun, none of the risk—get started now!
            </div>
          </section>

          <main className={styles.mainSection}>
            <div className={styles.attentionGetterText}>Exciting Casino-Style Games!</div>
            <div className={styles.attentionGetterSubtext}>Can you beat the odds?</div>

            <div className={styles.gameSelection}>
              <div 
                className={styles.gameButton} 
                id="game-mines"
                onClick={() => router.push('/mines')}
                style={{ cursor: 'pointer' }}
              >
                Mines
              </div>
              <div 
                className={styles.gameButton} 
                id="game-keno"
                onClick={() => router.push('/keno')}
                style={{ cursor: 'pointer' }}
              >
                Keno
              </div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
            </div>

            <div className={styles.gameSelection}>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
              <div className={`${styles.gameButton} ${styles.comingSoon}`}>Coming</div>
            </div>
          </main>

          <section className={styles.informationSection}>
            <h3 className={`${styles.informationHeading} ${styles.informationFirst}`}>
              What is CrownWynn?
            </h3>
            <p className={styles.informationText}>
              CrownWynn is your ultimate destination for no-risk, casino-style games,
              offering a variety of exciting experiences. Whether you're into the fast-paced
              action of Plinko, the adrenaline-pumping crashes of Crash, or the classic
              number-drawing thrill of Keno, CrownWynn has something for everyone. The
              best part? You can enjoy it all without the risk—no real money, just pure fun!
            </p>

            <h4 className={styles.informationHeading}>What Can You Play on CrownWynn?</h4>
            <p className={styles.informationText}>
              Plinko: Drop the ball and watch it bounce through pegs, hoping it lands in the
              high-scoring slots! Plinko is all about chance and timing, making every drop an
              exhilarating experience.
            </p>
            <p className={styles.informationText}>
              Crash: Ride the multiplier as it rises higher and higher, but don’t wait too
              long—cash out before the crash! It’s a game of nerve and timing where your
              instincts can lead to big virtual rewards.
            </p>
            <p className={styles.informationText}>
              Keno: The classic number-drawing game where you pick your lucky numbers and see
              how many you can match. The more numbers you hit, the bigger your virtual payout!
            </p>

            <h4 className={styles.informationHeading}>Why Choose CrownWynn?</h4>
            <p className={styles.informationText}>
              No-Risk Fun: CrownWynn is designed for players who love casino-style games
              without the stress of real money gambling. You can play all you want and
              experience the thrill without any financial pressure.
            </p>
            <p className={styles.informationText}>
              Multiple Games, One Platform: With Plinko, Crash, Keno, and more games on the
              way, CrownWynn offers a diverse gaming experience in one place. You’ll never
              run out of ways to have fun.
            </p>
            <p className={styles.informationText}>
              Easy to Play, Hard to Put Down: Our games are simple to learn but keep you
              engaged round after round. Whether you're in the mood for strategy, luck, or
              fast-paced action, you'll find the perfect game.
            </p>

            <h4 className={styles.informationHeading}>Always Something New</h4>
            <p className={styles.informationText}>
              At CrownWynn, we’re constantly working to bring you new games and features.
              Whether you’re chasing the next big win in Plinko or holding your breath in
              Crash, you’ll always find fresh and exciting ways to play.
            </p>
          </section> 
        </div>
      </div>
    </div>
  );
}
