import { useEffect, useMemo, useState } from "react";
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
    flightValidation,
    isTraceExpired,
  } = useFlightStore();

  const navigate = useNavigate();

  const [baggage, setBaggage] = useState([]);
  const [meals, setMeals] = useState([]);
  const [seatRows, setSeatRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activePassenger, setActivePassenger] = useState(0);

  /* ---------------- Utils ---------------- */

  const toBool = (value) =>
    value === true || String(value).toLowerCase() === "true";

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

  const isValidResultIndex =
    resultIndex !== undefined && resultIndex !== null && resultIndex !== "";

  const sessionExpired =
    typeof isTraceExpired === "function" && isTraceExpired();

  const getSeatKey = (seat) => {
    return [
      seat?.Code || "",
      seat?.Origin || "",
      seat?.Destination || "",
      seat?.AirlineCode || "",
      seat?.FlightNumber || "",
    ].join("-");
  };

  const getMealKey = (meal) => {
    return [
      meal?.Code || "",
      meal?.Origin || "",
      meal?.Destination || "",
      meal?.AirlineCode || "",
      meal?.FlightNumber || "",
    ].join("-");
  };

  const getBaggageKey = (bag) => {
    return [
      bag?.Code || "",
      bag?.Weight || "",
      bag?.Origin || "",
      bag?.Destination || "",
      bag?.AirlineCode || "",
      bag?.FlightNumber || "",
    ].join("-");
  };

  const getMealName = (meal) => {
    return (
      meal?.AirlineDescription || meal?.Description || meal?.Code || "Meal"
    );
  };

  const getBaggageName = (bag) => {
    if (bag?.Weight) return `${bag.Weight} KG`;
    return bag?.Code || bag?.Description || "Baggage";
  };

  const pricing = fareQuote?.Pricing || {};
  const fare = fareQuote?.Fare || {};

  const flightFare = Number(
    pricing?.TBOFare ||
      fare?.PublishedFare ||
      fare?.OfferedFare ||
      fareQuote?.PublishedFare ||
      fareQuote?.OfferedFare ||
      0,
  );

  const convenienceFee = Number(
    pricing?.ConvenienceFee || fareQuote?.ConvenienceFee || 0,
  );

  const isSeatMandatory = toBool(
    flightValidation?.isSeatMandatory ||
      fareQuote?.isseatmandatory ||
      fareQuote?.IsSeatMandatory,
  );

  const isMealMandatory = toBool(
    flightValidation?.isMealMandatory ||
      fareQuote?.ismealmandatory ||
      fareQuote?.IsMealMandatory,
  );

  const isLcc = toBool(fareQuote?.IsLCC);

  const source = String(
    fareQuote?.Source ||
      fareQuote?.Segments?.[0]?.[0]?.Airline?.AirlineCode ||
      "",
  ).toUpperCase();

  const isInternational =
    fareQuote?.IsDomestic === false ||
    fareQuote?.JourneyType === 2 ||
    fareQuote?.Segments?.some?.((group) =>
      group?.some?.((seg) => {
        const originCountry =
          seg?.Origin?.Airport?.CountryCode ||
          seg?.Origin?.Airport?.CountryName;

        const destinationCountry =
          seg?.Destination?.Airport?.CountryCode ||
          seg?.Destination?.Airport?.CountryName;

        return (
          originCountry &&
          destinationCountry &&
          String(originCountry).toUpperCase() !==
            String(destinationCountry).toUpperCase()
        );
      }),
    );

  const shouldAutoIncludeFreeSSR =
    isLcc || source === "I5" || Boolean(isInternational);

  /* ---------------- Session Guard ---------------- */

  useEffect(() => {
    if (!traceId || !isValidResultIndex || !fareQuote) {
      navigate("/", { replace: true });
      return;
    }

    if (sessionExpired) {
      setError(
        "Your flight search session is older than 15 minutes. Please search again before booking.",
      );
      setLoading(false);
    }
  }, [traceId, isValidResultIndex, fareQuote, sessionExpired, navigate]);

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

    if (alreadySelectedByActivePassenger) {
      updatedMeals = updatedMeals.filter(
        (m) =>
          !(getMealKey(m) === mealKey && m.PassengerIndex === activePassenger),
      );

      setSelectedMeals(updatedMeals);
      return;
    }

    updatedMeals = updatedMeals.filter(
      (m) => m.PassengerIndex !== activePassenger,
    );

    updatedMeals.push({
      ...meal,
      PassengerIndex: activePassenger,
      Quantity: meal?.Quantity || 1,
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

    for (let i = 0; i < Number(passengerCount || 0); i++) {
      updated.push({
        ...bag,
        PassengerIndex: i,
      });
    }

    setSelectedBaggage(updated);
  };

  /* ---------------- Auto Free SSR ---------------- */

  const buildFreeItemsForAllPassengers = (items) => {
    const freeItems = items.filter((item) => getPrice(item?.Price) === 0);

    const updated = [];

    for (let i = 0; i < Number(passengerCount || 0); i++) {
      freeItems.forEach((item) => {
        updated.push({
          ...item,
          PassengerIndex: i,
          Quantity: item?.Quantity || 1,
        });
      });
    }

    return updated;
  };

  const autoApplyFreeSSRIfNeeded = ({ mealList, baggageList }) => {
    if (!shouldAutoIncludeFreeSSR || !passengerCount) return;

    const freeMeals = buildFreeItemsForAllPassengers(mealList);
    const freeBaggage = buildFreeItemsForAllPassengers(baggageList);

    if (freeMeals.length > 0 && selectedMeals.length === 0) {
      setSelectedMeals(freeMeals);
    }

    if (freeBaggage.length > 0 && selectedBaggage.length === 0) {
      setSelectedBaggage(freeBaggage);
    }
  };

  /* ---------------- Seat Renderer ---------------- */

  const renderSeat = (seat, seatIndex) => {
    const unavailable = seat?.AvailablityType === 0;
    const price = getPrice(seat?.Price);

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
        type="button"
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
                    ? "bg-yellow-400 hover:bg-yellow-500 border-yellow-500 text-black"
                    : "bg-white hover:bg-gray-100 text-black"
          }`}
      >
        <span>{seat?.Code || "-"}</span>

        {isSelectedByOtherPassenger && selectedSeat && (
          <span className="text-[8px]">P{selectedSeat.PassengerIndex + 1}</span>
        )}

        {price > 0 && <span className="text-[9px]">₹{price}</span>}
      </button>
    );
  };

  /* ---------------- Fetch SSR ---------------- */

  useEffect(() => {
    if (!traceId || !isValidResultIndex || !fareQuote || sessionExpired) return;

    let isMounted = true;

    const fetchSSR = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await privateApi.post("/api/airlines/ssr/", {
          TraceId: traceId,
          ResultIndex: resultIndex,
        });

        const ssrResponse =
          res?.data?.Response?.Response ||
          res?.data?.Response ||
          res?.data?.data?.Response ||
          res?.data?.data ||
          res?.data;

        const errorCode = Number(ssrResponse?.Error?.ErrorCode || 0);

        if (errorCode === 6) {
          throw new Error("Invalid token. Please search flights again.");
        }

        if (errorCode && errorCode !== 0) {
          throw new Error(ssrResponse?.Error?.ErrorMessage || "SSR API error");
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

        if (!isMounted) return;

        setMeals(mealList);
        setBaggage(baggageList);
        setSeatRows(allSeatRows.map((row) => row?.Seats || []));

        autoApplyFreeSSRIfNeeded({
          mealList,
          baggageList,
        });
      } catch (err) {
        console.error("SSR ERROR:", err);

        if (isMounted) {
          const apiMessage =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.response?.data?.Response?.Error?.ErrorMessage ||
            err?.message ||
            "Failed to load SSR data";

          setError(apiMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSSR();

    return () => {
      isMounted = false;
    };
  }, [traceId, resultIndex, fareQuote, sessionExpired]);

  /* ---------------- Price ---------------- */

  const seatsTotal = selectedSeats.reduce((t, s) => t + getPrice(s?.Price), 0);
  const mealsTotal = selectedMeals.reduce((t, m) => t + getPrice(m?.Price), 0);
  const baggageTotal = selectedBaggage.reduce(
    (t, b) => t + getPrice(b?.Price),
    0,
  );

  const finalTotal =
    flightFare + seatsTotal + mealsTotal + baggageTotal + convenienceFee;

  /* ---------------- Derived ---------------- */

  const paidBaggage = baggage.filter((b) => getPrice(b?.Price) > 0);
  const freeBaggage = baggage.filter((b) => getPrice(b?.Price) === 0);

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

  const activePassengerBaggage = selectedBaggage.filter(
    (b) => b.PassengerIndex === activePassenger,
  );

  const selectedSeatCount = selectedSeats.length;
  const selectedMealPassengerCount = new Set(
    selectedMeals.map((meal) => meal.PassengerIndex),
  ).size;

  const canContinue =
    passengerCount &&
    (!isSeatMandatory || selectedSeatCount >= passengerCount) &&
    (!isMealMandatory || selectedMealPassengerCount >= passengerCount);

  const handleContinue = () => {
    if (!passengerCount) {
      alert("Passenger count missing. Please restart booking.");
      return;
    }

    if (sessionExpired) {
      alert("Flight session expired. Please search flights again.");
      navigate("/", { replace: true });
      return;
    }

    if (isSeatMandatory && selectedSeatCount < passengerCount) {
      alert(`Please select seats for all ${passengerCount} passengers.`);
      return;
    }

    if (isMealMandatory && selectedMealPassengerCount < passengerCount) {
      alert(`Please select meals for all ${passengerCount} passengers.`);
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
        ssrTotal: seatsTotal + mealsTotal + baggageTotal,
        finalTotal,
      },
    });
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex items-center justify-center">
        Loading SSR...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex flex-col items-center justify-center text-red-400 px-4 text-center">
        <p className="font-semibold">{error}</p>

        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mt-4 px-4 py-2 bg-linear-to-r from-start to-end text-black rounded"
        >
          Search Flights Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-main) text-(--text-main)">
      <div className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-2xl font-bold mb-3 text-(--gold-main)">
          Select Add-ons
        </h2>

        <p className="text-sm text-(--text-muted) mb-8">
          Seats and meals are optional unless marked as required by the airline.
        </p>

        {(isSeatMandatory || isMealMandatory || shouldAutoIncludeFreeSSR) && (
          <div className="mb-8 p-4 border border-(--border-soft) rounded-xl bg-(--bg-card)">
            <h3 className="font-semibold text-(--gold-soft) mb-2">
              SSR Requirements
            </h3>

            <div className="flex flex-wrap gap-2 text-xs">
              {isSeatMandatory && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black">
                  Seat Required
                </span>
              )}

              {isMealMandatory && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black">
                  Meal Required
                </span>
              )}

              {shouldAutoIncludeFreeSSR && (
                <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400">
                  Free SSR Auto Added Where Available
                </span>
              )}
            </div>
          </div>
        )}

        {/* Passenger Selector */}
        <div className="mb-8 p-4 border border-(--border-soft) rounded-xl bg-(--bg-card) shadow-sm">
          <h3 className="font-semibold mb-3 text-(--gold-soft)">
            Select Passenger
          </h3>

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
                  type="button"
                  onClick={() => setActivePassenger(index)}
                  className={`px-4 py-2 rounded border text-sm transition ${
                    activePassenger === index
                      ? "bg-linear-to-r from-start to-end text-black border-transparent"
                      : hasSeat || hasMeal
                        ? "bg-green-500/10 border-green-500 text-green-400"
                        : "border-(--border-soft)"
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
              <h3 className="font-semibold text-(--gold-soft)">
                Meals {isMealMandatory ? "(Required)" : "(Optional)"}
              </h3>

              <p className="text-sm text-(--text-muted)">
                Meal selection for Passenger {activePassenger + 1}
              </p>
            </div>

            {activePassengerMeal && (
              <button
                type="button"
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
            <div className="mb-4 p-3 border border-(--border-soft) rounded bg-(--bg-card) text-sm">
              Selected Meal:{" "}
              <span className="font-semibold text-(--gold-soft)">
                {getMealName(activePassengerMeal)}
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
                    key={`${getMealKey(meal)}-${index}`}
                    type="button"
                    onClick={() => handleMealSelect(meal)}
                    className={`p-3 border rounded text-left transition ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-700"
                        : "bg-(--bg-card) border-(--border-soft) hover:bg-(--bg-secondary)"
                    }`}
                  >
                    <div className="font-medium text-sm">
                      {getMealName(meal)}
                    </div>

                    {meal.Code && (
                      <div className="text-xs opacity-80 mt-1">
                        Code: {meal.Code}
                      </div>
                    )}

                    <div className="mt-2 font-semibold">
                      ₹{getPrice(meal.Price)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-(--text-muted) border border-(--border-soft) rounded p-4 bg-(--bg-card)">
              No meals available for this flight.
            </div>
          )}
        </div>

        {/* Baggage */}
        <div className="mb-10">
          <h3 className="font-semibold mb-3 text-(--gold-soft)">Baggage</h3>

          {activePassengerBaggage.length > 0 && (
            <div className="mb-4 p-3 border border-(--border-soft) rounded bg-(--bg-card) text-sm">
              Passenger {activePassenger + 1} Baggage:{" "}
              <span className="font-semibold text-(--gold-soft)">
                {activePassengerBaggage
                  .map((bag) => getBaggageName(bag))
                  .join(", ")}
              </span>
            </div>
          )}

          {paidBaggage.length > 0 || freeBaggage.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleBaggageSelect(noBaggageOption)}
                className={`p-3 border rounded ${
                  selectedBaggage.length === 0
                    ? "bg-gray-800 text-white"
                    : "bg-(--bg-card) border-(--border-soft)"
                }`}
              >
                No Extra Baggage
                <div>₹0</div>
              </button>

              {[...freeBaggage, ...paidBaggage].map((bag, index) => {
                const isSelected = selectedBaggage.some(
                  (b) => getBaggageKey(b) === getBaggageKey(bag),
                );

                return (
                  <button
                    key={`${getBaggageKey(bag)}-${index}`}
                    type="button"
                    onClick={() => handleBaggageSelect(bag)}
                    className={`p-3 border rounded ${
                      isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-(--bg-card) border-(--border-soft)"
                    }`}
                  >
                    {getBaggageName(bag)}
                    <div>₹{getPrice(bag.Price)}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-(--text-muted)">No baggage available.</div>
          )}
        </div>

        {/* Seats */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-(--gold-soft)">
                Seats ({selectedSeats.length}/{passengerCount}){" "}
                {isSeatMandatory ? "(Required)" : "(Optional)"}
              </h3>

              <p className="text-sm text-(--text-muted) mt-1">
                Seat selection for Passenger {activePassenger + 1}
              </p>
            </div>
          </div>

          <div className="mb-4 p-3 border border-(--border-soft) rounded bg-(--bg-card) flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                Passenger {activePassenger + 1}
              </p>

              <p className="text-sm text-(--text-muted)">
                {activePassengerSeat
                  ? `Selected Seat: ${activePassengerSeat.Code} - ₹${getPrice(
                      activePassengerSeat.Price,
                    )}`
                  : "No seat selected"}
              </p>
            </div>

            {activePassengerSeat && (
              <button
                type="button"
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
                <div className="text-(--text-muted) border border-(--border-soft) rounded p-4 bg-(--bg-card)">
                  No seats available for this flight.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="border border-(--border-soft) p-4 rounded-xl mb-6 bg-(--bg-card) shadow">
          <h3 className="font-semibold mb-3 text-(--gold-soft)">
            Fare Summary
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Flight Fare</span>
              <span>₹{flightFare.toFixed(2)}</span>
            </div>

            {seatsTotal > 0 && (
              <div className="flex justify-between">
                <span>Seat Charges</span>
                <span>₹{seatsTotal.toFixed(2)}</span>
              </div>
            )}

            {mealsTotal > 0 && (
              <div className="flex justify-between">
                <span>Meal Charges</span>
                <span>₹{mealsTotal.toFixed(2)}</span>
              </div>
            )}

            {baggageTotal > 0 && (
              <div className="flex justify-between">
                <span>Baggage Charges</span>
                <span>₹{baggageTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Convenience Fee</span>
              <span>₹{convenienceFee.toFixed(2)}</span>
            </div>

            <hr className="border-(--border-soft)" />

            <div className="flex justify-between font-bold text-lg">
              <span>Total Payable</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Continue */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleContinue}
            className={`px-6 py-3 rounded text-black font-semibold transition ${
              canContinue
                ? "bg-linear-to-r from-start to-end hover:opacity-90"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SSRPage;
