import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizeChildAges = (children = 0, ages = []) => {
  const count = Number(children) || 0;
  const cleanAges = Array.isArray(ages) ? ages : [];

  return Array.from({ length: count }, (_, index) => {
    const age = Number(cleanAges[index]);

    // Child age allowed: 1 to 12
    return age >= 1 && age <= 12 ? age : "";
  });
};

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const getRoomName = (room = {}) => {
  if (room.room_name) return room.room_name;
  if (room.RoomTypeName) return room.RoomTypeName;

  const name = room.Name || room.name;
  if (Array.isArray(name)) return name[0] || "Standard Room";
  if (typeof name === "string") return name;

  return "Standard Room";
};

const normalizeRoom = (room = {}, index = 0) => {
  const rawRoom = room.room_raw || room;

  const bookingCode =
    room.booking_code || room.BookingCode || rawRoom?.BookingCode || null;

  return {
    id: `${bookingCode || index}`,

    room_name: getRoomName(room),

    price:
      Number(
        room.price ??
          room.TotalFare ??
          room.Price?.PublishedPrice ??
          rawRoom?.TotalFare ??
          0,
      ) || 0,

    tax:
      Number(
        room.tax ?? room.TotalTax ?? room.Price?.Tax ?? rawRoom?.TotalTax ?? 0,
      ) || 0,

    published_price:
      room.published_price ??
      room.PublishedPrice ??
      room.Price?.PublishedPrice ??
      rawRoom?.PublishedPrice ??
      null,

    offered_price:
      room.offered_price ??
      room.OfferedPrice ??
      room.Price?.OfferedPrice ??
      rawRoom?.OfferedPrice ??
      null,

    currency: room.currency || room.Currency || rawRoom?.Currency || "INR",

    meal: room.meal || room.MealType || rawRoom?.MealType || "",

    refundable:
      room.refundable ?? room.IsRefundable ?? rawRoom?.IsRefundable ?? false,

    inclusion: room.inclusion || room.Inclusion || rawRoom?.Inclusion || "",

    room_promotion:
      room.room_promotion || room.RoomPromotion || rawRoom?.RoomPromotion || [],

    cancel_policies:
      room.cancel_policies ||
      room.CancelPolicies ||
      rawRoom?.CancelPolicies ||
      [],

    rate_conditions:
      room.rate_conditions ||
      room.RateConditions ||
      rawRoom?.RateConditions ||
      [],

    supplements:
      room.supplements || room.Supplements || rawRoom?.Supplements || [],

    amenities: room.amenities || room.Amenities || rawRoom?.Amenities || [],

    booking_code: bookingCode,
    BookingCode: bookingCode,

    room_raw: rawRoom,
  };
};

const normalizeHotel = (hotel = {}) => {
  const rooms = getFirstArray(
    hotel.rooms,
    hotel.Rooms,
    hotel.hotel_raw?.Rooms,
    hotel.HotelRooms,
  ).map(normalizeRoom);

  const cheapestRoom =
    rooms.length > 0
      ? [...rooms].sort((a, b) => Number(a.price) - Number(b.price))[0]
      : null;

  return {
    hotel_code: hotel.hotel_code || hotel.HotelCode || hotel.code || "",
    HotelCode: hotel.hotel_code || hotel.HotelCode || hotel.code || "",

    hotel_name: hotel.hotel_name || hotel.HotelName || hotel.name || "Hotel",
    HotelName: hotel.hotel_name || hotel.HotelName || hotel.name || "Hotel",

    nationality: hotel.nationality || hotel.Nationality || "",
    currency:
      hotel.currency || hotel.Currency || cheapestRoom?.currency || "INR",

    image:
      hotel.image ||
      hotel.HotelPicture ||
      hotel.hotel_picture ||
      "https://api.flyinglyte.com/media/hotels/default.jpg",

    images: Array.isArray(hotel.images) ? hotel.images : [],
    has_image: Boolean(hotel.has_image),

    rating: Number(hotel.rating || hotel.StarRating || hotel.star_rating || 4),

    rooms,
    room_count: Number(hotel.room_count || rooms.length || 0),
    raw_room_count: Number(hotel.raw_room_count || rooms.length || 0),

    // Keep API data for reference only
    pax_rooms: Array.isArray(hotel.pax_rooms) ? hotel.pax_rooms : [],
    api_child_ages: Array.isArray(hotel.child_ages) ? hotel.child_ages : [],

    // Cheapest/default room for card display
    price: cheapestRoom?.price || 0,
    tax: cheapestRoom?.tax || 0,
    meal: cheapestRoom?.meal || "",
    refundable: cheapestRoom?.refundable || false,
    inclusion: cheapestRoom?.inclusion || "",
    booking_code: cheapestRoom?.booking_code || null,
    BookingCode: cheapestRoom?.booking_code || null,
    selected_room: cheapestRoom,

    hotel_raw: hotel.hotel_raw || hotel,
    rawHotel: hotel,
  };
};

