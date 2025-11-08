"use client";

import Header from '@/components/Header';
import styles from './page.module.css';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from '@/context/UserContext';
import axiosInstance from '@/lib/axiosInstance';

export default function Home() {

  const { user, loading } = useUser();
  const router = useRouter();

  const { balance, setBalance } = useUser();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login"); // only redirect if not logged in
    }
  }, [loading, user, router]);

  if (loading) {
    // 🌀 Show a loader instead of flashing page content
    return <div className="flex items-center justify-center h-screen">Loading content...</div>;
  }
  if (!user) return <div className="flex items-center justify-center h-screen">Loading user...</div>;;

 const addBalance = async (): Promise<void> => {
  const amount = 100;

  setBalance((prev: number) => {
    const newBalance = Math.round((prev + amount) * 100) / 100;
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




  return (
    <main className={styles.general}>
      <Header />
      <button onClick={() => addBalance()}>Click me!</button>
    </main>
  );
}
