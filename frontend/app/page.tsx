"use client";

import Header from '@/components/Header';
import styles from './page.module.css';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      router.replace("/login"); // redirect before render
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    // 🌀 Show a loader instead of flashing page content
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <main className={styles.general}>
      <Header />
    </main>
  );
}