const normalizeHotelResponse = (response) => {
  const root = response?.data?.data || response?.data || response || {};

  const hotelArray = getFirstArray(
    root.results,
    root.hotels,
    root.HotelResult,
    root.data,
    response,
  );

  const normalizedHotels = hotelArray.map(normalizeHotel);

  return {
    hotels: normalizedHotels,
    rawResponse: root,
    meta: {
      count: root.count ?? normalizedHotels.length,
      total_tbo_hotels_found:
        root.total_tbo_hotels_found ?? normalizedHotels.length,
      parallel_search_enabled: Boolean(root.parallel_search_enabled),
      max_hotel_codes_per_request: root.max_hotel_codes_per_request ?? null,
      multi_room_enabled: Boolean(root.multi_room_enabled),
      currency: root.currency || "INR",
      nationality: root.nationality || "IN",
      searched_hotel_codes: root.searched_hotel_codes ?? null,
      chunks_sent: root.chunks_sent ?? null,
      tbo_errors: Array.isArray(root.tbo_errors) ? root.tbo_errors : [],
    },
  };
};

const compactRoomForStorage = (room) => {
  if (!room) return null;

  return {
    room_name:
      room.room_name || room.Name || room.RoomTypeName || "Standard Room",
    booking_code: room.booking_code || room.BookingCode || null,
    BookingCode: room.booking_code || room.BookingCode || null,
    price: Number(room.price || room.TotalFare || 0),
    tax: Number(room.tax || room.TotalTax || 0),
    meal: room.meal || room.MealType || "",
    refundable: room.refundable ?? room.IsRefundable ?? false,
    inclusion: room.inclusion || room.Inclusion || "",
    currency: room.currency || room.Currency || "INR",
  };
};

const compactHotelForStorage = (hotel) => {
  if (!hotel) return null;

  return {
    hotel_code: hotel.hotel_code || hotel.HotelCode || "",
    HotelCode: hotel.hotel_code || hotel.HotelCode || "",
    hotel_name: hotel.hotel_name || hotel.HotelName || "Hotel",
    HotelName: hotel.hotel_name || hotel.HotelName || "Hotel",
    image: hotel.image || hotel.HotelPicture || "",
    rating: hotel.rating || hotel.StarRating || 4,
    currency: hotel.currency || hotel.Currency || "INR",
    booking_code: hotel.booking_code || hotel.BookingCode || null,
    BookingCode: hotel.booking_code || hotel.BookingCode || null,
    selected_room: compactRoomForStorage(hotel.selected_room),
  };
};

/* ===================== */
/* INITIAL STATE */
/* ===================== */

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

/* ===================== */
/* STORE */
/* ===================== */

