import { create } from "zustand";

const toBool = (value) =>
  value === true || String(value).toLowerCase() === "true";

const initialFlightValidation = {
  isPanRequiredAtBook: false,
  isPanRequiredAtTicket: false,

  isPassportRequiredAtBook: false,
  isPassportRequiredAtTicket: false,
  isPassportFullDetailRequiredAtBook: false,

  isGSTMandatory: false,

  isPriceChanged: false,
  isTimeChanged: false,
  flightDetailChangeInfo: "",

  isSeatMandatory: false,
  isMealMandatory: false,
};

const initialSearchTravellers = {
  adults: 1,
  children: 0,
  infants: 0,
  cabin: "Economy",
};

const getFareQuoteRoot = (fareQuote) => {
  return (
    fareQuote?.Response?.Results ||
    fareQuote?.Response?.Result ||
    fareQuote?.Response ||
    fareQuote?.Results ||
    fareQuote?.Result ||
    fareQuote ||
    {}
  );
};

const normalizeFlightValidation = (fareQuote) => {
  const data = getFareQuoteRoot(fareQuote);

  return {
    isPanRequiredAtBook: toBool(data?.IsPanRequiredAtBook),
    isPanRequiredAtTicket: toBool(data?.IsPanRequiredAtTicket),

    isPassportRequiredAtBook: toBool(data?.IsPassportRequiredAtBook),
    isPassportRequiredAtTicket: toBool(data?.IsPassportRequiredAtTicket),
    isPassportFullDetailRequiredAtBook: toBool(
      data?.IsPassportFullDetailRequiredAtBook,
    ),

    isGSTMandatory: toBool(data?.IsGSTMandatory),

    isPriceChanged: toBool(data?.IsPriceChanged || data?.ispricechanged),
    isTimeChanged: toBool(data?.IsTimeChanged || data?.istimechanged),
    flightDetailChangeInfo:
      data?.FlightDetailChangeInfo || data?.flightDetailChangeInfo || "",

    isSeatMandatory: toBool(
      data?.IsSeatMandatory ||
        data?.isseatmandatory ||
        data?.IsSeatMandatoryRequired,
    ),

    isMealMandatory: toBool(
      data?.IsMealMandatory ||
        data?.ismealmandatory ||
        data?.IsMealMandatoryRequired,
    ),
  };
};

export const useFlightStore = create((set, get) => ({
  flights: [],
  selectedFlight: null,
  traceId: null,
  resultIndex: null,
  fareQuote: null,
  isLcc: null,

  // ✅ Search / passenger state
  passengerCount: 1,
  searchTravellers: initialSearchTravellers,
  lastSearchAt: null,

  // ✅ FareQuote validation state
  flightValidation: initialFlightValidation,

  // ✅ SSR state
  selectedMeals: [],
  selectedSeats: [],
  selectedBaggage: [],
  ssrTotal: 0,

  // Optional booking storage
  bookings: [],

  clearBookings: () => {
    localStorage.removeItem("bookings");
    set({ bookings: [] });
  },

  setFlights: ({ flights, traceId }) =>
    set({
      flights: flights || [],
      traceId: traceId || null,
      lastSearchAt: Date.now(),
    }),

  setFlight: (flight) =>
    set({
      selectedFlight: flight || null,
      resultIndex:
        flight && flight.ResultIndex !== undefined ? flight.ResultIndex : null,
      isLcc: flight?.IsLCC ?? null,

      // ✅ reset SSR when user changes flight
      selectedMeals: [],
      selectedSeats: [],
      selectedBaggage: [],
      ssrTotal: 0,
    }),

  setFareQuote: (fareQuote) =>
    set({
      fareQuote,
      flightValidation: normalizeFlightValidation(fareQuote),
    }),

  setPassengerCount: (count) => set({ passengerCount: Number(count) || 1 }),

  // ✅ NEW: Adult / Child / Infant details for PassengerDetails page
  setSearchTravellers: (travellers) =>
    set({
      searchTravellers: {
        adults: Number(travellers?.adults || 1),
        children: Number(travellers?.children || 0),
        infants: Number(travellers?.infants || 0),
        cabin: travellers?.cabin || "Economy",
      },
    }),

  setSelectedMeals: (meals) => set({ selectedMeals: meals || [] }),

  setSelectedSeats: (seats) => set({ selectedSeats: seats || [] }),

  setSelectedBaggage: (baggage) => set({ selectedBaggage: baggage || [] }),

  calculateSSRTotal: () => {
    const { selectedSeats, selectedMeals, selectedBaggage } = get();

    const total = [
      ...(selectedSeats || []),
      ...(selectedMeals || []),
      ...(selectedBaggage || []),
    ].reduce((sum, item) => sum + Number(item?.Price || 0), 0);

    set({ ssrTotal: total });
  },

  // ✅ helper: call before Book/Ticket page
  isTraceExpired: () => {
    const { lastSearchAt } = get();

    if (!lastSearchAt) return true;

    // TBO TraceId expires around 15 minutes
    return Date.now() - lastSearchAt > 15 * 60 * 1000;
  },

  // ✅ helper: use on passenger page
  requiresPan: (method = "book") => {
    const { flightValidation } = get();

    return method === "ticket"
      ? flightValidation.isPanRequiredAtTicket
      : flightValidation.isPanRequiredAtBook;
  },

  requiresPassport: (method = "book") => {
    const { flightValidation } = get();

    return method === "ticket"
      ? flightValidation.isPassportRequiredAtTicket
      : flightValidation.isPassportRequiredAtBook;
  },

  requiresFullPassportDetails: () => {
    const { flightValidation } = get();
    return flightValidation.isPassportFullDetailRequiredAtBook;
  },

  requiresGST: () => {
    const { flightValidation } = get();
    return flightValidation.isGSTMandatory;
  },

  requiresSeatSelection: () => {
    const { flightValidation } = get();
    return flightValidation.isSeatMandatory;
  },

  requiresMealSelection: () => {
    const { flightValidation } = get();
    return flightValidation.isMealMandatory;
  },

  clearFlights: () =>
    set({
      flights: [],
      selectedFlight: null,
      traceId: null,
      resultIndex: null,
      fareQuote: null,
      isLcc: null,

      passengerCount: 1,
      searchTravellers: initialSearchTravellers,
      lastSearchAt: null,

      flightValidation: initialFlightValidation,

      selectedMeals: [],
      selectedSeats: [],
      selectedBaggage: [],
      ssrTotal: 0,
    }),

  resetBooking: () =>
    set({
      selectedFlight: null,
      resultIndex: null,
      fareQuote: null,
      isLcc: null,

      flightValidation: initialFlightValidation,

      selectedMeals: [],
      selectedSeats: [],
      selectedBaggage: [],
      ssrTotal: 0,
    }),
}));
