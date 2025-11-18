"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";
import Link from "next/link";

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
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);

  // Username validation: 3-20 characters, alphanumeric and underscores only, must start with a letter
  const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

  const validateUsername = (username: string): string | null => {
    if (username.length === 0) {
      return null; // Don't show error for empty field
    }
    if (username.length < 3) {
      return "Username must be at least 3 characters long";
    }
    if (username.length > 20) {
      return "Username must be no more than 20 characters long";
    }
    if (!/^[a-zA-Z]/.test(username)) {
      return "Username must start with a letter";
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores";
    }
    if (!USERNAME_REGEX.test(username)) {
      return "Invalid username format";
    }
    return null;
  };

  // Debounced validation effect
  useEffect(() => {
    if (!usernameTouched) return;
    
    const timer = setTimeout(() => {
      const error = validateUsername(username);
      setUsernameError(error || "");
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [username, usernameTouched]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (!usernameTouched) setUsernameTouched(true);
    // Clear error immediately while typing
    if (usernameError) setUsernameError("");
  };

  const handleUsernameBlur = () => {
    setUsernameTouched(true);
    const error = validateUsername(username);
    setUsernameError(error || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate username before making request
    const usernameValidationError = validateUsername(username);
    if (usernameValidationError) {
      setError(usernameValidationError);
      return;
    }

    // Check if password is not empty
    if (!password || password.trim().length === 0) {
      setError("Password is required");
      return;
    }

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
            <div className={styles.label_with_counter}>
              <label className={styles.label} htmlFor="username">Username</label>
              <span className={styles.character_counter}>{username.length}/20</span>
            </div>
            <input 
              className={styles.input} 
              type="text" 
              name="username" 
              placeholder="Username..." 
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              pattern="[a-zA-Z][a-zA-Z0-9_]{2,19}"
              title="Username must be 3-20 characters, start with a letter, and contain only letters, numbers, and underscores"
              minLength={3}
              maxLength={20}
              required 
            />
            <label className={`${styles.label} ${styles.spacing}`} htmlFor="password">Password</label>
            <div className={styles.password_wrapper}>
              <input 
                className={styles.input} 
                type={showPassword ? "text" : "password"}
                name="password" 
                placeholder="Password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required />
              <button
                type="button"
                className={styles.eye_button}
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                onTouchStart={() => setShowPassword(true)}
                onTouchEnd={() => setShowPassword(false)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                    <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
                    <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
                    <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Reserved space for messages to prevent layout shift */}
            <div className={styles.message_container}>
              {usernameError && <div className={styles.error_message}>{usernameError}</div>}
              {loading && <div className={styles.loading_message}>Signing in...</div>}
              {error && <div className={styles.error_message}>{error}</div>}
              {success && <div className={styles.success_message}>{success}</div>}
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>

        <div className={styles.register_link_container}>
          <p className={styles.register_text}>
            Don't have an account?{" "}
            <Link href="/register" className={styles.register_link}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
