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
        <div className={styles.slideout_section}>
          <Link className={styles.support_button} href="/" onClick={closeMenu}>Home</Link>
        </div>
        <div className={styles.slideout_section}>
          <div className={styles.menu_label}>Games</div>
          <Link className={styles.slideout_button} href="/keno" onClick={closeMenu}>KENO</Link>
          <Link className={styles.slideout_button} href="/crash" onClick={closeMenu}>CRASH</Link>
          <Link className={styles.slideout_button} href="/plinko" onClick={closeMenu}>PLINKO</Link>
        </div>
        <div className={styles.slideout_section}>
          <div className={styles.menu_label}>Support</div>
          <Link className={styles.support_button} href="/discord" onClick={closeMenu}>Join discord!</Link>
          <Link className={styles.support_button} href="/terms" onClick={closeMenu}>Terms & Conditions</Link>
          <Link className={styles.support_button} href="/privacy" onClick={closeMenu}>Privacy Policy</Link>
        </div>
      </aside>
      {menuOpen && <div className={styles.backdrop} onClick={closeMenu} aria-hidden="true" />}
    </>
  );
}