import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { privateApi } from "../../../services/api";

const safeJSONParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeResponse = (data) => {
  return (
    data?.data?.Response ||
    data?.Response?.Response ||
    data?.Response ||
    data?.data ||
    data ||
    {}
  );
};

const getItinerary = (data) => {
  const root = normalizeResponse(data);

  return (
    root?.FlightItinerary ||
    root?.Response?.FlightItinerary ||
    data?.data?.Response?.FlightItinerary ||
    data?.Response?.FlightItinerary ||
    {}
  );
};

const getNestedBookingId = (value) => {
  const itinerary = getItinerary(value);
  const root = normalizeResponse(value);

  return (
    itinerary?.BookingId ||
    root?.BookingId ||
    root?.BookingID ||
    root?.Response?.BookingId ||
    root?.Response?.BookingID ||
    value?.BookingId ||
    value?.BookingID ||
    null
  );
};

const getStoredBookingId = (stored, routeId) => {
  const candidates = [
    routeId,

    stored?.BookingId,
    stored?.bookingId,

    getNestedBookingId(stored?.booking),
    getNestedBookingId(stored?.booking?.bookResponse),
    getNestedBookingId(stored?.booking?.ticketResponse),

    getNestedBookingId(stored?.bookResponse),
    getNestedBookingId(stored?.ticketResponse),
  ];

  return candidates.find(
    (item) =>
      item !== null && item !== undefined && item !== "" && item !== "N/A",
  );
};

const getPNR = (itinerary, data) => {
  const root = normalizeResponse(data);

  return (
    itinerary?.PNR ||
    itinerary?.Pnr ||
    root?.PNR ||
    root?.Pnr ||
    root?.Response?.PNR ||
    root?.Response?.Pnr ||
    "N/A"
  );
};

const getTicketNumber = (passenger) => {
  return (
    passenger?.Ticket?.TicketNumber ||
    passenger?.TicketNumber ||
    passenger?.Ticket?.TicketNo ||
    passenger?.TicketNo ||
    ""
  );
};

const getPassengerName = (passenger) => {
  return `${passenger?.Title || ""} ${passenger?.FirstName || ""} ${
    passenger?.LastName || ""
  }`
    .replace(/\s+/g, " ")
    .trim();
};

const getPaxTypeLabel = (paxType) => {
  if (Number(paxType) === 1) return "Adult";
  if (Number(paxType) === 2) return "Child";
  if (Number(paxType) === 3) return "Infant";
  return "Passenger";
};

const formatDateTime = (date) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleString();
};

const formatTime = (date) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusLabel = (status, hasTicket) => {
  if (hasTicket) return "Ticketed";

  if (Number(status) === 5) return "Confirmed";
  if (Number(status) === 1) return "In Progress";
  if (Number(status) === 3) return "Failed";
  if (Number(status) === 6) return "Cancelled";

  return "Pending";
};

const getStatusClass = (status, hasTicket) => {
  if (hasTicket || Number(status) === 5) return "text-green-400";
  if (Number(status) === 3 || Number(status) === 6) return "text-red-400";
  return "text-yellow-400";
};

const getFareSummary = (stored, itinerary) => {
  const pricing = stored?.pricing || {};
  const fare = itinerary?.Fare || {};

  const flightFare = Number(
    pricing?.flightFare ||
      fare?.PublishedFare ||
      fare?.OfferedFare ||
      fare?.BaseFare ||
      0,
  );

  const seatPrice = Number(pricing?.seatPrice || 0);
  const mealPrice = Number(pricing?.mealPrice || 0);
  const baggagePrice = Number(pricing?.baggagePrice || 0);
  const convenienceFee = Number(pricing?.convenienceFee || 0);

  const totalFare = Number(
    pricing?.totalPrice ||
      fare?.PublishedFare ||
      flightFare + seatPrice + mealPrice + baggagePrice + convenienceFee ||
      0,
  );

  return {
    flightFare,
    seatPrice,
    mealPrice,
    baggagePrice,
    convenienceFee,
    totalFare,
  };
};

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span>{label}</span>
    <span>₹ {Number(value || 0).toFixed(2)}</span>
  </div>
);

