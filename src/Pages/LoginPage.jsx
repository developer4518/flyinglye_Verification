"use client";

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { publicApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { setUser, setTokens } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const getLoginData = (resData) => {
    const data = resData?.data || resData || {};

    const user =
      data?.data?.user ||
      data?.user ||
      data?.profile ||
      null;

    const access =
      data?.data?.tokens?.access ||
      data?.tokens?.access ||
      data?.data?.access ||
      data?.access ||
      null;

    const refresh =
      data?.data?.tokens?.refresh ||
      data?.tokens?.refresh ||
      data?.data?.refresh ||
      data?.refresh ||
      null;

    return { user, access, refresh };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const res = await publicApi.post("/api/auth/login/", formData);

      console.log("LOGIN RESPONSE:", res.data);

      const { user, access, refresh } = getLoginData(res);

      if (!access || !refresh) {
        console.log("LOGIN TOKEN EXTRACTION FAILED:", {
          user,
          access,
          refresh,
          response: res.data,
        });

        toast.error("Login successful but token missing. Please contact support.");
        return;
      }

      if (user) {
        setUser(user);
      }

      setTokens(access, refresh);

      console.log(
        "SAVED TOKEN:",
        localStorage.getItem("token") ? "FOUND" : "NULL",
      );

      console.log(
        "SAVED REFRESH TOKEN:",
        localStorage.getItem("refreshToken") ? "FOUND" : "NULL",
      );

      const redirectTo = location.state?.redirectTo || "/";
      const payload = location.state?.payload || null;

      toast.success("Login Successful ✈️");

      navigate(redirectTo, {
        replace: true,
        state: payload
          ? {
              payload,
              ...payload,
            }
          : undefined,
      });
    } catch (error) {
      console.log("LOGIN ERROR:", error?.response?.data || error);

      const errMsg =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.response?.data?.non_field_errors?.[0] ||
        "Invalid credentials";

      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-(--bg-main) overflow-hidden">
      <div className="absolute w-150 h-150 bg-(--gold-main)/20 blur-[200px] rounded-full -top-50 -left-50" />
      <div className="absolute w-125 h-125 bg-blue-500/20 blur-[180px] rounded-full -bottom-37.5 -right-37.5" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md backdrop-blur-xl bg-(--bg-card)/80 border border-(--border-soft) rounded-3xl p-8 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
      >
        <h2 className="text-3xl font-(--font-heading) text-(--gold-main) mb-2">
          Welcome Back
        </h2>

        <p className="text-sm text-(--text-muted) mb-6">
          Login to continue your journey ✈️
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white focus:border-(--gold-main) outline-none transition"
              required
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white focus:border-(--gold-main) outline-none pr-12 transition"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            disabled={loading}
            className="w-full mt-2 py-3 rounded-full font-semibold bg-linear-to-r from-start to-end text-black shadow-[0_14px_40px_rgba(234,168,42,0.45)] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-(--text-muted)">
          Don&apos;t have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-(--gold-main) cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;