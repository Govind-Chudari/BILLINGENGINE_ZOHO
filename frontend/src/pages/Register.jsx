import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import {
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

function Spinner() {
  return (
    <div
      className="w-4 h-4 border-2 border-white/30 border-t-white
                    rounded-full animate-spin shrink-0"
    />
  );
}

function strengthInfo(pass) {
  if (!pass) return null;
  if (pass.length < 6)
    return {
      label: "Too short",
      w: "w-1/5",
      bar: "bg-red-500",
      text: "text-red-500",
    };
  if (pass.length < 8)
    return {
      label: "Weak",
      w: "w-2/5",
      bar: "bg-orange-400",
      text: "text-orange-500",
    };
  if (!/[0-9]/.test(pass))
    return {
      label: "Medium",
      w: "w-3/5",
      bar: "bg-yellow-400",
      text: "text-yellow-600",
    };
  if (!/[A-Z]/.test(pass))
    return {
      label: "Good",
      w: "w-4/5",
      bar: "bg-green-400",
      text: "text-green-600",
    };
  return {
    label: "Strong",
    w: "w-full",
    bar: "bg-brand-600",
    text: "text-brand-600",
  };
}

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const strength = strengthInfo(form.password);
  const mismatch = form.confirm && form.confirm !== form.password;

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (!form.username.trim()) return setError("Username is required");
    if (form.username.length < 3)
      return setError("Username must be at least 3 characters");
    if (!form.email.includes("@"))
      return setError("Enter a valid email address");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");
    if (form.password !== form.confirm)
      return setError("Passwords do not match");

    setLoading(true);
    try {
      await authAPI.register(
        form.username.trim(),
        form.email.trim(),
        form.password,
      );
      setSuccess("Account created! Logging you in...");
      const loginRes = await authAPI.login(form.username.trim(), form.password);
      const { token, username: uname, user_id, role } = loginRes.data;
      login({ username: uname, user_id, role }, token);
      setTimeout(() => {
        navigate(role === "admin" ? "/admin" : "/dashboard");
      }, 600);
    } catch (err) {
      setError(
        err.response?.data?.error || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass = `w-full px-4 py-3 rounded-xl border-2 border-gray-200
                      bg-gray-50 text-gray-800 text-sm
                      focus:outline-none focus:border-brand-600 focus:bg-white
                      transition-all placeholder:text-gray-400`;

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row
                    bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600"
    >
      {/* Branding — desktop only */}
      <div
        className="hidden lg:flex lg:w-1/2
                      flex-col justify-center px-20 text-white"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <Zap size={26} className="text-blue-300" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight">
            BillFlow
          </span>
        </div>

        <h1 className="text-5xl font-extrabold leading-tight mb-4">
          Start for free.
          <br />
          <span className="text-blue-300">Scale as you grow.</span>
        </h1>
        <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
          Every new account includes 1 GB free storage and 1,000 free API calls
          per month — no credit card needed.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4">
          {[
            { icon: "🗂️", label: "1 GB Free Storage" },
            { icon: "🔑", label: "1000 Free API Calls" },
            { icon: "📊", label: "Usage Analytics" },
            { icon: "🧾", label: "Auto Invoicing" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-white/10 rounded-2xl px-4 py-3 text-sm
                         font-medium flex items-center gap-2"
            >
              <span className="text-lg">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Form Panel */}
      <div
        className="flex-1 lg:w-1/2 flex items-center justify-center
                      px-4 py-8 sm:px-8 lg:px-16"
      >
        <div className="w-full max-w-sm lg:max-w-md">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-6 lg:hidden">
            <div
              className="w-14 h-14 bg-white/15 rounded-2xl flex items-center
                            justify-center mb-3"
            >
              <Zap size={28} className="text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">
              BillFlow
            </span>
            <span className="text-blue-200 text-sm mt-0.5">
              Cloud Storage Billing Engine
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl w-full p-6 sm:p-8 lg:p-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
              Create your account
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              Free forever — no credit card required
            </p>

            {/* Alerts */}
            {error && (
              <div
                className="flex items-start gap-2.5 bg-red-50 border border-red-200
                              text-red-700 text-sm rounded-xl px-4 py-3 mb-5"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div
                className="flex items-start gap-2.5 bg-green-50 border border-green-200
                              text-green-700 text-sm rounded-xl px-4 py-3 mb-5"
              >
                <CheckCircle size={15} className="mt-0.5 shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Username + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-semibold text-gray-500
                                    uppercase tracking-wider mb-1.5"
                  >
                    Username
                  </label>
                  <input
                    name="username"
                    type="text"
                    placeholder="e.g. rahul"
                    value={form.username}
                    onChange={handleChange}
                    autoFocus
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold text-gray-500
                                    uppercase tracking-wider mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-xs font-semibold text-gray-500
                                  uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPass ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={handleChange}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2
                               text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Strength bar */}
                {strength && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all
                                      duration-300 ${strength.w} ${strength.bar}`}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold mt-0.5
                                     block ${strength.text}`}
                    >
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label
                  className="block text-xs font-semibold text-gray-500
                                  uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  name="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  value={form.confirm}
                  onChange={handleChange}
                  className={`${inputClass} ${
                    mismatch ? "border-red-400 focus:border-red-400" : ""
                  }`}
                />
                {mismatch && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    Passwords don't match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl mt-1
                           bg-gradient-to-r from-brand-600 to-brand-700
                           text-white font-semibold text-sm
                           flex items-center justify-center gap-2
                           hover:from-brand-700 hover:to-brand-800
                           hover:shadow-lg hover:-translate-y-0.5
                           active:translate-y-0 active:shadow-md
                           disabled:opacity-60 disabled:cursor-not-allowed
                           disabled:translate-y-0 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Spinner /> Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus size={17} /> Create Account
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5 text-gray-300 text-xs">
              <div className="flex-1 h-px bg-gray-200" />
              or
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-brand-600 font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
