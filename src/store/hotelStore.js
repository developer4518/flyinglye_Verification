import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_CHILD_AGE = 6;

const normalizeChildAges = (children = 0, ages = []) => {
  const count = Number(children) || 0;
  const cleanAges = Array.isArray(ages) ? ages : [];

  return Array.from({ length: count }, (_, index) => {
    const age = Number(cleanAges[index]);
    return age > 0 && age < 12 ? age : DEFAULT_CHILD_AGE;
  });
};

const initialSearch = {
  city: "",
  cityName: "",
  nationality: "IN",
  nationalityName: "India",
  checkIn: "",
  checkOut: "",
  guests: {
    adults: 1,
    children: 0,
    rooms: 1,
    childAges: [],
  },
};

export const useHotelStore = create(
  persist(
    (set) => ({
      search: initialSearch,

      hotels: [],
      selectedHotel: null,
      selectedRoom: null,
      bookingCode: null,
      prebookData: null,
      bookingData: null,
      guestDetails: [],

      loading: false,
      error: null,

      setSearch: (searchData) =>
        set((state) => {
          const incomingGuests = searchData.guests || {};
          const mergedGuests = {
            ...state.search.guests,
            ...incomingGuests,
          };

          return {
            search: {
              ...state.search,
              ...searchData,
              guests: {
                ...mergedGuests,
                childAges: normalizeChildAges(
                  mergedGuests.children,
                  mergedGuests.childAges,
                ),
              },
            },
          };
        }),

      setGuests: (guests) =>
        set((state) => {
          const mergedGuests = {
            ...state.search.guests,
            ...guests,
          };

          return {
            search: {
              ...state.search,
              guests: {
                ...mergedGuests,
                childAges: normalizeChildAges(
                  mergedGuests.children,
                  mergedGuests.childAges,
                ),
              },
            },
          };
        }),

      setChildAges: (ages) =>
        set((state) => ({
          search: {
            ...state.search,
            guests: {
              ...state.search.guests,
              childAges: normalizeChildAges(state.search.guests.children, ages),
            },
          },
        })),

      setHotels: (hotelsData) =>
        set(() => ({
          hotels: hotelsData || [],
        })),

      setSelectedHotel: (hotel) =>
        set(() => ({
          selectedHotel: hotel,
        })),

      setSelectedRoom: (room) =>
        set(() => ({
          selectedRoom: room,
          bookingCode: room?.BookingCode || null,
        })),

      setPrebookData: (data) =>
        set(() => ({
          prebookData: data,
        })),

      setBookingData: (data) =>
        set(() => ({
          bookingData: data,
        })),

      setGuestDetails: (guests) =>
        set(() => ({
          guestDetails: guests,
        })),

      setLoading: (value) =>
        set(() => ({
          loading: value,
        })),

      setError: (error) =>
        set(() => ({
          error,
        })),

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

      clearHotelSearch: () =>
        set(() => ({
          search: initialSearch,
        })),
    }),
    {
      name: "hotel-flow-storage",

      partialize: (state) => ({
        search: state.search,
        hotels: state.hotels,
        selectedHotel: state.selectedHotel,
        selectedRoom: state.selectedRoom,
        bookingCode: state.bookingCode,
        prebookData: state.prebookData,
      }),
    },
  ),
);
