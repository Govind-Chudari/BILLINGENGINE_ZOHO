import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authAPI } from "../services/api";
import { LogIn, Eye, EyeOff, AlertCircle, Zap } from "lucide-react";

function Spinner() {
  return (
    <div
      className="w-4 h-4 border-2 border-white/30 border-t-white
                    rounded-full animate-spin shrink-0"
    />
  );
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!username.trim()) return setError("Username is required");
    if (!password) return setError("Password is required");
    setLoading(true);
    try {
      const res = await authAPI.login(username.trim(), password);
      const { token, username: uname, user_id, role } = res.data;
      login({ username: uname, user_id, role}, token);
      navigate(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row
                    bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600"
    >
      {/* Branding Panel — hidden on mobile*/}
      <div
        className="hidden lg:flex lg:w-1/2
                      flex-col justify-center px-20 text-white"
      >
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-12 h-12 bg-white/10 rounded-2xl flex items-center
                          justify-center backdrop-blur"
          >
            <Zap size={26} className="text-blue-300" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight">
            BillFlow
          </span>
        </div>

        <h1 className="text-5xl font-extrabold leading-tight mb-4">
          Cloud Storage
          <br />
          <span className="text-blue-300">Billing Engine</span>
        </h1>
        <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
          Multi-tenant object storage with real-time usage metering and
          automated monthly invoicing.
        </p>

        <div className="flex flex-col gap-3 mt-10">
          {[
            "🗂️  Isolated storage per user",
            "📊  Real-time usage tracking",
            "💰  Automated billing engine",
            "🔐  JWT-secured API",
          ].map((f) => (
            <div
              key={f}
              className="flex items-center gap-3 bg-white/10 backdrop-blur
                         px-4 py-2.5 rounded-xl text-sm font-medium w-fit"
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Form Panel */}
      {/* On mobile*/}
      <div
        className="flex-1 lg:w-1/2 flex items-center justify-center
                      px-4 py-8 sm:px-8 lg:px-16"
      >
        {/* Mobile logo — only shows on small screens */}
        <div className="w-full max-w-sm lg:max-w-md">
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
              Welcome back
            </h2>
            <p className="text-gray-400 text-sm mb-6 sm:mb-8">
              Sign in to your account to continue
            </p>

            {error && (
              <div
                className="flex items-start gap-2.5 bg-red-50 border border-red-200
                              text-red-700 text-sm rounded-xl px-4 py-3 mb-5"
              >
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <div>
                <label
                  className="block text-xs font-semibold text-gray-500
                                  uppercase tracking-wider mb-1.5"
                >
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                             bg-gray-50 text-gray-800 text-sm
                             focus:outline-none focus:border-brand-600 focus:bg-white
                             transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold text-gray-500
                                  uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-xl border-2 border-gray-200
                               bg-gray-50 text-gray-800 text-sm
                               focus:outline-none focus:border-brand-600 focus:bg-white
                               transition-all placeholder:text-gray-400"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl
                           bg-gradient-to-r from-brand-600 to-brand-700
                           text-white font-semibold text-sm
                           flex items-center justify-center gap-2
                           hover:from-brand-700 hover:to-brand-800
                           hover:shadow-lg hover:-translate-y-0.5
                           active:translate-y-0 active:shadow-md
                           disabled:opacity-60 disabled:cursor-not-allowed
                           disabled:translate-y-0
                           transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Spinner /> Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={17} /> Sign In
                  </>
                )}
              </button>
            </form>

            <div
              className="flex items-center gap-3 my-5 sm:my-7
                            text-gray-300 text-xs"
            >
              <div className="flex-1 h-px bg-gray-200" />
              or
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <p className="text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-brand-600 font-semibold hover:underline"
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
