"use client";

import Header from '@/components/Header';
import styles from './page.module.css';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import axiosInstance from '@/lib/axiosInstance';
import { useUser } from '@/context/UserContext';
import axios from 'axios';

export default function Home() {

  const { balance, setBalance } = useUser();

  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access");

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
