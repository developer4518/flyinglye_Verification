import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const normalizeChildAges = (children = 0, ages = []) => {
  const count = Number(children) || 0;
  const cleanAges = Array.isArray(ages) ? ages : [];

  return Array.from({ length: count }, (_, index) => {
    const age = Number(cleanAges[index]);
    return age >= 1 && age <= 12 ? age : "";
  });
};

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const pickFirst = (...values) => {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== "" &&
      String(value).trim().toLowerCase() !== "n/a",
  );
};

const getHotelAddress = (hotel = {}) => {
  return (
    pickFirst(
      hotel.hotel_address,
      hotel.address,
      hotel.Address,
      hotel.HotelAddress,
      hotel.AddressLine,
      hotel.HotelAddressLine,
      hotel.Location,
      hotel.HotelLocation,

      hotel.hotel_raw?.hotel_address,
      hotel.hotel_raw?.address,
      hotel.hotel_raw?.Address,
      hotel.hotel_raw?.HotelAddress,
      hotel.hotel_raw?.AddressLine,
      hotel.hotel_raw?.HotelAddressLine,
      hotel.hotel_raw?.Location,
      hotel.hotel_raw?.HotelLocation,

      hotel.rawHotel?.hotel_address,
      hotel.rawHotel?.address,
      hotel.rawHotel?.Address,
      hotel.rawHotel?.HotelAddress,
      hotel.rawHotel?.AddressLine,
      hotel.rawHotel?.HotelAddressLine,
      hotel.rawHotel?.Location,
      hotel.rawHotel?.HotelLocation,
    ) || ""
  );
};

const getHotelCity = (hotel = {}) => {
  return (
    pickFirst(
      hotel.city_name,
      hotel.CityName,
      hotel.city,
      hotel.City,

      hotel.hotel_raw?.city_name,
      hotel.hotel_raw?.CityName,
      hotel.hotel_raw?.city,
      hotel.hotel_raw?.City,

      hotel.rawHotel?.city_name,
      hotel.rawHotel?.CityName,
      hotel.rawHotel?.city,
      hotel.rawHotel?.City,
    ) || ""
  );
};

const getHotelFacilities = (hotel = {}) => {
  return (
    hotel.hotel_facilities ||
    hotel.facilities ||
    hotel.Facilities ||
    hotel.HotelFacilities ||
    hotel.HotelFacility ||
    hotel.hotel_raw?.hotel_facilities ||
    hotel.hotel_raw?.facilities ||
    hotel.hotel_raw?.Facilities ||
    hotel.hotel_raw?.HotelFacilities ||
    hotel.hotel_raw?.HotelFacility ||
    hotel.rawHotel?.hotel_facilities ||
    hotel.rawHotel?.facilities ||
    hotel.rawHotel?.Facilities ||
    hotel.rawHotel?.HotelFacilities ||
    hotel.rawHotel?.HotelFacility ||
    []
  );
};

