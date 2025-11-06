"use client";

import { useState } from "react";
import axios from "axios";

export async function login(username: string, password: string) {
  try {
    const res = await axios.post("http://localhost:8000/api/token/", {
      username,
      password,
    });

    const { access, refresh } = res.data;

    // ⚠️ This is fine for dev, but use HttpOnly cookies for production.
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);

    return true;
  } catch (err) {
    console.error("Login failed:", err);
    return false;
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent full page reload
    setError("");

    const success = await login(username, password);
    if (!success) {
      setError("Invalid username or password");
    } else {
      // redirect or show success
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 w-64 bg-white/10 p-4 rounded-lg shadow"
      >
        <input
          type="text"
          placeholder="Username"
          className="border p-2 rounded"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded mt-2"
        >
          Login
        </button>
      </form>
    </div>
  );
}
