import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";
import { users } from "../data/users";

function Login({ setIsLoggedIn }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [errors, setErrors] = useState({});
	const navigate = useNavigate();

	const handleLogin = (e) => {
		e.preventDefault();

		const newErrors = {};
		let hasError = false;

		if (!username.trim()) {
			newErrors.username = "Username is required";
			hasError = true;
		}
		if (!password.trim()) {
			newErrors.password = "Password is required";
			hasError = true;
		}

		if (hasError) {
			setErrors(newErrors);
			return;
		}

		const user = users.find(
			(u) => u.username === username && u.password === password
		);

		if (user) {
			setIsLoggedIn(user.role);
			navigate("/app");
			toast.success("Logged in successfully.");
		} else {
			setErrors({ form: "Invalid username or password" });
			toast.error("Invalid username or password.");
		}
	};

	const handleInputChange = (field, value) => {
		if (field === "username") setUsername(value);
		if (field === "password") setPassword(value);

		if (errors[field] || errors.form) {
			setErrors((prev) => ({ ...prev, [field]: null, form: null }));
		}
	};

	return (
		<div className="login-page">
			<div className="login-visual">
				<div className="login-visual__header">
					<h1 className="login-visual__title">Welcome to iDENTify</h1>
					<p className="login-visual__subtitle">
						Dental Clinic Management System
					</p>
				</div>
			</div>

			<div className="login-form-container">
				<form className="login-form" onSubmit={handleLogin}>
					<div className="login-form__header-center">
						<div className="logo-circle-large">
							<img src={toothLogo} alt="iDENTify Logo" className="login-logo-large" />
						</div>
						<h2 className="login-form__title">Welcome Back</h2>
						<p className="login-form__subtitle">
							Log in to your account
						</p>
					</div>

					{errors.form && <div className="error-banner">{errors.form}</div>}

					<div className="login-form__group">
						<label htmlFor="username">Username</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => handleInputChange("username", e.target.value)}
							placeholder="name@email.com"
							className={errors.username || errors.form ? "input-error" : ""}
						/>
						{errors.username && <span className="error-text">{errors.username}</span>}
					</div>

					<div className="login-form__group">
						<label htmlFor="password">Password</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => handleInputChange("password", e.target.value)}
							placeholder="••••••••"
							className={errors.password || errors.form ? "input-error" : ""}
						/>
						{errors.password && <span className="error-text">{errors.password}</span>}
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