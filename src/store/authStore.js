import { create } from "zustand";

const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const getStoredUser = () => {
  return safeJsonParse(localStorage.getItem("user"), null);
};

const getStoredBookings = () => {
  return safeJsonParse(localStorage.getItem("userBookings"), []);
};

export const useAuthStore = create((set, get) => ({
  user: getStoredUser(),
  token: localStorage.getItem("token") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  bookings: getStoredBookings(),

  setUser: (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    set({ user });
  },

  setToken: (token) => {
    localStorage.setItem("token", token);
    set({ token });
  },

  setRefreshToken: (refreshToken) => {
    localStorage.setItem("refreshToken", refreshToken);
    set({ refreshToken });
  },

  setTokens: (access, refresh) => {
    localStorage.setItem("token", access);
    localStorage.setItem("refreshToken", refresh);
    set({ token: access, refreshToken: refresh });
  },

  setBookings: (bookings) => {
    localStorage.setItem("userBookings", JSON.stringify(bookings || []));
    set({ bookings: bookings || [] });
  },

  addBooking: (booking) => {
    const existing = get().bookings || [];

    const alreadyExists = existing.some(
      (b) =>
        b.bookingId === booking.bookingId ||
        b.BookingId === booking.BookingId ||
        b.BookingRefNo === booking.BookingRefNo,
    );

    if (alreadyExists) return;

    const updated = [booking, ...existing];

    localStorage.setItem("userBookings", JSON.stringify(updated));
    set({ bookings: updated });
  },

  clearBookings: () => {
    localStorage.removeItem("userBookings");
    set({ bookings: [] });
  },

  logout: () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userBookings");

    set({
      user: null,
      token: null,
      refreshToken: null,
      bookings: [],
    });
  },
}));
