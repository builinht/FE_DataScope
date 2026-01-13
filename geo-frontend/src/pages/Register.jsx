import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
    padding: "2rem",
    textAlign: "center",
  },
  title: { fontSize: "1.8rem", margin: "0 0 0.5rem 0", color: "#111827" },
  subtitle: { margin: "0 0 1.25rem 0", color: "#6b7280", fontSize: "0.95rem" },
  errorBox: {
    textAlign: "left",
    background: "#fff7f7",
    borderLeft: "4px solid #ef4444",
    color: "#b91c1c",
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    borderRadius: 6,
    fontSize: "0.95rem",
  },
  form: { display: "flex", flexDirection: "column" },
  input: {
    width: "100%",
    padding: "0.75rem",
    marginBottom: "0.75rem",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    outline: "none",
    fontSize: "0.95rem",
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  inputFocus: {
    borderColor: "#60a5fa",
    boxShadow: "0 0 0 6px rgba(96,165,250,0.08)",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.75rem",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.18s",
  },
  btnIcon: { width: 20, height: 20 },
  footer: { marginTop: "1rem", fontSize: "0.85rem", color: "#6b7280" },
  link: { color: "#2563eb", cursor: "pointer", textDecoration: "underline" },
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(null);

  const handleRegister = async () => {
    try {
      await register(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div>
          <h1 style={styles.title}>🌍 GeoInsight</h1>
          <p style={styles.subtitle}>
            Create your account to access your geographic data dashboard
          </p>
        </div>

        {error && (
          <div style={styles.errorBox} role="alert">
            <p>{error}</p>
          </div>
        )}

        <form
          style={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleRegister();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            aria-label="Email"
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused("email")}
            onBlur={() => setFocused(null)}
            style={{
              ...styles.input,
              ...(focused === "email" ? styles.inputFocus : {}),
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            aria-label="Password"
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")}
            onBlur={() => setFocused(null)}
            style={{
              ...styles.input,
              ...(focused === "password" ? styles.inputFocus : {}),
            }}
          />

          <button type="submit" style={styles.button}>
            <svg
              style={styles.btnIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Sign Up
          </button>
        </form>

        <div style={styles.footer}>
          <p>
            Already have an account?{" "}
            <span
              role="button"
              tabIndex={0}
              style={styles.link}
              onClick={() => navigate("/login")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate("/login");
              }}
            >
              Log in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
