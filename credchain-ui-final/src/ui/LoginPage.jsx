import React from "react";
import "./LoginPage.css";

export default function LoginPage({ onSelect }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="title">Welcome to CredChain</h1>
        <p className="subtitle">Login as</p>

        <div className="button-group">
          <button className="login-btn" onClick={() => onSelect("student")}>
            🎓 Student Wallet
          </button>

          <button className="login-btn" onClick={() => onSelect("issuer")}>
            🏛️ Issuer
          </button>

          <button className="login-btn" onClick={() => onSelect("verifier")}>
            🔎 Verifier
          </button>
        </div>
      </div>
    </div>
  );
}
