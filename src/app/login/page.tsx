"use client";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Submit password to server for validation
    fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError("Incorrect password.");
      }
    })
    .catch(() => {
      setError("Network error. Please try again.");
    });
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", textAlign: "center" }}>
      <h2>Enter Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />
        <button type="submit" style={{ width: "100%", padding: 8 }}>
          Login
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}