const FlightBookingDetails = () => {
  const [data, setData] = useState(null);
  const [storedData, setStoredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  const fetchBooking = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const stored =
        safeJSONParse(localStorage.getItem("flightBookingData")) || {};
      setStoredData(stored);

      const bookingId = getStoredBookingId(stored, id);

      if (!bookingId) {
        throw new Error("BookingId missing");
      }

      const res = await privateApi.post("/api/airlines/booking-details/", {
        BookingId: Number(bookingId),
      });

      const apiData = res?.data;

      const normalized = normalizeResponse(apiData);

      if (
        !normalized?.FlightItinerary &&
        !normalized?.Response?.FlightItinerary
      ) {
        throw new Error("Invalid booking details response");
      }

      setData(apiData);
    } catch (err) {
      console.error("BOOKING DETAILS ERROR:", err?.response?.data || err);

      setError(
        err?.response?.data?.Response?.Error?.ErrorMessage ||
          err?.response?.data?.Error?.ErrorMessage ||
          err?.response?.data?.message ||
          err?.message ||
          "Unable to fetch booking details",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const parsed = useMemo(() => {
    if (!data) return null;

    const itinerary = getItinerary(data);

    const stored =
      storedData ||
      safeJSONParse(localStorage.getItem("flightBookingData")) ||
      {};

    const passengers = toArray(itinerary?.Passenger);

    const segments = toArray(itinerary?.Segments);

    const bookingId =
      itinerary?.BookingId || getStoredBookingId(stored, id) || "N/A";

    const pnr = getPNR(itinerary, data);

    const hasTicket = passengers.some((passenger) =>
      getTicketNumber(passenger),
    );

    const status = getStatusLabel(itinerary?.Status, hasTicket);

    const statusClass = getStatusClass(itinerary?.Status, hasTicket);

    const priceSummary = getFareSummary(stored, itinerary);

    return {
      itinerary,
      passengers,
      segments,
      bookingId,
      pnr,
      hasTicket,
      status,
      statusClass,
      priceSummary,
    };
  }, [data, storedData, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex items-center justify-center">
        <div className="animate-pulse text-lg">Fetching Booking...</div>
      </div>
    );
  }

  if (error || !parsed) {
    return (
      <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-400">{error || "Booking not found"}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/booking-success")}
            className="px-5 py-3 rounded-xl border border-(--border-soft)"
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => fetchBooking()}
            className="px-5 py-3 rounded-xl bg-linear-to-r from-start to-end text-black font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    itinerary,
    passengers,
    segments,
    bookingId,
    pnr,
    hasTicket,
    status,
    statusClass,
    priceSummary,
  } = parsed;

  const firstSeg = segments?.[0];
  const lastSeg = segments?.[segments.length - 1];

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0B0B0F] to-black text-white px-4 md:px-10 py-16">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-[#15151C]/80 p-6 rounded-3xl border border-gray-800">
          <div className="flex flex-col md:flex-row justify-between gap-5">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold text-yellow-400">
                {itinerary?.Origin ||
                  firstSeg?.Origin?.Airport?.AirportCode ||
                  "-"}{" "}
                →{" "}
                {itinerary?.Destination ||
                  lastSeg?.Destination?.Airport?.AirportCode ||
                  "-"}
              </h2>

              <p className="text-sm text-gray-400 mt-2">
                {firstSeg?.Origin?.Airport?.CityName || "-"} →{" "}
                {lastSeg?.Destination?.Airport?.CityName || "-"}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                {hasTicket
                  ? "Ticket details are available."
                  : "Booking exists. Ticket may still be pending."}
              </p>
            </div>

            <div className="text-sm text-gray-400 space-y-1 break-all">
              <p>PNR: {pnr}</p>
              <p>Booking ID: {bookingId}</p>
              <p>
                Status:{" "}
                <span className={`${statusClass} font-medium`}>{status}</span>
              </p>

              <button
                type="button"
                onClick={() => fetchBooking({ silent: true })}
                disabled={refreshing}
                className="mt-3 rounded-lg bg-yellow-400 px-4 py-2 text-black font-semibold disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh Status"}
              </button>
            </div>
          </div>
        </div>

        {segments.length > 0 ? (
          segments.map((seg, index) => (
            <div
              key={index}
              className="bg-[#15151C]/80 p-6 rounded-3xl border border-gray-800"
            >
              <div className="flex flex-col md:flex-row justify-between items-center gap-5">
                <div className="flex-1">
                  <p className="text-yellow-300 font-medium">
                    {seg?.Airline?.AirlineName || "Airline"}
                  </p>

                  <p className="text-sm text-gray-400">
                    {seg?.Airline?.AirlineCode || ""}
                    {seg?.Airline?.AirlineCode && seg?.Airline?.FlightNumber
                      ? "-"
                      : ""}
                    {seg?.Airline?.FlightNumber || ""}
                  </p>
                </div>

                <div className="flex-1 text-center">
                  <p className="font-semibold">
                    {formatTime(seg?.Origin?.DepTime)}
                  </p>

                  <p className="text-xs text-gray-400">
                    {seg?.Origin?.Airport?.AirportCode || "-"} ·{" "}
                    {seg?.Origin?.Airport?.CityName || "-"}
                  </p>

                  <div className="my-2 text-gray-500">──── ✈ ────</div>

                  <p className="font-semibold">
                    {formatTime(seg?.Destination?.ArrTime)}
                  </p>

                  <p className="text-xs text-gray-400">
                    {seg?.Destination?.Airport?.AirportCode || "-"} ·{" "}
                    {seg?.Destination?.Airport?.CityName || "-"}
                  </p>
                </div>

                <div className="flex-1 text-right text-sm text-gray-400">
                  <p>Departure: {formatDateTime(seg?.Origin?.DepTime)}</p>
                  <p>Arrival: {formatDateTime(seg?.Destination?.ArrTime)}</p>
                  <p className="mt-2">🧳 {seg?.Baggage || "N/A"}</p>
                  <p>💼 {seg?.CabinBaggage || "N/A"}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[#15151C]/80 p-6 rounded-3xl border border-gray-800 text-gray-400">
            No segment details available.
          </div>
        )}

        <div className="bg-[#15151C]/80 p-6 rounded-3xl border border-gray-800">
          <h3 className="text-yellow-300 mb-4 font-semibold text-lg">
            Passengers
          </h3>

          {passengers.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {passengers.map((passenger, index) => {
                const ticketNumber = getTicketNumber(passenger);

                return (
                  <div
                    key={index}
                    className="bg-black/40 p-4 rounded-xl border border-gray-800"
                  >
                    <p className="font-medium">{getPassengerName(passenger)}</p>

                    <p className="text-xs text-gray-400 mt-1">
                      Type: {getPaxTypeLabel(passenger?.PaxType)}
                    </p>

                    <p className="text-xs text-gray-400">
                      Ticket: {ticketNumber || "N/A"}
                    </p>

                    <p className="text-xs text-gray-400">
                      Ticket Status:{" "}
                      {passenger?.Ticket?.Status ||
                        passenger?.TicketStatus ||
                        "N/A"}
                    </p>

                    <p className="text-xs text-gray-400">
                      Issue Date: {formatDateTime(passenger?.Ticket?.IssueDate)}
                    </p>

                    {passenger?.IsLeadPax && (
                      <span className="inline-block mt-2 text-green-400 text-xs">
                        Lead Passenger
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Passenger details are not available.
            </p>
          )}
        </div>

        <div className="bg-linear-to-r from-yellow-400/10 to-yellow-500/5 p-6 rounded-3xl border border-yellow-400/20">
          <h3 className="text-yellow-300 mb-4 font-semibold text-lg">
            Price Summary
          </h3>

          <div className="space-y-2 text-sm">
            <Row label="Flight Fare" value={priceSummary.flightFare} />

            {priceSummary.seatPrice > 0 && (
              <Row label="Seat Charges" value={priceSummary.seatPrice} />
            )}

            {priceSummary.mealPrice > 0 && (
              <Row label="Meal Charges" value={priceSummary.mealPrice} />
            )}

            {priceSummary.baggagePrice > 0 && (
              <Row label="Baggage Charges" value={priceSummary.baggagePrice} />
            )}

            {priceSummary.convenienceFee > 0 && (
              <Row
                label="Convenience Fee"
                value={priceSummary.convenienceFee}
              />
            )}

            <div className="border-t border-gray-700 my-3" />

            <div className="flex justify-between text-xl font-bold">
              <span>Total Paid</span>
              <span className="text-yellow-400">
                ₹ {priceSummary.totalFare.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 pb-10">
          <button
            type="button"
            onClick={() => navigate("/booking-success")}
            className="flex-1 rounded-xl border border-gray-700 py-3"
          >
            Back to Success
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-xl bg-yellow-400 py-3 font-semibold text-black"
          >
            Print Details
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 rounded-xl bg-gray-800 py-3"
          >
            New Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlightBookingDetails;
