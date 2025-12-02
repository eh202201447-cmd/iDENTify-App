import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";
import { users } from "../data/users";

function Login({ setIsLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (user) {
      setIsLoggedIn(user.role);
      navigate("/app");
      toast.success("Logged in successfully.");
    } else {
      toast.error("Invalid username or password.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-visual__header">
          <div className="logo-circle">
            <img src={toothLogo} alt="iDENTify Logo" className="login-logo" />
          </div>
          <h1 className="login-visual__title">Welcome to iDENTify</h1>
        </div>
      </div>

      <div className="login-form-container">
        <form className="login-form" onSubmit={handleLogin}>
          <h2 className="login-form__title">Log in to your account</h2>
          <p className="login-form__subtitle">
            Please enter your username and password
          </p>
          <div className="login-form__group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="name@email.com"
            />
          </div>
          <div className="login-form__group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="login-form__button">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
