import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import logo from "/images/flying_logo.png";
import { useAuthStore } from "../../store/authStore";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuthStore();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* Scroll Effect */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Close mobile menu when route changes */
  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  /* Logout */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navStyle = scrolled
    ? "bg-black/70 backdrop-blur-xl border border-white/10 shadow-lg"
    : "bg-black/30 backdrop-blur-md";

  const linkClass = (path) =>
    `transition ${
      location.pathname === path
        ? "text-[#E6B35C]"
        : "text-gray-300 hover:text-[#E6B35C]"
    }`;

  return (
    <nav className="fixed inset-x-0 top-4 z-50 transition-all duration-300">
      <div
        className={`mx-auto w-[92%] rounded-full px-5 py-3 flex items-center justify-between ${navStyle}`}
      >
        {/* Logo */}
        <img
          src={logo}
          alt="FlyingLyte"
          className="w-38 md:w-50 cursor-pointer select-none"
          onClick={() => navigate("/")}
        />

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-8 text-sm font-medium">
          <Link to="/" className={linkClass("/")}>
            Home
          </Link>

          <Link to="/packages" className={linkClass("/packages")}>
            Packages
          </Link>

          <Link to="/flights" className={linkClass("/flights")}>
            Flights
          </Link>

          <Link to="/contact" className={linkClass("/contact")}>
            Contact
          </Link>
          <Link to="/blogs" className={linkClass("/blogs")}>
            Blogs
          </Link>
        </ul>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-4 relative">
          {!user ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="text-gray-300 hover:text-white transition"
              >
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="bg-[#E6B35C] text-black px-4 py-1.5 rounded-md font-semibold hover:bg-[#F3C97A] transition"
              >
                Register
              </button>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="text-[#E6B35C] font-semibold"
              >
                Hi, {user?.name?.split(" ")[0] || "User"}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-44 bg-black/90 border border-white/10 rounded-xl p-2 text-sm shadow-lg backdrop-blur-xl">
                  <button
                    onClick={() => navigate("/bookings")}
                    className="block w-full text-left text-[#E6B35C] hover:text-[#dd9619] px-3 py-2 hover:bg-white/5 rounded-md"
                  >
                    My Bookings
                  </button>

                  <hr className="border-white/10 my-1" />

                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 text-red-400 hover:bg-white/5 rounded-md"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          aria-label="Toggle menu"
          className="md:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <HiX size={26} /> : <HiMenu size={26} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 mx-auto w-[92%] bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-gray-200 flex flex-col gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-left hover:text-[#E6B35C]"
          >
            Home
          </button>

          <button
            onClick={() => navigate("/packages")}
            className="text-left hover:text-[#E6B35C]"
          >
            Packages
          </button>

          <button
            onClick={() => navigate("/flights")}
            className="text-left hover:text-[#E6B35C]"
          >
            Flights
          </button>
          <button
            onClick={() => navigate("/blogs")}
            className="text-left hover:text-[#E6B35C]"
          >
            Blogs
          </button>

          <button
            onClick={() => navigate("/contact")}
            className="text-left hover:text-[#E6B35C]"
          >
            Contact
          </button>

          <hr className="border-white/10 my-2" />

          {!user ? (
            <>
              <button
                onClick={() => navigate("/login")}
                className="text-left hover:text-white"
              >
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="bg-[#E6B35C] text-black px-4 py-2 rounded-md font-semibold hover:bg-[#F3C97A]"
              >
                Register
              </button>
            </>
          ) : (
            <>
              <span className="text-[#E6B35C] font-semibold">
                Hi, {user?.name || user?.email}
              </span>

              <button
                onClick={() => navigate("/bookings")}
                className="block w-full text-left text-[#E6B35C] hover:text-[#dd9619] px-3 py-2 hover:bg-white/5 rounded-md"
              >
                My Bookings
              </button>

              <button
                onClick={handleLogout}
                className="text-left text-red-400 hover:text-red-500"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
