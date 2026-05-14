import { create } from "zustand";

export const useHotelStore = create((set) => ({
  /* ===================== */
  /* 🔍 SEARCH */
  /* ===================== */
  search: {
    city: "",
    cityName: "",
    checkIn: "",
    checkOut: "",
    guests: {
      adults: 1,
      children: 0,
      rooms: 1, // ✅ ADDED
      childAges: [],
    },
  },

  /* ===================== */
  /* 🏨 HOTEL LIST */
  /* ===================== */
  hotels: [],

  /* ===================== */
  /* 🏨 HOTEL DETAILS */
  /* ===================== */
  selectedHotel: null,

  /* ===================== */
  /* 🛏 ROOM + BOOKING CODE */
  /* ===================== */
  selectedRoom: null,
  bookingCode: null,

  /* ===================== */
  /* 💳 PREBOOK */
  /* ===================== */
  prebookData: null,

  /* ===================== */
  /* 📦 FINAL BOOKING */
  /* ===================== */
  bookingData: null,

  /* ===================== */
  /* 👥 BOOKING GUEST LIST */
  /* ===================== */
  guestDetails: [],

  /* ===================== */
  /* ⏳ GLOBAL STATE */
  /* ===================== */
  loading: false,
  error: null,

  /* ===================== */
  /* ACTIONS */
  /* ===================== */

  // 🔍 Set Search
  setSearch: (searchData) =>
    set((state) => ({
      search: {
        ...state.search,
        ...searchData,
        guests: {
          ...state.search.guests,
          ...(searchData.guests || {}),
        },
      },
    })),

  // 👥 Update Guests Count
  setGuests: (guests) =>
    set((state) => ({
      search: {
        ...state.search,
        guests: {
          ...state.search.guests,
          ...guests,
        },
      },
    })),

  // 👶 Set Child Ages
  setChildAges: (ages) =>
    set((state) => ({
      search: {
        ...state.search,
        guests: {
          ...state.search.guests,
          childAges: ages,
        },
      },
    })),

  // 🏨 Set Hotels
  setHotels: (hotelsData) =>
    set(() => ({
      hotels: hotelsData,
    })),

  // 🏨 Select Hotel
  setSelectedHotel: (hotel) =>
    set(() => ({
      selectedHotel: hotel,
    })),

  // 🛏 Select Room
  setSelectedRoom: (room) =>
    set(() => ({
      selectedRoom: room,
      bookingCode: room?.BookingCode || null,
    })),

  // 💳 PreBook
  setPrebookData: (data) =>
    set(() => ({
      prebookData: data,
    })),

  // 📦 Final Booking
  setBookingData: (data) =>
    set(() => ({
      bookingData: data,
    })),

  // 👥 Save Guest Details
  setGuestDetails: (guests) =>
    set(() => ({
      guestDetails: guests,
    })),

  // ⏳ Loading
  setLoading: (value) =>
    set(() => ({
      loading: value,
    })),

  // ❌ Error
  setError: (error) =>
    set(() => ({
      error,
    })),

  /* ===================== */
  /* 🔁 RESET FLOW */
  /* ===================== */
  resetFlow: () =>
    set(() => ({
      hotels: [],
      selectedHotel: null,
      selectedRoom: null,
      bookingCode: null,
      prebookData: null,
      bookingData: null,
      guestDetails: [],
      loading: false,
      error: null,
    })),
}));
