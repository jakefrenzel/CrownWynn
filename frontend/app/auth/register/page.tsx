"use client";
import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosInstance";
import Link from "next/link";

import Image from "next/image";
import styles from "@/css/Login.module.css";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    label: string;
    color: string;
  } | null>(null);
  const [showStrengthIndicator, setShowStrengthIndicator] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showUsernameError, setShowUsernameError] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);
  const [isUsernameErrorExiting, setIsUsernameErrorExiting] = useState(false);
  const [isPasswordErrorExiting, setIsPasswordErrorExiting] = useState(false);

  // Username validation: 3-20 characters, alphanumeric and underscores only, must start with a letter
  const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;
  
  // Password validation: 8-20 characters, at least one uppercase, one lowercase, one number
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,20}$/;

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

  const validatePassword = (password: string): string | null => {
    if (password.length === 0) {
      return null; // Don't show error for empty field
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (password.length > 20) {
      return "Password must be no more than 20 characters long";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/\d/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const calculatePasswordStrength = (password: string) => {
    if (password.length === 0) {
      if (showStrengthIndicator) {
        setIsExiting(true);
        setTimeout(() => {
          setShowStrengthIndicator(false);
          setIsExiting(false);
          setPasswordStrength(null);
        }, 300); // Match animation duration
      }
      return;
    }

    if (!showStrengthIndicator) {
      setShowStrengthIndicator(true);
    }

    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Character variety
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++; // Special characters
    
    // Determine strength
    let label = '';
    let color = '';
    
    if (score <= 2) {
      label = 'Weak';
      color = '#ff4444';
    } else if (score <= 4) {
      label = 'Fair';
      color = '#ff9800';
    } else if (score === 5) {
      label = 'Good';
      color = '#4ade80';
    } else {
      label = 'Strong';
      color = '#22c55e';
    }
    
    setPasswordStrength({ score, label, color });
  };

  // Clear errors when user types (no validation during typing)
  useEffect(() => {
    if (showUsernameError && username.length > 0) {
      setIsUsernameErrorExiting(true);
      setTimeout(() => {
        setShowUsernameError(false);
        setIsUsernameErrorExiting(false);
        setUsernameError("");
      }, 300);
    }
  }, [username]);

  // Clear errors when user types (no validation during typing)
  useEffect(() => {
    if (showPasswordError && password.length > 0) {
      setIsPasswordErrorExiting(true);
      setTimeout(() => {
        setShowPasswordError(false);
        setIsPasswordErrorExiting(false);
        setPasswordError("");
      }, 300);
    }
  }, [password]);

  // Real-time password strength calculation
  useEffect(() => {
    calculatePasswordStrength(password);
  }, [password]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate username
    const usernameValidationError = validateUsername(username);
    if (usernameValidationError) {
      setUsernameError(usernameValidationError);
      setShowUsernameError(true);
      return;
    }

    // Validate password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setShowPasswordError(true);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
                onChange={handlePasswordChange}
                maxLength={20}
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
            
            {showStrengthIndicator && passwordStrength && (
              <div className={`${styles.password_strength} ${isExiting ? styles.password_strength_exit : ''}`}>
                <div className={styles.strength_label}>Password Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span></div>
                <div className={styles.strength_bar_container}>
                  <div 
                    className={styles.strength_bar} 
                    style={{ 
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      backgroundColor: passwordStrength.color 
                    }}
                  />
                </div>
                {passwordStrength.score < 6 && (
                  <div className={styles.strength_hint}>💡 Tip: Add special characters (!@#$%^&*) for a stronger password</div>
                )}
              </div>
            )}
            
            <label className={`${styles.label} ${styles.spacing}`} htmlFor="confirmPassword">Confirm Password</label>
            <div className={styles.password_wrapper}>
              <input 
                className={styles.input} 
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword" 
                placeholder="Confirm Password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required />
              <button
                type="button"
                className={styles.eye_button}
                onMouseDown={() => setShowConfirmPassword(true)}
                onMouseUp={() => setShowConfirmPassword(false)}
                onMouseLeave={() => setShowConfirmPassword(false)}
                onTouchStart={() => setShowConfirmPassword(true)}
                onTouchEnd={() => setShowConfirmPassword(false)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? (
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
            
            {/* General form messages (reserved space) */}
            <div className={styles.message_container}>
              {showUsernameError && usernameError && <div className={styles.error_message}>{usernameError}</div>}
              {showPasswordError && passwordError && <div className={styles.error_message}>{passwordError}</div>}
              {loading && <div className={styles.loading_message}>Creating account...</div>}
              {error && <div className={styles.error_message}>{error}</div>}
              {success && <div className={styles.success_message}>{success}</div>}
            </div>
            
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "Creating Account..." : "Register"}
            </button>
        </form>

        <div className={styles.register_link_container}>
          <p className={styles.register_text}>
            Already have an account?{" "}
            <Link href="/auth/login" className={styles.register_link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