export const useHotelStore = create(
  persist(
    (set, get) => ({
      search: initialSearch,

      hotels: [],
      hotelResponse: null,
      hotelMeta: null,

      selectedHotel: null,
      selectedRoom: null,
      bookingCode: null,

      prebookData: null,
      bookingData: null,
      bookingDetails: null,
      cancelData: null,

      guestDetails: [],

      loading: false,
      error: null,

      /* ===================== */
      /* SEARCH */
      /* ===================== */

      setSearch: (searchData = {}) =>
        set((state) => {
          const incomingGuests = searchData.guests || {};

          const mergedGuests = {
            ...state.search.guests,
            ...incomingGuests,
          };

          const children = Number(mergedGuests.children) || 0;

          const normalizedFlatChildAges = normalizeChildAges(
            children,
            mergedGuests.childAges,
          );

          return {
            search: {
              ...state.search,
              ...searchData,
              guests: {
                ...mergedGuests,
                adults: Number(mergedGuests.adults) || 1,
                children,
                rooms: Number(mergedGuests.rooms) || 1,

                childAges: normalizedFlatChildAges,

                // Keep room-wise child ages also
                roomGuests: Array.isArray(mergedGuests.roomGuests)
                  ? mergedGuests.roomGuests.map((room, index) => {
                      const roomChildren = Number(
                        room.Children ?? room.children ?? 0,
                      );

                      const roomAges =
                        room.ChildrenAges ||
                        room.ChildAges ||
                        room.childAges ||
                        [];

                      const cleanAges = normalizeChildAges(
                        roomChildren,
                        roomAges,
                      );

                      return {
                        ...room,
                        RoomIndex:
                          room.RoomIndex ?? room.roomIndex ?? index + 1,
                        Adults: Number(room.Adults ?? room.adults ?? 1),
                        Children: roomChildren,
                        ChildAges: cleanAges,
                        ChildrenAges: cleanAges,
                        childAges: cleanAges,
                      };
                    })
                  : mergedGuests.roomGuests || [],
              },
            },
          };
        }),

      setGuests: (guests = {}) =>
        set((state) => {
          const mergedGuests = {
            ...state.search.guests,
            ...guests,
          };

          const children = Number(mergedGuests.children) || 0;

          return {
            search: {
              ...state.search,
              guests: {
                ...mergedGuests,
                adults: Number(mergedGuests.adults) || 1,
                children,
                rooms: Number(mergedGuests.rooms) || 1,

                childAges: normalizeChildAges(children, mergedGuests.childAges),

                roomGuests: Array.isArray(mergedGuests.roomGuests)
                  ? mergedGuests.roomGuests.map((room, index) => {
                      const roomChildren = Number(
                        room.Children ?? room.children ?? 0,
                      );

                      const roomAges =
                        room.ChildrenAges ||
                        room.ChildAges ||
                        room.childAges ||
                        [];

                      const cleanAges = normalizeChildAges(
                        roomChildren,
                        roomAges,
                      );

                      return {
                        ...room,
                        RoomIndex:
                          room.RoomIndex ?? room.roomIndex ?? index + 1,
                        Adults: Number(room.Adults ?? room.adults ?? 1),
                        Children: roomChildren,
                        ChildAges: cleanAges,
                        ChildrenAges: cleanAges,
                        childAges: cleanAges,
                      };
                    })
                  : mergedGuests.roomGuests || [],
              },
            },
          };
        }),

      setChildAges: (ages = []) =>
        set((state) => {
          const children = Number(state.search.guests.children) || 0;

          return {
            search: {
              ...state.search,
              guests: {
                ...state.search.guests,

                // ✅ ONLY USER INPUT SHOULD UPDATE THIS
                childAges: normalizeChildAges(children, ages),
              },
            },
          };
        }),

      /* ===================== */
      /* HOTEL SEARCH RESPONSE */
      /* ===================== */

      setHotels: (hotelsResponse) =>
        set((state) => {
          const { hotels, rawResponse, meta } =
            normalizeHotelResponse(hotelsResponse);

          const currentChildren = Number(state.search.guests.children) || 0;
          const userChildAges = state.search.guests.childAges || [];

          return {
            hotels,
            hotelResponse: rawResponse,
            hotelMeta: meta,

            search: {
              ...state.search,
              nationality: meta.nationality || state.search.nationality,
              guests: {
                ...state.search.guests,

                // ✅ IMPORTANT:
                // Do NOT use hotel.child_ages / pax_rooms child age from API.
                // Always keep child age entered by user on search page.
                childAges: normalizeChildAges(currentChildren, userChildAges),

                roomGuests: Array.isArray(state.search.guests.roomGuests)
                  ? state.search.guests.roomGuests
                  : [],
              },
            },
          };
        }),

      /* ===================== */
      /* HOTEL + ROOM SELECTION */
      /* ===================== */

      setSelectedHotel: (hotel) =>
        set(() => ({
          selectedHotel: hotel ? normalizeHotel(hotel) : null,
        })),

      setSelectedRoom: (room) =>
        set(() => {
          const normalizedRoom = room ? normalizeRoom(room) : null;

          return {
            selectedRoom: normalizedRoom,
            bookingCode: normalizedRoom?.booking_code || null,
          };
        }),

      selectHotelRoom: (hotel, room) =>
        set(() => {
          const normalizedHotel = normalizeHotel(hotel);
          const normalizedRoom = normalizeRoom(room);

          return {
            selectedHotel: {
              ...normalizedHotel,
              selected_room: normalizedRoom,
              booking_code: normalizedRoom.booking_code,
              BookingCode: normalizedRoom.booking_code,
            },
            selectedRoom: normalizedRoom,
            bookingCode: normalizedRoom.booking_code,
          };
        }),

      /* ===================== */
      /* PREBOOK / BOOK / DETAILS */
      /* ===================== */

      setPrebookData: (data) =>
        set(() => ({
          prebookData: data,
        })),

      setBookingData: (data) =>
        set(() => ({
          bookingData: data,
        })),

      setBookingDetails: (data) =>
        set(() => ({
          bookingDetails: data,
        })),

      setCancelData: (data) =>
        set(() => ({
          cancelData: data,
        })),

      setGuestDetails: (guests) =>
        set(() => ({
          guestDetails: Array.isArray(guests) ? guests : [],
        })),

      /* ===================== */
      /* UI STATE */
      /* ===================== */

      setLoading: (value) =>
        set(() => ({
          loading: Boolean(value),
        })),

      setError: (error) =>
        set(() => ({
          error,
        })),

      /* ===================== */
      /* RESET */
      /* ===================== */

      resetFlow: () =>
        set(() => ({
          hotels: [],
          hotelResponse: null,
          hotelMeta: null,

          selectedHotel: null,
          selectedRoom: null,
          bookingCode: null,

          prebookData: null,
          bookingData: null,
          bookingDetails: null,
          cancelData: null,

          guestDetails: [],

          loading: false,
          error: null,
        })),

      clearHotelSearch: () =>
        set(() => ({
          search: {
            ...initialSearch,
            guests: {
              ...initialSearch.guests,
            },
          },
        })),

      clearAllHotelData: () =>
        set(() => ({
          search: {
            ...initialSearch,
            guests: {
              ...initialSearch.guests,
            },
          },

          hotels: [],
          hotelResponse: null,
          hotelMeta: null,

          selectedHotel: null,
          selectedRoom: null,
          bookingCode: null,

          prebookData: null,
          bookingData: null,
          bookingDetails: null,
          cancelData: null,

          guestDetails: [],

          loading: false,
          error: null,
        })),
    }),
    {
      name: "hotel-flow-storage",

      storage: createJSONStorage(() => sessionStorage),

      partialize: (state) => ({
        search: state.search,
        hotelMeta: state.hotelMeta,

        selectedHotel: compactHotelForStorage(state.selectedHotel),
        selectedRoom: compactRoomForStorage(state.selectedRoom),
        bookingCode: state.bookingCode,
      }),
    },
  ),
);
