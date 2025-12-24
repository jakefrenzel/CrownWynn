"use client";

import styles from "@/css/Sidebar.module.css";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useUI } from "@/context/UIContext";

export default function Sidebar() {
  const { menuOpen, closeMenu } = useUI();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (menuOpen && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>("a,button,input,select,textarea");
      first?.focus();
    }
  }, [menuOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    if (menuOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  return (
    <>
      <aside
        ref={panelRef}
        role="navigation"
        aria-label="Main"
        className={`${styles.sidebar} ${menuOpen ? styles.sidebar_open : ""}`}
      >
        <div className={styles.sidebar_content}>
          <div className={styles.section}>
            <h3 className={styles.section_title}>Games</h3>
            <div className={styles.game_list}>
              <Link className={styles.game_card} href="/games/mines" onClick={closeMenu}>
                <div className={styles.game_icon}>💣</div>
                <div className={styles.game_name}>Mines</div>
              </Link>
              <Link className={styles.game_card} href="/games/keno" onClick={closeMenu}>
                <div className={styles.game_icon}>🎱</div>
                <div className={styles.game_name}>Keno</div>
              </Link>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.section}>
            <h3 className={styles.section_title}>Community</h3>
            <div className={styles.game_list}>
              <Link className={styles.game_card} href="/leaderboard" onClick={closeMenu}>
                <div className={styles.game_icon}>🏆</div>
                <div className={styles.game_name}>Leaderboard</div>
              </Link>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.section}>
            <h3 className={styles.section_title}>Support</h3>
            <div className={styles.support_links}>
              <Link className={styles.support_link} href="#" onClick={closeMenu}>
                <svg className={styles.link_icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.975 14.975 0 0 0 1.293-2.1a.07.07 0 0 0-.038-.098a13.11 13.11 0 0 1-1.872-.892a.072.072 0 0 1-.009-.119a10.516 10.516 0 0 0 .372-.294a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .075.01c.12.098.246.198.373.292a.072.072 0 0 1-.008.119a12.901 12.901 0 0 1-1.873.892a.075.075 0 0 0-.037.097a14.993 14.993 0 0 0 1.293 2.1a.074.074 0 0 0 .084.028a19.963 19.963 0 0 0 6.002-3.03a.076.076 0 0 0 .032-.054c.5-4.786-.838-8.895-3.549-12.55a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156c0-1.193.964-2.157 2.157-2.157c1.193 0 2.157.964 2.157 2.157c0 1.191-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156c0-1.193.964-2.157 2.157-2.157c1.192 0 2.157.964 2.157 2.157c0 1.191-.965 2.156-2.157 2.156z"/>
                </svg>
                Discord
              </Link>
              <Link className={styles.support_link} href="#" onClick={closeMenu}>
                <svg className={styles.link_icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </aside>
      {menuOpen && <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" />}
    </>
  );
}