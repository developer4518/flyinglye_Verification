import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { publicApi } from "../../../services/api";
import { useFlightStore } from "../../../store/flightStore";
import { useAuthStore } from "../../../store/authStore";

const hasValidResultIndex = (value) => {
  return value !== null && value !== undefined && value !== "";
};

const toBool = (value) => {
  return value === true || String(value).toLowerCase() === "true";
};

const getFareQuoteResult = (data) => {
  return (
    data?.data?.Response?.Results ||
    data?.Response?.Results ||
    data?.data?.Results ||
    data?.Results ||
    null
  );
};

const getResponseError = (data) => {
  const error =
    data?.data?.Response?.Error ||
    data?.Response?.Error ||
    data?.data?.Error ||
    data?.Error ||
    {};

  return {
    errorCode: Number(error?.ErrorCode || 0),
    errorMessage: error?.ErrorMessage || "",
  };
};

const getSegmentGroups = (fareQuote) => {
  const groups = fareQuote?.Segments;

  if (!Array.isArray(groups)) return [];

  return groups.filter(Array.isArray);
};

const formatTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes) => {
  const total = Number(minutes || 0);

  if (!total) return "-";

  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${h}h ${m}m`;
};

const getPricing = (fareQuote) => {
  const pricing = fareQuote?.Pricing || {};
  const fare = fareQuote?.Fare || {};

  const flightFare = Number(
    pricing?.TBOFare ||
      fare?.PublishedFare ||
      fare?.OfferedFare ||
      fare?.BaseFare ||
      fareQuote?.PublishedFare ||
      fareQuote?.OfferedFare ||
      0,
  );

  const convenienceFee = Number(
    pricing?.ConvenienceFee || fareQuote?.ConvenienceFee || 0,
  );

  const totalPayable = Number(
    pricing?.TotalPayable ||
      fareQuote?.TotalPayable ||
      flightFare + convenienceFee ||
      0,
  );

  return {
    flightFare,
    convenienceFee,
    totalPayable,
  };
};

const FareQuote = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { traceId, resultIndex, setFareQuote, selectedFlight, isTraceExpired } =
    useFlightStore();

  const { token } = useAuthStore();

  const [fareQuote, setLocalFareQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sessionMissing =
    !traceId || !hasValidResultIndex(resultIndex) || !selectedFlight;

  const sessionExpired =
    typeof isTraceExpired === "function" && isTraceExpired();

  useEffect(() => {
    if (!token) {
      navigate("/login", {
        replace: true,
        state: { redirectTo: location.pathname },
      });

      return;
    }

    if (sessionMissing) {
      navigate("/", { replace: true });
    }
  }, [token, sessionMissing, navigate, location.pathname]);

  useEffect(() => {
    if (!token || sessionMissing) {
      setLoading(false);
      return;
    }

    if (sessionExpired) {
      setLoading(false);
      setError(
        "Your flight search session is older than 15 minutes. Please search again before booking.",
      );
      return;
    }

    let isMounted = true;

    const fetchFareQuote = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await publicApi.post("/api/airlines/fare-quote/", {
          TraceId: traceId,
          ResultIndex: resultIndex,
        });

        const data = res?.data;
        const { errorCode, errorMessage } = getResponseError(data);

        if (errorCode === 6) {
          throw new Error("Invalid token. Please search again.");
        }

        if (errorCode && errorCode !== 0) {
          throw new Error(errorMessage || "Unable to fetch fare quote.");
        }

        const results = getFareQuoteResult(data);

        if (!results) {
          throw new Error("Fare quote result not found.");
        }

        if (isMounted) {
          setLocalFareQuote(results);

          // ✅ Saves FareQuote + PAN/Passport/GST/SSR validation flags in Zustand
          setFareQuote(results);
        }
      } catch (err) {
        console.error("FareQuote error:", err);

        if (isMounted) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Unable to fetch fare quote.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFareQuote();

    return () => {
      isMounted = false;
    };
  }, [
    token,
    traceId,
    resultIndex,
    selectedFlight,
    sessionMissing,
    sessionExpired,
    setFareQuote,
  ]);

  const segmentGroups = useMemo(() => {
    return getSegmentGroups(fareQuote);
  }, [fareQuote]);

  const allSegments = useMemo(() => {
    return segmentGroups.flat();
  }, [segmentGroups]);

  const pricing = getPricing(fareQuote);

  const isPriceChanged = toBool(
    fareQuote?.IsPriceChanged || fareQuote?.ispricechanged,
  );

  const isTimeChanged = toBool(
    fareQuote?.IsTimeChanged || fareQuote?.istimechanged,
  );

  const flightDetailChangeInfo =
    fareQuote?.FlightDetailChangeInfo ||
    fareQuote?.flightDetailChangeInfo ||
    "";

  const isGSTMandatory = toBool(fareQuote?.IsGSTMandatory);

  const isPanRequired =
    toBool(fareQuote?.IsPanRequiredAtBook) ||
    toBool(fareQuote?.IsPanRequiredAtTicket);

  const isPassportRequired =
    toBool(fareQuote?.IsPassportRequiredAtBook) ||
    toBool(fareQuote?.IsPassportRequiredAtTicket);

  const isSeatMandatory = toBool(
    fareQuote?.isseatmandatory || fareQuote?.IsSeatMandatory,
  );

  const isMealMandatory = toBool(
    fareQuote?.ismealmandatory || fareQuote?.IsMealMandatory,
  );

  const handleSearchAgain = () => {
    navigate("/", { replace: true });
  };

  const handleContinue = () => {
    if (sessionMissing) {
      setError("Flight session expired. Please search flights again.");
      return;
    }

    if (sessionExpired) {
      setError(
        "Your flight search session is older than 15 minutes. Please search again before booking.",
      );
      return;
    }

    if (!fareQuote) {
      setError("Fare quote missing. Please fetch fare quote again.");
      return;
    }

    navigate("/ssr");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex flex-col items-center justify-center gap-4 text-(--text-main)">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-(--gold-main) rounded-full animate-spin" />
        <p className="text-sm text-(--text-muted)">Fetching Fare Quote...</p>
      </div>
    );
  }

  if (error && !fareQuote) {
    return (
      <div className="min-h-screen bg-(--bg-main) text-(--text-main) flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-center text-red-400">{error}</div>

        <button
          type="button"
          onClick={handleSearchAgain}
          className="px-6 py-3 rounded-xl font-semibold text-black bg-linear-to-r from-start to-end"
        >
          Search Flights Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-main) text-(--text-main)">
      <div className="max-w-6xl mx-auto px-4 py-24 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-(--gold-main)">Fare Quote</h1>

          <p className="text-sm text-(--text-muted)">
            Review the final price before continuing booking.
          </p>
        </div>

        {(isPriceChanged || isTimeChanged || flightDetailChangeInfo) && (
          <div className="bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 p-4 rounded-xl text-sm">
            <p className="font-semibold mb-1">Flight details updated</p>

            {isPriceChanged && (
              <p>Price has changed. Updated fare will be used.</p>
            )}

            {isTimeChanged && (
              <p>Flight time has changed. Please review timing.</p>
            )}

            {flightDetailChangeInfo && (
              <p>Change info: {flightDetailChangeInfo}</p>
            )}
          </div>
        )}

        {(isGSTMandatory ||
          isPanRequired ||
          isPassportRequired ||
          isSeatMandatory ||
          isMealMandatory) && (
          <div className="bg-(--bg-card) border border-(--border-soft) rounded-xl p-4 text-sm">
            <h2 className="font-semibold text-(--gold-soft) mb-3">
              Booking Requirements
            </h2>

            <div className="flex flex-wrap gap-2">
              {isGSTMandatory && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black text-xs">
                  GST Required
                </span>
              )}

              {isPanRequired && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black text-xs">
                  PAN Required
                </span>
              )}

              {isPassportRequired && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black text-xs">
                  Passport Required
                </span>
              )}

              {isSeatMandatory && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black text-xs">
                  Seat Required
                </span>
              )}

              {isMealMandatory && (
                <span className="px-3 py-1 rounded-full bg-(--gold-soft) text-black text-xs">
                  Meal Required
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {allSegments.length === 0 ? (
            <div className="bg-(--bg-card) border border-(--border-soft) rounded-xl p-5 text-sm text-(--text-muted)">
              No segment details available.
            </div>
          ) : (
            allSegments.map((segment, index) => {
              const airline = segment?.Airline || {};
              const origin = segment?.Origin || {};
              const destination = segment?.Destination || {};

              return (
                <div
                  key={`${airline?.AirlineCode || "air"}-${
                    airline?.FlightNumber || index
                  }-${index}`}
                  className="bg-(--bg-card) border border-(--border-soft) rounded-xl p-5"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                      <p className="font-semibold text-(--gold-soft)">
                        {airline?.AirlineName || "Airline"}
                      </p>

                      <p className="text-sm text-(--text-muted)">
                        {airline?.AirlineCode || ""}
                        {airline?.AirlineCode && airline?.FlightNumber
                          ? " "
                          : ""}
                        {airline?.FlightNumber || ""}
                      </p>

                      <span
                        className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                          fareQuote?.IsLCC
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-green-500/20 text-green-400"
                        }`}
                      >
                        {fareQuote?.IsLCC ? "LCC" : "Full Service"}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {origin?.Airport?.AirportCode || "-"}
                        </p>

                        <p className="text-xs text-(--text-muted)">
                          {formatTime(origin?.DepTime)}
                        </p>
                      </div>

                      <div className="text-(--gold-main)">✈</div>

                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {destination?.Airport?.AirportCode || "-"}
                        </p>

                        <p className="text-xs text-(--text-muted)">
                          {formatTime(destination?.ArrTime)}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-(--text-muted)">
                      Duration: {formatDuration(segment?.Duration)}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-(--text-muted)">
                    Baggage: {segment?.Baggage || "-"} | Cabin:{" "}
                    {segment?.CabinBaggage || "-"}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-(--bg-card) border border-(--border-soft) rounded-xl p-6">
          <h2 className="text-lg font-semibold text-(--gold-soft) mb-4">
            Fare Breakdown
          </h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Flight Fare</span>
              <span>₹ {pricing.flightFare.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Convenience Fee</span>
              <span>₹ {pricing.convenienceFee.toFixed(2)}</span>
            </div>

            <div className="border-t border-(--border-soft) pt-3 flex justify-between font-bold">
              <span>Total Payable</span>
              <span>₹ {pricing.totalPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-(--bg-card) border-t border-(--border-soft)">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-lg font-bold text-(--gold-main)">
            ₹ {pricing.totalPayable.toFixed(2)}
          </div>

          <div className="flex w-full md:w-auto gap-3">
            <button
              type="button"
              onClick={() => navigate("/fare-rule")}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-semibold border border-(--border-soft)"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-black
              bg-linear-to-r from-start to-end
              hover:opacity-90 transition"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FareQuote;
