import { useLocation, useNavigate } from "react-router-dom";
import { useFlightStore } from "../../../store/flightStore";
import { privateApi } from "../../../services/api";
import { useState } from "react";

const ReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const savedData = JSON.parse(localStorage.getItem("bookingData"));
  const data = location.state || savedData || {};

  const getPrice = (val) => Number(val || 0);
  const {
    passengers,
    selectedSeats = [],
    selectedMeals = [],
    selectedFlight,
    selectedBaggage = [],
    traceId,
    resultIndex,
    fareQuote: stateFareQuote,
    isLcc: stateIsLcc,
  } = data;

  const [loading, setLoading] = useState(false);

  const store = useFlightStore();
  const fareQuote = store.fareQuote || stateFareQuote;

  const isLcc = (() => {
    // 1. from store (best)
    if (store.isLcc !== null && store.isLcc !== undefined) {
      return store.isLcc;
    }

    // 2. from state
    if (stateIsLcc !== null && stateIsLcc !== undefined) {
      return stateIsLcc;
    }

    // 3. from fareQuote (SAFE PARSE)
    const result = fareQuote?.Response?.Results;

    if (!result) return false;

    // if array
    if (Array.isArray(result)) {
      return result[0]?.IsLCC ?? false;
    }

    // if object
    return result?.IsLCC ?? false;
  })();

  if (!passengers || !selectedFlight) {
    return (
      <div className="flex justify-center items-center h-screen">
        Missing booking data
      </div>
    );
  }

  /* ================= PRICE ================= */

  const pricing = fareQuote?.Pricing || {};

  // ✅ EXACT SAME AS SSR PAGE
  const flightFare = getPrice(pricing?.TBOFare);
  const convenienceFee = getPrice(pricing?.ConvenienceFee);

  // SSR
  const seatPrice = selectedSeats.reduce(
    (sum, s) => sum + getPrice(s.Price),
    0,
  );

  const mealPrice = selectedMeals.reduce(
    (sum, m) => sum + getPrice(m.Price),
    0,
  );

  const baggagePrice = selectedBaggage.reduce(
    (sum, b) => sum + getPrice(b.Price),
    0,
  );

  // ✅ FINAL TOTAL (MATCH SSR)
  const totalPrice =
    flightFare + seatPrice + mealPrice + baggagePrice + convenienceFee;
  /* ================= HELPERS ================= */

  const formatDate = (date) => {
    if (!date) return "1990-01-01T00:00:00";
    return new Date(date).toISOString().split("T")[0] + "T00:00:00";
  };

  const getSSR = (arr, index) =>
    arr?.find((item) => item?.PassengerIndex === index) || arr?.[index];

  /* ================= BOOK ================= */

  const handleBook = async () => {
    if (!traceId || !resultIndex) {
      alert("Session expired. Please search again.");
      navigate("/");
      return;
    }

    try {
      setLoading(true);

      localStorage.setItem("bookingData", JSON.stringify(data));

      /* ---------- FARE REVALIDATION ---------- */

      const quoteRes = await privateApi.post("/api/airlines/fare-quote/", {
        TraceId: traceId,
        ResultIndex: resultIndex,
      });

      const response =
        quoteRes?.data?.data?.Response || quoteRes?.data?.Response;

      console.log("🧾 FARE QUOTE RESPONSE:", response);

      const ssr = response?.Results?.SSR || {};
      const mealSSR = ssr?.Meal || [];
      const seatSSR = ssr?.Seat || [];
      const baggageSSR = ssr?.Baggage || [];

      console.log("SSR MEALS:", mealSSR);

      const newTraceId = response.TraceId;
      const newResultIndex = response.Results.ResultIndex;
      const fareBreakdown = response.Results.FareBreakdown || [];
      // ✅ Source required for Release PNR
      const source = response?.Results?.Source;

      const getFareByPaxType = (paxType) =>
        fareBreakdown.find((f) => f.PassengerType === paxType) || {};

      /* ---------- PASSENGERS ---------- */

      const formattedPassengers = passengers.map((p, index) => {
        // ✅ 1 = Adult, 2 = Child, 3 = Infant
        const paxType = Number(p.paxType || 1);

        const paxFare = getFareByPaxType(paxType);

        const basePassenger = {
          Title: p.title,
          FirstName: p.firstName,
          LastName: p.lastName,
          PaxType: paxType,
          Gender: String(p.gender || "").toLowerCase() === "male" ? 1 : 2,

          DateOfBirth: formatDate(p.dob),

          PassportNo: p.passport || "",
          PassportExpiry: p.passportExpiry
            ? formatDate(p.passportExpiry)
            : null,

          PassportIssueDate: p.passportIssueDate
            ? formatDate(p.passportIssueDate)
            : null,

          AddressLine1: p.address || "Delhi",
          City: p.city || "Delhi",
          CountryCode: "IN",
          CountryName: "India",
          Nationality: "IN",

          ContactNo: p.phone,
          Email: p.email,
          IsLeadPax: index === 0,
        };

        const selectedMeal = getSSR(selectedMeals, index);
        const selectedSeat = getSSR(selectedSeats, index);
        const selectedBaggageItem = getSSR(selectedBaggage, index);

        /* ---------- MATCH WITH SSR ---------- */

        const meal = mealSSR.find((m) => m.Code === selectedMeal?.Code);

        const seat = seatSSR.find((s) => s.Code === selectedSeat?.Code);

        const baggage = baggageSSR.find(
          (b) => b.Code === selectedBaggageItem?.Code,
        );
        /* ---------- VALIDATIONS ---------- */

        const isValidMeal =
          meal &&
          meal.Code &&
          meal.Origin &&
          meal.Destination &&
          meal.WayType !== undefined;

        const isValidSeat =
          seat &&
          seat.Code &&
          seat.Origin &&
          seat.Destination &&
          seat.WayType !== undefined;

        const isValidBaggage =
          baggage &&
          baggage.Code &&
          baggage.Origin &&
          baggage.Destination &&
          baggage.WayType !== undefined;

        return {
          ...basePassenger,
          Fare: {
            BaseFare: paxFare?.BaseFare || 0,
            Tax: paxFare?.Tax || 0,
            YQTax: paxFare?.YQTax || 0,
          },

          /* ---------- SEAT ---------- */
          ...(isLcc &&
            isValidSeat && {
            SeatDynamic: [
              {
                WayType: seat.WayType,
                Code: seat.Code,
                Origin: seat.Origin,
                Destination: seat.Destination,
              },
            ],
          }),

          /* ---------- MEAL (FIXED) ---------- */
          ...(isLcc &&
            isValidMeal && {
            MealDynamic: [
              {
                WayType: meal.WayType,
                Code: meal.Code,
                Origin: meal.Origin,
                Destination: meal.Destination,
              },
            ],
          }),

          /* ---------- BAGGAGE ---------- */
          ...(isLcc &&
            isValidBaggage && {
            BaggageDynamic: [
              {
                WayType: baggage.WayType,
                Code: baggage.Code,
                Description: baggage.Description || "Baggage",
                Weight: baggage.Weight || "0",
                Currency: baggage.Currency || "INR",
                Price: Number(baggage.Price || 0),
                Origin: baggage.Origin,
                Destination: baggage.Destination,
              },
            ],
          }),
        };
      });

      const payload = {
        TraceId: newTraceId,
        ResultIndex: newResultIndex,
        Passengers: formattedPassengers,
      };

      console.log("🚀 FINAL PAYLOAD:", payload);

      /* ---------- API CALL ---------- */

      let res;

      if (isLcc === true) {
        res = await privateApi.post("/api/airlines/booking/ticket/", payload);
      } else {
        res = await privateApi.post("/api/airlines/book/", payload);
      }

      console.log("✅ BOOKING RESPONSE:", res.data);

      localStorage.setItem(
        "flightBookingData",
        JSON.stringify({
          booking: res?.data,

          // ✅ Release PNR ke liye
          source: source,
          isLcc: isLcc,
          traceId: newTraceId,
          passengers: formattedPassengers,

          pricing: {
            flightFare,
            seatPrice,
            mealPrice,
            baggagePrice,
            convenienceFee,
            totalPrice,
          },
        }),
      );

      navigate("/booking-success");
    } catch (error) {
      console.error("❌ BOOKING ERROR:", error?.response?.data);

      alert(
        error?.response?.data?.Error?.ErrorMessage ||
        error?.response?.data?.message ||
        "Booking failed",
      );
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="max-w-4xl mx-auto px-4 py-24">
      <h2 className="text-xl font-bold mb-6">Review Booking</h2>

      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h3 className="font-semibold mb-3">Passengers</h3>
        {passengers.map((p, i) => {
          const seat = getSSR(selectedSeats, i);

          return (
            <div key={i} className="text-sm mb-2">
              {p.title} {p.firstName} {p.lastName}
              {isLcc && seat?.Code && (
                <span className="ml-2 text-blue-600">Seat {seat.Code}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Fare Summary</h3>

        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span>Flight Fare</span>
            <span>₹{flightFare}</span>
          </div>

          {seatPrice > 0 && (
            <div className="flex justify-between">
              <span>Seat Charges</span>
              <span>₹{seatPrice}</span>
            </div>
          )}

          {mealPrice > 0 && (
            <div className="flex justify-between">
              <span>Meal Charges</span>
              <span>₹{mealPrice}</span>
            </div>
          )}

          {baggagePrice > 0 && (
            <div className="flex justify-between">
              <span>Baggage Charges</span>
              <span>₹{baggagePrice}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Convenience Fee</span>
            <span>₹{convenienceFee}</span>
          </div>

          <hr />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total Payable</span>
            <span>₹{totalPrice}</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleBook}
        disabled={loading}
        className={`px-6 py-3 rounded-lg text-white ${loading ? "bg-gray-400" : "bg-green-600"
          }`}
      >
        {loading ? "Booking..." : "Confirm Booking"}
      </button>
    </div>
  );
};

export default ReviewBooking;
