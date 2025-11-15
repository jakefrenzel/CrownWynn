"use client";

import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";

import Image from "next/image";
import styles from "@/css/Login.module.css";

export async function login(username: string, password: string) {
  try {
    // ✅ Hit your cookie-based login endpoint
    await axiosInstance.post("/api/login/", { username, password });

    // ✅ Immediately fetch CSRF cookie after successful login
    await axiosInstance.get("/api/csrf/");
    console.log("CSRF cookie set!");

    return true;
  } catch (error) {
    console.error("Login failed:", error);
    return false;
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const loginSuccess = await login(username, password);
    setLoading(false);
    
    if (!loginSuccess) {
      setError("Invalid username or password");
    } else {
      setSuccess("Login successful! Redirecting...");
      // ✅ Brief delay to show success message before redirect
      window.location.href = "/";
      
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.login_container}>

        {/* CrownWynn logo */}
        <Image
            src="/assets/crown.png"
            alt="Crown currency icon"
            className={styles.gemstoneImage}
            width={32}
            height={32}
            priority
        />

        {/* Header and details */}
        <h4 className={styles.login_header}>Welcome back</h4> 
        <p className={styles.details}>Please enter your details to sign in</p>

        <hr className={styles.break} /> 

        {/* Login form */}
        <form className={styles.login_form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input 
              className={styles.input} 
              type="text" 
              name="username" 
              placeholder="Username..." 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
            <label className={`${styles.label} ${styles.spacing}`} htmlFor="password">Password</label>
            <input 
              className={styles.input} 
              type="password" 
              name="password" 
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required />
            
            {loading && <div className={styles.loading_message}>Signing in...</div>}
            {error && <div className={styles.error_message}>{error}</div>}
            {success && <div className={styles.success_message}>{success}</div>}

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>
      </div>
    </main>
  );
}
