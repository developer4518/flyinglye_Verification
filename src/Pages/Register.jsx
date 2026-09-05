import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { publicApi } from "../services/api";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password1: "",
    password2: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password1 !== formData.password2) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await publicApi.post("/api/auth/register/", formData);

      if (res.data?.success) {
        toast.success(res.data.message || "Account created successfully ✈️");
        navigate("/login");
      } else {
        toast.error(res.data?.message || "Registration failed");
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-(--bg-main) overflow-hidden">
      {/* Background Glow */}
      <div className="absolute w-150 h-150 bg-(--gold-main)/20 blur-[200px] rounded-full -top-50 -left-50" />
      <div className="absolute w-125 h-125 bg-blue-500/20 blur-[180px] rounded-full -bottom-37.5 -right-37.5" />

      <motion.div
        initial={{ opacity: 0, y: 45, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md backdrop-blur-xl bg-(--bg-card)/80 border border-(--border-soft) rounded-3xl p-8 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
      >
        <h2 className="text-3xl font-(--font-heading) text-(--gold-main) mb-2">
          Create Account
        </h2>

        <p className="text-sm text-(--text-muted) mb-6">
          Start your travel journey with us ✈️
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white focus:border-(--gold-main) outline-none transition"
            required
          />

          {/* Email */}
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white focus:border-(--gold-main) outline-none transition"
            required
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPass1 ? "text" : "password"}
              name="password1"
              placeholder="Password"
              value={formData.password1}
              onChange={handleChange}
              className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white pr-12 focus:border-(--gold-main) outline-none transition"
              minLength={8}
              required
            />

            <button
              type="button"
              onClick={() => setShowPass1(!showPass1)}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              {showPass1 ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <p className="text-xs text-(--text-muted) mt-2 ml-1">
            Password must be at least 8 characters.
          </p>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showPass2 ? "text" : "password"}
              name="password2"
              placeholder="Confirm Password"
              value={formData.password2}
              onChange={handleChange}
              className="w-full bg-(--bg-secondary) border border-(--border-soft) rounded-xl px-4 py-3 text-white pr-12 focus:border-(--gold-main) outline-none transition"
              minLength={8}
              required
            />

            <button
              type="button"
              onClick={() => setShowPass2(!showPass2)}
              className="absolute right-3 top-3 text-gray-400 hover:text-white"
            >
              {showPass2 ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className="w-full mt-2 py-3 rounded-full font-semibold bg-linear-to-r from-start to-end text-black shadow-[0_14px_40px_rgba(234,168,42,0.45)] transition disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Register"}
          </motion.button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-(--text-muted)">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-(--gold-main) cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
