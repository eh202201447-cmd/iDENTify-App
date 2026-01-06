import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import toothLogo from "../assets/toothlogo.svg";
import "../styles/pages/Login.css";
import { users } from "../data/users";

function Login({ setIsLoggedIn }) {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
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
						<div className="password-input-wrapper">
							<input
								type={showPassword ? "text" : "password"}
								id="password"
								value={password}
								onChange={(e) => handleInputChange("password", e.target.value)}
								placeholder="••••••••"
								className={errors.password || errors.form ? "input-error" : ""}
							/>
							<button
								type="button"
								className="password-toggle-btn"
								onClick={() => setShowPassword(!showPassword)}
								aria-label={showPassword ? "Hide password" : "Show password"}
							>
								{showPassword ? (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
									</svg>
								) : (
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
										<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
										<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
								)}
							</button>
						</div>
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