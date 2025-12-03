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
            <h3 className={styles.section_title}>Support</h3>
            <div className={styles.support_links}>
              <Link className={styles.support_link} href="#" onClick={closeMenu}>
                <svg className={styles.link_icon} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
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