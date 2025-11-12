"use client";
import { useState } from "react";
import axiosInstance from "@/lib/axiosInstance";

import Image from "next/image";
import styles from "@/css/Login.module.css";

export default function RegisterPage() {
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

    try {
      const res = await axiosInstance.post("/api/register/", {
        username,
        password,
      });
      setLoading(false);
      setSuccess("Registered successfully! You can now log in.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      setError(error.response?.data?.error || "Something went wrong.");
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.login_container}>

        {/* CrownWynn logo */}
        <Image
            src="/assets/crown.png"
            alt="Crown currency icon"
            className={styles.crown_image}
            width={32}
            height={32}
            priority
        />

        {/* Header and details */}
        <h4 className={styles.login_header}>Create Account</h4> 
        <p className={styles.details}>Please enter your details to register</p>

        <hr className={styles.break} /> 

        {/* Login form */}
        <form className={styles.login_form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="username">Username</label>
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
            
            {loading && <div className={styles.loading_message}>Creating account...</div>}
            {error && <div className={styles.error_message}>{error}</div>}
            {success && <div className={styles.success_message}>{success}</div>}
            
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Register"}
            </button>
        </form>
      </div>
    </main>
  );
}
