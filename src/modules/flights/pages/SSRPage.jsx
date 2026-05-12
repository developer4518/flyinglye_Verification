import { useEffect, useState } from "react";
import { privateApi } from "../../../services/api";
import { useFlightStore } from "../../../store/flightStore";
import { useNavigate } from "react-router-dom";

const SSRPage = () => {
  const {
    traceId,
    resultIndex,
    selectedSeats,
    selectedMeals,
    selectedBaggage,
    setSelectedMeals,
    setSelectedSeats,
    setSelectedBaggage,
    passengerCount,
    fareQuote,
  } = useFlightStore();

  const [baggage, setBaggage] = useState([]);
  const [meals, setMeals] = useState([]);
  const [seatRows, setSeatRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activePassenger, setActivePassenger] = useState(0);

  const navigate = useNavigate();

  /* ---------------- Utils ---------------- */

  const getPrice = (val) => Number(val || 0);

  const normalizeArray = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value.flat(Infinity).filter(Boolean);
    }

    if (typeof value === "object") {
      return Object.values(value).flat(Infinity).filter(Boolean);
    }

    return [];
  };

  const getSeatKey = (seat) => {
    return `${seat?.Code || ""}-${seat?.Origin || ""}-${
      seat?.Destination || ""
    }`;
  };

  const getMealKey = (meal) => {
    return `${meal?.Code || ""}-${meal?.Origin || ""}-${
      meal?.Destination || ""
    }`;
  };

  const isValidResultIndex =
    resultIndex !== undefined && resultIndex !== null && resultIndex !== "";

  /* ---------------- Session Guard ---------------- */

  useEffect(() => {
    if (!traceId || !isValidResultIndex) {
      navigate("/");
    }
  }, [traceId, isValidResultIndex, navigate]);

  /* ---------------- Seat Click ---------------- */

  const handleSeatClick = (seat) => {
    if (!passengerCount) {
      alert("Passenger count missing. Please restart booking.");
      return;
    }

    const seatKey = getSeatKey(seat);

    const alreadyTakenByOtherPassenger = selectedSeats.find(
      (s) => getSeatKey(s) === seatKey && s.PassengerIndex !== activePassenger,
    );

    if (alreadyTakenByOtherPassenger) {
      alert(
        `Seat ${seat.Code} is already selected for Passenger ${
          alreadyTakenByOtherPassenger.PassengerIndex + 1
        }`,
      );
      return;
    }

    let updatedSeats = [...selectedSeats];

    const alreadySelectedByActivePassenger = updatedSeats.find(
      (s) => getSeatKey(s) === seatKey && s.PassengerIndex === activePassenger,
    );

    if (alreadySelectedByActivePassenger) {
      updatedSeats = updatedSeats.filter(
        (s) =>
          !(getSeatKey(s) === seatKey && s.PassengerIndex === activePassenger),
      );

      setSelectedSeats(updatedSeats);
      return;
    }

    updatedSeats = updatedSeats.filter(
      (s) => s.PassengerIndex !== activePassenger,
    );

    updatedSeats.push({
      ...seat,
      PassengerIndex: activePassenger,
    });

    setSelectedSeats(updatedSeats);
  };

  /* ---------------- Meal Click ---------------- */

  const handleMealSelect = (meal) => {
    if (!passengerCount) {
      alert("Passenger count missing. Please restart booking.");
      return;
    }

    const mealKey = getMealKey(meal);

    let updatedMeals = [...selectedMeals];

    const alreadySelectedByActivePassenger = updatedMeals.find(
      (m) => getMealKey(m) === mealKey && m.PassengerIndex === activePassenger,
    );

    // ✅ Click same meal again = remove meal
    if (alreadySelectedByActivePassenger) {
      updatedMeals = updatedMeals.filter(
        (m) =>
          !(getMealKey(m) === mealKey && m.PassengerIndex === activePassenger),
      );

      setSelectedMeals(updatedMeals);
      return;
    }

    // ✅ One meal per passenger
    updatedMeals = updatedMeals.filter(
      (m) => m.PassengerIndex !== activePassenger,
    );

    updatedMeals.push({
      ...meal,
      PassengerIndex: activePassenger,
      Quantity: meal.Quantity || 1,
    });

    setSelectedMeals(updatedMeals);
  };

  /* ---------------- Baggage Click ---------------- */

  const handleBaggageSelect = (bag) => {
    if (bag.Code === "NO_BAGGAGE") {
      setSelectedBaggage([]);
      return;
    }

    const updated = [];

    for (let i = 0; i < passengerCount; i++) {
      updated.push({
        ...bag,
        PassengerIndex: i,
      });
    }

    setSelectedBaggage(updated);
  };

  /* ---------------- Seat Renderer ---------------- */

  const renderSeat = (seat, seatIndex) => {
    const unavailable = seat.AvailablityType === 0;
    const price = getPrice(seat.Price);

    const selectedSeat = selectedSeats.find(
      (s) => getSeatKey(s) === getSeatKey(seat),
    );

    const isSelectedByActivePassenger =
      selectedSeat?.PassengerIndex === activePassenger;

    const isSelectedByOtherPassenger =
      selectedSeat && selectedSeat.PassengerIndex !== activePassenger;

    return (
      <button
        key={`${getSeatKey(seat)}-${seatIndex}`}
        disabled={unavailable}
        onClick={() => handleSeatClick(seat)}
        className={`w-12 h-12 rounded-md text-[10px] flex flex-col justify-center items-center border transition
          ${
            unavailable
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : isSelectedByActivePassenger
                ? "bg-green-600 text-white border-green-700"
                : isSelectedByOtherPassenger
                  ? "bg-red-500 text-white border-red-600"
                  : price > 0
                    ? "bg-yellow-400 hover:bg-yellow-500 border-yellow-500"
                    : "bg-white hover:bg-gray-100"
          }`}
      >
        <span>{seat.Code}</span>

        {isSelectedByOtherPassenger && selectedSeat && (
          <span className="text-[8px]">P{selectedSeat.PassengerIndex + 1}</span>
        )}

        {price > 0 && <span className="text-[9px]">₹{price}</span>}
      </button>
    );
  };

  /* ---------------- Fetch SSR ---------------- */

  const fetchSSR = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("SSR PAYLOAD 👉", {
        TraceId: traceId,
        ResultIndex: resultIndex,
      });

      const res = await privateApi.post("/api/airlines/ssr/", {
        TraceId: traceId,
        ResultIndex: resultIndex,
      });

      console.log("SSR RAW RESPONSE 👉", res.data);

      const ssrResponse =
        res?.data?.Response?.Response ||
        res?.data?.Response ||
        res?.data?.data?.Response ||
        res?.data?.data ||
        res?.data;

      console.log("SSR FINAL RESPONSE 👉", ssrResponse);

      if (ssrResponse?.Error?.ErrorCode && ssrResponse.Error.ErrorCode !== 0) {
        throw new Error(ssrResponse.Error.ErrorMessage || "SSR API error");
      }

      const mealList = [
        ...normalizeArray(ssrResponse?.MealDynamic),
        ...normalizeArray(ssrResponse?.Meal),
        ...normalizeArray(ssrResponse?.Meals),
      ];

      const baggageList = [
        ...normalizeArray(ssrResponse?.Baggage),
        ...normalizeArray(ssrResponse?.BaggageDynamic),
      ];

      const seatDynamic = normalizeArray(ssrResponse?.SeatDynamic);

      const allSeatRows =
        seatDynamic.flatMap((seg) =>
          normalizeArray(seg?.SegmentSeat).flatMap((segmentSeat) =>
            normalizeArray(segmentSeat?.RowSeats),
          ),
        ) || [];

      console.log("MEALS LIST 👉", mealList);
      console.log("BAGGAGE LIST 👉", baggageList);
      console.log("SEAT ROWS 👉", allSeatRows);

      setMeals(mealList);
      setBaggage(baggageList);
      setSeatRows(allSeatRows.map((row) => row.Seats || []));
    } catch (err) {
      console.log("SSR AXIOS ERROR 👉", err);
      console.log("SSR ERROR RESPONSE 👉", err.response?.data);

      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.Response?.Error?.ErrorMessage ||
        err.message ||
        "Failed to load SSR data";

      setError(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (traceId && isValidResultIndex) {
      fetchSSR();
    }
  }, [traceId, resultIndex]);

  /* ---------------- Price ---------------- */

  const pricing = fareQuote?.Pricing || {};

  const flightFare = Number(pricing?.TBOFare || 0);
  const convenienceFee = Number(pricing?.ConvenienceFee || 0);

  const seatsTotal = selectedSeats.reduce((t, s) => t + getPrice(s.Price), 0);
  const mealsTotal = selectedMeals.reduce((t, m) => t + getPrice(m.Price), 0);
  const baggageTotal = selectedBaggage.reduce(
    (t, b) => t + getPrice(b.Price),
    0,
  );

  const finalTotal =
    flightFare + seatsTotal + mealsTotal + baggageTotal + convenienceFee;

  /* ---------------- Derived ---------------- */

  const paidBaggage = baggage.filter((b) => getPrice(b.Price) > 0);

  const noBaggageOption = {
    Code: "NO_BAGGAGE",
    Price: 0,
  };

  const activePassengerSeat = selectedSeats.find(
    (s) => s.PassengerIndex === activePassenger,
  );

  const activePassengerMeal = selectedMeals.find(
    (m) => m.PassengerIndex === activePassenger,
  );

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-red-600 px-4 text-center">
        <p className="font-semibold">{error}</p>

        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-20">
      <h2 className="text-xl font-bold mb-8">Select Add-ons</h2>

      {/* Passenger Selector */}
      <div className="mb-8 p-4 border rounded bg-white shadow-sm">
        <h3 className="font-semibold mb-3">Select Passenger</h3>

        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: passengerCount || 0 }).map((_, index) => {
            const hasSeat = selectedSeats.some(
              (s) => s.PassengerIndex === index,
            );

            const hasMeal = selectedMeals.some(
              (m) => m.PassengerIndex === index,
            );

            return (
              <button
                key={index}
                onClick={() => setActivePassenger(index)}
                className={`px-4 py-2 rounded border text-sm transition ${
                  activePassenger === index
                    ? "bg-blue-600 text-white border-blue-600"
                    : hasSeat || hasMeal
                      ? "bg-green-100 border-green-500 text-green-700"
                      : "bg-white"
                }`}
              >
                Passenger {index + 1}
                {hasSeat ? " Seat✓" : ""}
                {hasMeal ? " Meal✓" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meals */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="font-semibold">Meals</h3>
            <p className="text-sm text-gray-500">
              Meal selection for Passenger {activePassenger + 1}
            </p>
          </div>

          {activePassengerMeal && (
            <button
              onClick={() => {
                const updatedMeals = selectedMeals.filter(
                  (m) => m.PassengerIndex !== activePassenger,
                );
                setSelectedMeals(updatedMeals);
              }}
              className="px-4 py-2 rounded bg-red-600 text-white text-sm"
            >
              Remove Meal
            </button>
          )}
        </div>

        {activePassengerMeal && (
          <div className="mb-4 p-3 border rounded bg-blue-50 text-sm">
            Selected Meal:{" "}
            <span className="font-semibold">
              {activePassengerMeal.AirlineDescription ||
                activePassengerMeal.Description ||
                activePassengerMeal.Code ||
                "Meal"}
            </span>{" "}
            - ₹{getPrice(activePassengerMeal.Price)}
          </div>
        )}

        {meals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {meals.map((meal, index) => {
              const isSelected = selectedMeals.some(
                (m) =>
                  getMealKey(m) === getMealKey(meal) &&
                  m.PassengerIndex === activePassenger,
              );

              return (
                <button
                  key={`${meal.Code || meal.AirlineDescription || "meal"}-${index}`}
                  onClick={() => handleMealSelect(meal)}
                  className={`p-3 border rounded text-left transition ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-700"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-sm">
                    {meal.AirlineDescription ||
                      meal.Description ||
                      meal.Code ||
                      "Meal"}
                  </div>

                  {meal.Code && (
                    <div className="text-xs opacity-80 mt-1">
                      Code: {meal.Code}
                    </div>
                  )}

                  {getPrice(meal.Price) > 0 && (
                    <div className="mt-2 font-semibold">
                      ₹{getPrice(meal.Price)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 border rounded p-4 bg-gray-50">
            No meals available for this flight.
          </div>
        )}
      </div>

      {/* Baggage */}
      <div className="mb-10">
        <h3 className="font-semibold mb-3">Baggage</h3>

        {paidBaggage.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleBaggageSelect(noBaggageOption)}
              className={`p-3 border rounded ${
                selectedBaggage.length === 0
                  ? "bg-gray-800 text-white"
                  : "bg-white"
              }`}
            >
              No Extra Baggage
              <div>₹0</div>
            </button>

            {paidBaggage.map((bag, index) => {
              const isSelected = selectedBaggage.some(
                (b) => b.Code === bag.Code,
              );

              return (
                <button
                  key={`${bag.Code}-${index}`}
                  onClick={() => handleBaggageSelect(bag)}
                  className={`p-3 border rounded ${
                    isSelected ? "bg-purple-600 text-white" : "bg-white"
                  }`}
                >
                  {bag.Weight} KG
                  <div>₹{getPrice(bag.Price)}</div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500">No additional baggage available.</div>
        )}
      </div>

      {/* Seats */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold">
              Seats ({selectedSeats.length}/{passengerCount})
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Seat selection for Passenger {activePassenger + 1}
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 border rounded bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Passenger {activePassenger + 1}
            </p>

            <p className="text-sm text-gray-600">
              {activePassengerSeat
                ? `Selected Seat: ${activePassengerSeat.Code} - ₹${getPrice(
                    activePassengerSeat.Price,
                  )}`
                : "No seat selected"}
            </p>
          </div>

          {activePassengerSeat && (
            <button
              onClick={() => {
                const updatedSeats = selectedSeats.filter(
                  (s) => s.PassengerIndex !== activePassenger,
                );
                setSelectedSeats(updatedSeats);
              }}
              className="px-4 py-2 rounded bg-red-600 text-white text-sm"
            >
              Remove Seat
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max space-y-2">
            {seatRows.length > 0 ? (
              seatRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex gap-2 justify-center items-center"
                >
                  {row.map((seat, seatIndex) => renderSeat(seat, seatIndex))}
                </div>
              ))
            ) : (
              <div className="text-gray-500 border rounded p-4 bg-gray-50">
                No seats available for this flight.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="border p-4 rounded mb-6 bg-white shadow">
        <h3 className="font-semibold mb-3">Fare Summary</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Flight Fare</span>
            <span>₹{flightFare}</span>
          </div>

          {seatsTotal > 0 && (
            <div className="flex justify-between">
              <span>Seat Charges</span>
              <span>₹{seatsTotal}</span>
            </div>
          )}

          {mealsTotal > 0 && (
            <div className="flex justify-between">
              <span>Meal Charges</span>
              <span>₹{mealsTotal}</span>
            </div>
          )}

          {baggageTotal > 0 && (
            <div className="flex justify-between">
              <span>Baggage Charges</span>
              <span>₹{baggageTotal}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Convenience Fee</span>
            <span>₹{convenienceFee}</span>
          </div>

          <hr />

          <div className="flex justify-between font-bold text-lg">
            <span>Total Payable</span>
            <span>₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (!passengerCount) {
              alert("Passenger count missing. Please restart booking.");
              return;
            }

            if (selectedSeats.length !== passengerCount) {
              alert(`Please select ${passengerCount} seats`);
              return;
            }

            navigate("/passenger-details", {
              state: {
                selectedSeats,
                selectedMeals,
                selectedBaggage,
                traceId,
                resultIndex,
                fareQuote,
              },
            });
          }}
          className={`px-6 py-3 rounded text-white transition ${
            selectedSeats.length === passengerCount
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SSRPage;