const getHotelNorms = (hotel = {}) => {
  return (
    hotel.hotel_norms ||
    hotel.HotelNorms ||
    hotel.hotel_raw?.hotel_norms ||
    hotel.hotel_raw?.HotelNorms ||
    hotel.rawHotel?.hotel_norms ||
    hotel.rawHotel?.HotelNorms ||
    []
  );
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

  const roomName = getRoomName(room);

  const totalFare =
    Number(
      room.price ??
        room.TotalFare ??
        room.Price?.PublishedPrice ??
        rawRoom?.TotalFare ??
        rawRoom?.Price?.PublishedPrice ??
        0,
    ) || 0;

  const totalTax =
    Number(
      room.tax ??
        room.TotalTax ??
        room.Price?.Tax ??
        rawRoom?.TotalTax ??
        rawRoom?.Price?.Tax ??
        0,
    ) || 0;

  const currency = room.currency || room.Currency || rawRoom?.Currency || "INR";

  const inclusion =
    room.inclusion || room.Inclusion || rawRoom?.Inclusion || "";

  const meal = room.meal || room.MealType || rawRoom?.MealType || "";

  const roomPromotion =
    room.room_promotion || room.RoomPromotion || rawRoom?.RoomPromotion || [];

  const cancelPolicies =
    room.cancel_policies ||
    room.CancelPolicies ||
    rawRoom?.CancelPolicies ||
    [];

  const rateConditions =
    room.rate_conditions ||
    room.RateConditions ||
    rawRoom?.RateConditions ||
    [];

  const supplements =
    room.supplements || room.Supplements || rawRoom?.Supplements || [];

  const amenities =
    room.amenities ||
    room.Amenities ||
    room.RoomAmenities ||
    rawRoom?.Amenities ||
    rawRoom?.RoomAmenities ||
    [];

  return {
    id: `${bookingCode || index}`,

    room_name: roomName,
    Name: room.Name || rawRoom?.Name || roomName,
    RoomTypeName: room.RoomTypeName || rawRoom?.RoomTypeName || roomName,

    price: totalFare,
    TotalFare: totalFare,

    tax: totalTax,
    TotalTax: totalTax,

    published_price:
      room.published_price ??
      room.PublishedPrice ??
      room.Price?.PublishedPrice ??
      rawRoom?.PublishedPrice ??
      rawRoom?.Price?.PublishedPrice ??
      null,

    offered_price:
      room.offered_price ??
      room.OfferedPrice ??
      room.Price?.OfferedPrice ??
      rawRoom?.OfferedPrice ??
      rawRoom?.Price?.OfferedPrice ??
      null,

    currency,
    Currency: currency,

    meal,
    MealType: meal,

    refundable:
      room.refundable ?? room.IsRefundable ?? rawRoom?.IsRefundable ?? false,
    IsRefundable:
      room.refundable ?? room.IsRefundable ?? rawRoom?.IsRefundable ?? false,

    inclusion,
    Inclusion: inclusion,

    room_promotion: roomPromotion,
    RoomPromotion: roomPromotion,

    cancel_policies: cancelPolicies,
    CancelPolicies: cancelPolicies,

    rate_conditions: rateConditions,
    RateConditions: rateConditions,

    supplements,
    Supplements: supplements,

    amenities,
    Amenities: amenities,

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
    hotel.rawHotel?.Rooms,
    hotel.HotelRooms,
  ).map(normalizeRoom);

  const cheapestRoom =
    rooms.length > 0
      ? [...rooms].sort((a, b) => Number(a.price) - Number(b.price))[0]
      : null;

  const address = getHotelAddress(hotel);
  const cityName = getHotelCity(hotel);
  const facilities = getHotelFacilities(hotel);
  const norms = getHotelNorms(hotel);

  return {
    hotel_code: hotel.hotel_code || hotel.HotelCode || hotel.code || "",
    HotelCode: hotel.hotel_code || hotel.HotelCode || hotel.code || "",

    hotel_name: hotel.hotel_name || hotel.HotelName || hotel.name || "Hotel",
    HotelName: hotel.hotel_name || hotel.HotelName || hotel.name || "Hotel",

    hotel_address: address,
    address,
    Address: address,
    HotelAddress: address,

    city_name: cityName,
    CityName: cityName,

    hotel_facilities: facilities,
    HotelFacilities: facilities,

    hotel_norms: norms,
    HotelNorms: norms,

    nationality: hotel.nationality || hotel.Nationality || "",
    currency:
      hotel.currency || hotel.Currency || cheapestRoom?.currency || "INR",

    image:
      hotel.image ||
      hotel.HotelPicture ||
      hotel.hotel_picture ||
      hotel.hotel_raw?.HotelPicture ||
      hotel.rawHotel?.HotelPicture ||
      "https://api.flyinglyte.com/media/hotels/default.jpg",

    images: Array.isArray(hotel.images)
      ? hotel.images
      : Array.isArray(hotel.Images)
        ? hotel.Images
        : [],

    has_image: Boolean(hotel.has_image || hotel.HotelPicture),

    rating: Number(
      hotel.rating ||
        hotel.HotelRating ||
        hotel.StarRating ||
        hotel.star_rating ||
        4,
    ),

    rooms,
    room_count: Number(hotel.room_count || rooms.length || 0),
    raw_room_count: Number(hotel.raw_room_count || rooms.length || 0),

    pax_rooms: Array.isArray(hotel.pax_rooms) ? hotel.pax_rooms : [],
    api_child_ages: Array.isArray(hotel.child_ages) ? hotel.child_ages : [],

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

  const normalizedRoom = normalizeRoom(room);

  return {
    room_name: normalizedRoom.room_name,
    Name: normalizedRoom.Name,
    RoomTypeName: normalizedRoom.RoomTypeName,

    booking_code: normalizedRoom.booking_code,
    BookingCode: normalizedRoom.BookingCode,

    price: normalizedRoom.price,
    TotalFare: normalizedRoom.TotalFare,

    tax: normalizedRoom.tax,
    TotalTax: normalizedRoom.TotalTax,

    published_price: normalizedRoom.published_price,
    offered_price: normalizedRoom.offered_price,

    meal: normalizedRoom.meal,
    MealType: normalizedRoom.MealType,

    refundable: normalizedRoom.refundable,
    IsRefundable: normalizedRoom.IsRefundable,

    inclusion: normalizedRoom.inclusion,
    Inclusion: normalizedRoom.Inclusion,

    currency: normalizedRoom.currency,
    Currency: normalizedRoom.Currency,

    RoomPromotion: normalizedRoom.RoomPromotion,
    CancelPolicies: normalizedRoom.CancelPolicies,
    RateConditions: normalizedRoom.RateConditions,
    Supplements: normalizedRoom.Supplements,
    Amenities: normalizedRoom.Amenities,

    room_raw: {
      BookingCode:
        normalizedRoom.room_raw?.BookingCode || normalizedRoom.BookingCode,
      Name: normalizedRoom.room_raw?.Name || normalizedRoom.Name,
      TotalFare: normalizedRoom.room_raw?.TotalFare || normalizedRoom.TotalFare,
      TotalTax: normalizedRoom.room_raw?.TotalTax || normalizedRoom.TotalTax,
      Inclusion: normalizedRoom.room_raw?.Inclusion || normalizedRoom.Inclusion,
      RoomPromotion:
        normalizedRoom.room_raw?.RoomPromotion || normalizedRoom.RoomPromotion,
      CancelPolicies:
        normalizedRoom.room_raw?.CancelPolicies ||
        normalizedRoom.CancelPolicies,
      RateConditions:
        normalizedRoom.room_raw?.RateConditions ||
        normalizedRoom.RateConditions,
      Supplements:
        normalizedRoom.room_raw?.Supplements || normalizedRoom.Supplements,
      Amenities: normalizedRoom.room_raw?.Amenities || normalizedRoom.Amenities,
    },
  };
};

const compactHotelForStorage = (hotel) => {
  if (!hotel) return null;

  const normalizedHotel = normalizeHotel(hotel);

  return {
    hotel_code: normalizedHotel.hotel_code,
    HotelCode: normalizedHotel.HotelCode,

    hotel_name: normalizedHotel.hotel_name,
    HotelName: normalizedHotel.HotelName,

    hotel_address: normalizedHotel.hotel_address,
    address: normalizedHotel.address,
    Address: normalizedHotel.Address,
    HotelAddress: normalizedHotel.HotelAddress,

    city_name: normalizedHotel.city_name,
    CityName: normalizedHotel.CityName,

    image: normalizedHotel.image,
    images: normalizedHotel.images,
    rating: normalizedHotel.rating,
    currency: normalizedHotel.currency,

    hotel_facilities: normalizedHotel.hotel_facilities,
    HotelFacilities: normalizedHotel.HotelFacilities,

    hotel_norms: normalizedHotel.hotel_norms,
    HotelNorms: normalizedHotel.HotelNorms,

    booking_code: normalizedHotel.booking_code,
    BookingCode: normalizedHotel.BookingCode,

    selected_room: compactRoomForStorage(normalizedHotel.selected_room),

    hotel_raw: {
      Address: normalizedHotel.Address,
      HotelAddress: normalizedHotel.HotelAddress,
      AddressLine:
        normalizedHotel.hotel_raw?.AddressLine ||
        normalizedHotel.rawHotel?.AddressLine ||
        "",
      Location:
        normalizedHotel.hotel_raw?.Location ||
        normalizedHotel.rawHotel?.Location ||
        "",
      CityName: normalizedHotel.CityName,
      HotelFacilities: normalizedHotel.HotelFacilities,
      HotelNorms: normalizedHotel.HotelNorms,
      HotelPicture:
        normalizedHotel.hotel_raw?.HotelPicture ||
        normalizedHotel.rawHotel?.HotelPicture ||
        normalizedHotel.image,
    },
  };
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
                childAges: normalizeChildAges(children, ages),
              },
            },
          };
        }),

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
                childAges: normalizeChildAges(currentChildren, userChildAges),
                roomGuests: Array.isArray(state.search.guests.roomGuests)
                  ? state.search.guests.roomGuests
                  : [],
              },
            },
          };
        }),

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

      setLoading: (value) =>
        set(() => ({
          loading: Boolean(value),
        })),

      setError: (error) =>
        set(() => ({
          error,
        })),

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

        prebookData: state.prebookData,
      }),
    },
  ),
);
