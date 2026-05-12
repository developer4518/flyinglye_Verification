import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";
import { useFlightStore } from "../../../store/flightStore";

// ✅ Handles both book response and ticket response
const normalizeBookingResponse = (res) => {
  return (
    res?.data?.Response?.Response ||
    res?.data?.Response ||
    res?.Response?.Response ||
    res?.Response ||
    res
  );
};

const BookingSuccess = () => {
  const navigate = useNavigate();

  const storeTraceId = useFlightStore((state) => state.traceId);

  const [booking, setBooking] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [storedData, setStoredData] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("flightBookingData"));

    if (!stored) {
      navigate("/");
      return;
    }

    console.log("BOOKING 👉", stored);

    setStoredData(stored);

    const raw = stored.booking || stored;
    const normalized = normalizeBookingResponse(raw);

    setBooking(normalized);
    setPricing(stored.pricing || null);
  }, [navigate]);

  if (!booking) {
    return (
      <div className="flex justify-center items-center h-screen text-lg font-semibold">
        Loading your ticket...
      </div>
    );
  }

  const itinerary = booking?.FlightItinerary || {};

  const passengers = Array.isArray(itinerary?.Passenger)
    ? itinerary.Passenger
    : itinerary?.Passenger
      ? [itinerary.Passenger]
      : [];

  const segments = Array.isArray(itinerary?.Segments)
    ? itinerary.Segments
    : itinerary?.Segments
      ? [itinerary.Segments]
      : [];

  const bookingId =
    itinerary?.BookingId ||
    booking?.BookingId ||
    booking?.Response?.BookingId ||
    "N/A";

  const pnr = itinerary?.PNR || booking?.PNR || booking?.Response?.PNR || "N/A";

  const stored = JSON.parse(localStorage.getItem("flightBookingData") || "{}");

  const traceId =
    itinerary?.TraceId ||
    booking?.TraceId ||
    booking?.Response?.TraceId ||
    stored?.traceId ||
    stored?.TraceId ||
    storedData?.traceId ||
    storedData?.TraceId ||
    stored?.fareQuote?.TraceId ||
    stored?.fareQuote?.Response?.TraceId ||
    stored?.fareQuote?.data?.TraceId ||
    stored?.fareQuote?.data?.Response?.TraceId ||
    storeTraceId ||
    "";

  const pricingData = stored?.pricing;

  if (!pricingData) {
    console.error("❌ Pricing missing! Redirecting...");
    navigate("/");
    return null;
  }

  const flightFare = Number(pricingData.flightFare || 0);
  const seatPrice = Number(pricingData.seatPrice || 0);
  const mealPrice = Number(pricingData.mealPrice || 0);
  const baggagePrice = Number(pricingData.baggagePrice || 0);
  const convenienceFee = Number(pricingData.convenienceFee || 0);
  const totalFare = Number(pricingData.totalPrice || 0);

  const hasTicket = passengers.some((p) => p?.Ticket?.TicketNumber);

  const status = hasTicket
    ? "Ticketed"
    : itinerary?.Status === 5
      ? "Confirmed"
      : "Pending";

  const isNonLcc =
    storedData?.isLcc === false ||
    storedData?.isLCC === false ||
    stored?.isLcc === false ||
    stored?.isLCC === false ||
    storedData?.fareQuote?.Response?.Results?.IsLCC === false ||
    storedData?.fareQuote?.Response?.Results?.[0]?.IsLCC === false ||
    itinerary?.IsLCC === false ||
    booking?.IsLCC === false;

  const canGenerateTicket =
    isNonLcc && !hasTicket && bookingId !== "N/A" && pnr !== "N/A";

  const formatDateTime = (date) => {
    if (!date) return "";
    if (String(date).includes("T")) return date;
    return `${date}T00:00:00`;
  };

  const handleGenerateTicket = async () => {
    try {
      if (!traceId) {
        console.log("TRACE ID DEBUG 👉", {
          itinerary,
          booking,
          stored,
          storedData,
          storeTraceId,
        });

        alert(
          "TraceId missing. Please book again or save TraceId in flightBookingData.",
        );
        return;
      }

      if (!bookingId || bookingId === "N/A") {
        alert("Booking ID missing");
        return;
      }

      if (!pnr || pnr === "N/A") {
        alert("PNR missing");
        return;
      }

      setTicketLoading(true);

      const latestStored = JSON.parse(
        localStorage.getItem("flightBookingData") || "{}",
      );

      const savedPassengers =
        latestStored?.passengers ||
        latestStored?.passengerDetails ||
        JSON.parse(localStorage.getItem("passengers") || "[]") ||
        JSON.parse(localStorage.getItem("passengerDetails") || "[]");

      const passportPayload = passengers.map((apiPassenger, index) => {
        const savedPassenger = savedPassengers?.[index] || {};

        return {
          PaxId: apiPassenger?.PaxId,
          PassportNo:
            apiPassenger?.PassportNo ||
            savedPassenger?.PassportNo ||
            savedPassenger?.passportNo ||
            "",
          PassportExpiry: formatDateTime(
            apiPassenger?.PassportExpiry ||
              savedPassenger?.PassportExpiry ||
              savedPassenger?.passportExpiry,
          ),
          DateOfBirth: formatDateTime(
            apiPassenger?.DateOfBirth ||
              savedPassenger?.DateOfBirth ||
              savedPassenger?.dob ||
              savedPassenger?.dateOfBirth,
          ),
        };
      });

      const missingPassport = passportPayload.some(
        (p) => !p.PaxId || !p.PassportNo || !p.PassportExpiry || !p.DateOfBirth,
      );

      if (missingPassport) {
        console.log("PASSPORT PAYLOAD ERROR 👉", passportPayload);
        alert("Passport details missing for one or more passengers");
        return;
      }

      const ticketPayload = {
        TraceId: traceId,
        PNR: pnr,
        BookingId: Number(bookingId),
        Passport: passportPayload,
        IsPriceChangeAccepted: true,
      };

      console.log("NON-LCC TICKET PAYLOAD 👉", ticketPayload);

      const { data } = await privateApi.post(
        "/api/airlines/ticket/",
        ticketPayload,
      );

      console.log("NON-LCC TICKET RESPONSE 👉", data);

      const updatedStored = {
        ...latestStored,
        booking: data,
        pricing: latestStored?.pricing,
        traceId:
          data?.data?.Response?.TraceId || data?.Response?.TraceId || traceId,
        TraceId:
          data?.data?.Response?.TraceId || data?.Response?.TraceId || traceId,
        isLcc: false,
      };

      localStorage.setItem("flightBookingData", JSON.stringify(updatedStored));

      const normalized = normalizeBookingResponse(data);

      setBooking(normalized);
      setStoredData(updatedStored);

      alert("Ticket generated successfully");
    } catch (error) {
      console.error("NON-LCC TICKET ERROR 👉", error);

      alert(
        error?.response?.data?.message ||
          error?.response?.data?.Error?.ErrorMessage ||
          error?.response?.data?.Response?.Error?.ErrorMessage ||
          error?.message ||
          "Ticket generation failed",
      );
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen py-20 px-3 md:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              🎉 Booking Confirmed
            </h2>

            <p className="text-sm mt-1 opacity-90">
              {hasTicket
                ? "Your e-ticket is ready ✈"
                : "Booking created. Generate ticket now."}
            </p>

            <div className="mt-3 text-sm space-y-1 break-all">
              <p>PNR: {pnr}</p>
              <p>Booking ID: {bookingId}</p>
              <p>TraceId: {traceId || "N/A"}</p>
              <p>
                Status: <span className="font-semibold">{status}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 md:mt-0 bg-white text-black px-6 py-3 rounded-xl font-semibold shadow-md h-fit">
            ₹ {totalFare}
          </div>
        </div>

        {/* FLIGHTS */}
        {segments.map((seg, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-md p-5 border">
            <div className="flex justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">
                  {seg?.Airline?.AirlineName}
                </h3>
                <p className="text-sm text-gray-500">
                  {seg?.Airline?.AirlineCode}-{seg?.Airline?.FlightNumber}
                </p>
              </div>

              <span className="text-xs bg-blue-50 px-3 py-1 rounded-full h-fit">
                {seg?.StopPoint ? "Connecting" : "Non-stop"}
              </span>
            </div>

            <div className="flex justify-between items-center text-center">
              <div>
                <p className="text-xl font-bold">
                  {seg?.Origin?.Airport?.AirportCode}
                </p>
                <p className="text-xs text-gray-500">
                  {seg?.Origin?.DepTime
                    ? new Date(seg.Origin.DepTime).toLocaleString()
                    : "N/A"}
                </p>
              </div>

              <div>✈</div>

              <div>
                <p className="text-xl font-bold">
                  {seg?.Destination?.Airport?.AirportCode}
                </p>
                <p className="text-xs text-gray-500">
                  {seg?.Destination?.ArrTime
                    ? new Date(seg.Destination.ArrTime).toLocaleString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* PASSENGERS */}
        <div className="bg-white rounded-2xl shadow-md p-5 border">
          <h3 className="font-semibold text-lg mb-4">Passengers</h3>

          {passengers.map((p, i) => (
            <div key={i} className="border-b py-3 text-sm space-y-1">
              <p className="font-medium">
                {p?.Title} {p?.FirstName} {p?.LastName}
              </p>

              <p className="text-gray-500">
                Ticket: {p?.Ticket?.TicketNumber || "N/A"}
              </p>

              <p className="text-gray-500">
                Ticket Status: {p?.Ticket?.Status || "N/A"}
              </p>

              <p className="text-gray-500">
                Issue Date:{" "}
                {p?.Ticket?.IssueDate
                  ? new Date(p.Ticket.IssueDate).toLocaleString()
                  : "N/A"}
              </p>

              <p className="text-gray-500">
                Type:{" "}
                {p?.PaxType === 1
                  ? "Adult"
                  : p?.PaxType === 2
                    ? "Child"
                    : "Infant"}
              </p>
            </div>
          ))}
        </div>

        {/* FARE DETAILS */}
        <div className="bg-white rounded-2xl shadow-md p-5 border mb-24">
          <h3 className="font-semibold text-lg mb-4">Fare Details</h3>

          <Row label="Flight Fare" value={flightFare} />
          {seatPrice > 0 && <Row label="Seat" value={seatPrice} />}
          {mealPrice > 0 && <Row label="Meal" value={mealPrice} />}
          {baggagePrice > 0 && <Row label="Baggage" value={baggagePrice} />}
          {convenienceFee > 0 && (
            <Row label="Convenience Fee" value={convenienceFee} />
          )}

          <div className="border-t mt-3 pt-3 flex justify-between font-bold">
            <span>Total Paid</span>
            <span>₹ {totalFare}</span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
          <div className="max-w-5xl mx-auto flex gap-3">
            <button
              onClick={() => {
                if (!bookingId || bookingId === "N/A") {
                  alert("Booking ID missing!");
                  return;
                }
                navigate(`/flight-booking-details/${bookingId}`);
              }}
              className="flex-1 bg-gray-200 py-3 rounded-xl"
            >
              View Full Booking
            </button>

            {canGenerateTicket && (
              <button
                onClick={handleGenerateTicket}
                disabled={ticketLoading}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl disabled:opacity-60"
              >
                {ticketLoading ? "Generating..." : "Generate Ticket"}
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl"
            >
              Print Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-600">{label}</span>
    <span>₹ {value ?? 0}</span>
  </div>
);

export default BookingSuccess;
