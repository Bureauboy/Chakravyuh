import React from "react";
import "./header.css";

export default function Header({ onNav, active }) {
  return (
    <div className="nav-container">
      <div className="nav-logo">CredChain</div>

      <div className="nav-links">
        <button
          className={"nav-btn " + (active === "issuer" ? "active" : "")}
          onClick={() => onNav("issuer")}
        >
          Issuer
        </button>

        <button
          className={"nav-btn " + (active === "verifier" ? "active" : "")}
          onClick={() => onNav("verifier")}
        >
          Verifier
        </button>

        <button
          className={"nav-btn " + (active === "wallet" ? "active" : "")}
          onClick={() => onNav("wallet")}
        >
          Wallet
        </button>
      </div>
    </div>
  );
}
