import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { privateApi } from "../../../services/api";
import { useFlightStore } from "../../../store/flightStore";

import { pdf } from "@react-pdf/renderer";

import FlightTicketPDF from "../components/FlightTicketPDF";
import FlightInvoicePDF from "../components/FlightInvoicePDF";

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
  const [ticketPdfLoading, setTicketPdfLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [storedData, setStoredData] = useState(null);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [isReleased, setIsReleased] = useState(false);

  // ✅ CANCEL REQUEST
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelType, setCancelType] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");

  const [cancelDetails, setCancelDetails] = useState(null);

  const [selectedSectorIndexes, setSelectedSectorIndexes] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  const [cancelDetailsLoading, setCancelDetailsLoading] = useState(false);
  const [cancelRequestLoading, setCancelRequestLoading] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("flightBookingData"));

    if (!stored) {
      navigate("/");
      return;
    }

    console.log("BOOKING 👉", stored);

    setStoredData(stored);
    setIsReleased(stored?.isReleased === true);

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

  // ✅ STEP 1 - DOMESTIC / INTERNATIONAL CHECK
  const getCountryCode = (point) =>
    point?.CountryCode ||
    point?.Airport?.CountryCode ||
    point?.Airport?.Country?.CountryCode ||
    "";

  const isInternational = segments.some((seg) => {
    const originCountry = getCountryCode(seg?.Origin);
    const destinationCountry = getCountryCode(seg?.Destination);

    if (!originCountry || !destinationCountry) return false;

    return originCountry !== destinationCountry;
  });

  const bookingId =
    itinerary?.BookingId ||
    booking?.BookingId ||
    booking?.Response?.BookingId ||
    "N/A";

  const pnr = itinerary?.PNR || booking?.PNR || booking?.Response?.PNR || "N/A";

  const stored = JSON.parse(localStorage.getItem("flightBookingData") || "{}");

  const source =
    stored?.source ??
    storedData?.source ??
    null;

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

  // ✅ All passengers must have their own ticket
  const allPassengersTicketed =
    passengers.length > 0 &&
    passengers.every(
      (p) => p?.Ticket?.TicketNumber,
    );

  const isNonLcc =
    storedData?.isLcc === false ||
    storedData?.isLCC === false ||
    stored?.isLcc === false ||
    stored?.isLCC === false ||
    storedData?.fareQuote?.Response?.Results?.IsLCC === false ||
    storedData?.fareQuote?.Response?.Results?.[0]?.IsLCC === false ||
    itinerary?.IsLCC === false ||
    booking?.IsLCC === false;

  // Non-LCC booking created but ticket not issued yet
  const isOnHold =
    isNonLcc &&
    !hasTicket &&
    !isReleased;

  const status = isReleased
    ? "PNR Released"
    : hasTicket
      ? "Ticketed"
      : isOnHold
        ? "On Hold"
        : itinerary?.Status === 5
          ? "Confirmed"
          : "Pending";
  const canGenerateTicket = isOnHold && bookingId !== "N/A" && pnr !== "N/A";
  const formatDateTime = (date) => {
    if (!date) return "";
    if (String(date).includes("T")) return date;
    return `${date}T00:00:00`;
  };


  // ================= CANCEL REQUEST DATA =================

  const cancelPassengers = Array.isArray(cancelDetails?.Passenger)
    ? cancelDetails.Passenger
    : cancelDetails?.Passenger
      ? [cancelDetails.Passenger]
      : [];

  const cancelSegments = Array.isArray(cancelDetails?.Segments)
    ? cancelDetails.Segments
    : cancelDetails?.Segments
      ? [cancelDetails.Segments]
      : [];

  const getCancelTicketId = (passenger) =>
    passenger?.Ticket?.TicketId ||
    passenger?.TicketId ||
    null;

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

      let passportPayload = [];

      if (isInternational) {
        passportPayload = passengers.map((apiPassenger, index) => {
          const savedPassenger = savedPassengers?.[index] || {};

          return {
            PaxId: apiPassenger?.PaxId,

            PassportNo:
              apiPassenger?.PassportNo ||
              savedPassenger?.PassportNo ||
              savedPassenger?.passport ||
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
          (p) =>
            !p.PaxId || !p.PassportNo || !p.PassportExpiry || !p.DateOfBirth,
        );

        if (missingPassport) {
          console.log("PASSPORT PAYLOAD ERROR 👉", passportPayload);

          alert("Passport details missing for one or more passengers");

          return;
        }
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

  const handleReleasePnr = async () => {
    if (!isNonLcc) {
      alert("Release PNR is available only for Full Service flights.");
      return;
    }

    if (hasTicket) {
      alert("Ticket has already been generated.");
      return;
    }

    if (isReleased) {
      alert("PNR is already released.");
      return;
    }

    if (!bookingId || bookingId === "N/A") {
      alert("Booking ID missing.");
      return;
    }

    if (source === null || source === undefined || source === "") {
      console.log("SOURCE DEBUG 👉", {
        source,
        stored,
        storedData,
      });

      alert("Source missing. Unable to release PNR.");
      return;
    }

    try {
      setReleaseLoading(true);

      const payload = {
        BookingId: Number(bookingId),
        Source: Number(source),
      };

      console.log("RELEASE PNR PAYLOAD 👉", payload);

      const { data } = await privateApi.post(
        "/api/airlines/release-pnr/",
        payload,
      );

      console.log("RELEASE PNR RESPONSE 👉", data);

      if (!data?.success) {
        throw new Error(
          data?.message || "Unable to release PNR",
        );
      }

      const latestStored = JSON.parse(
        localStorage.getItem("flightBookingData") || "{}",
      );

      const updatedStored = {
        ...latestStored,
        isReleased: true,
        releaseResponse: data,
      };

      localStorage.setItem(
        "flightBookingData",
        JSON.stringify(updatedStored),
      );

      setStoredData(updatedStored);
      setIsReleased(true);

      alert("Your PNR has been released successfully.");
    } catch (error) {
      console.error("RELEASE PNR ERROR 👉", error);

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to release PNR",
      );
    } finally {
      setReleaseLoading(false);
    }
  };


  const handleOpenCancelRequest = async () => {
    if (!hasTicket) {
      alert("Ticket is not generated yet.");
      return;
    }

    if (!allPassengersTicketed) {
      alert("Ticket is not generated for all passengers.");
      return;
    }

    if (isReleased) {
      alert("Released PNR cannot be cancelled.");
      return;
    }

    if (!bookingId || bookingId === "N/A") {
      alert("Booking ID missing.");
      return;
    }

    if (!pnr || pnr === "N/A") {
      alert("PNR missing.");
      return;
    }

    // Reset old modal data
    setCancelType("");
    setCancelRemarks("");
    setSelectedSectorIndexes([]);
    setSelectedTicketIds([]);
    setCancelDetails(null);

    setShowCancelModal(true);

    try {
      setCancelDetailsLoading(true);

      const { data } = await privateApi.post(
        "/api/airlines/booking-details/",
        {
          PNR: pnr,
          BookingId: Number(bookingId),
        },
      );

      console.log("CANCEL BOOKING DETAILS 👉", data);

      const itinerary =
        data?.data?.Response?.FlightItinerary ||
        data?.Response?.FlightItinerary ||
        null;

      if (!itinerary) {
        throw new Error("Booking details not available.");
      }

      setCancelDetails(itinerary);
    } catch (error) {
      console.error("CANCEL DETAILS ERROR 👉", error);

      alert(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to fetch booking details",
      );

      setShowCancelModal(false);
    } finally {
      setCancelDetailsLoading(false);
    }
  };


  const handleSendCancelRequest = async () => {
    if (!cancelType) {
      alert("Please select cancellation type.");
      return;
    }

    if (!cancelRemarks.trim()) {
      alert("Please enter remarks.");
      return;
    }

    // Partial cancellation validation
    if (cancelType === "partial") {
      if (selectedSectorIndexes.length === 0) {
        alert("Please select at least one sector.");
        return;
      }

      if (selectedTicketIds.length === 0) {
        alert("Please select at least one passenger.");
        return;
      }
    }

    const confirmed = window.confirm(
      "Are you sure you want to send cancel request?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelRequestLoading(true);

      const payload = {
        BookingId: Number(bookingId),

        // Full = 1, Partial = 2
        RequestType: cancelType === "full" ? 1 : 2,

        CancellationType: 3,

        Remarks: cancelRemarks.trim(),
      };

      // ✅ Only Partial Cancellation
      if (cancelType === "partial") {
        payload.Sectors = selectedSectorIndexes.map((index) => {
          const segment = cancelSegments[index];

          return {
            Origin:
              segment?.Origin?.Airport?.AirportCode || "",

            Destination:
              segment?.Destination?.Airport?.AirportCode || "",
          };
        });

        payload.TicketId = selectedTicketIds.map(Number);
      }

      console.log("CANCEL REQUEST PAYLOAD 👉", payload);

      const { data } = await privateApi.post(
        "/api/airlines/sendrequest/",
        payload,
      );

      console.log("CANCEL REQUEST RESPONSE 👉", data);

      if (!data?.success) {
        throw new Error(
          data?.message || "Cancellation request failed",
        );
      }

      const changeRequestId =
        data?.change_request_id ||
        data?.change_request_ids?.[0] ||
        "N/A";

      alert(
        `Cancellation request sent successfully.\n\n` +
        `Change Request ID: ${changeRequestId}\n\n` +
        `Please note this Change Request ID. You can use it to track your cancellation status.`,
      );

      setShowCancelModal(false);

      // User OK karega tabhi home redirect hoga
      navigate("/");
    } catch (error) {
      console.error("CANCEL REQUEST ERROR 👉", error);

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to send cancellation request",
      );
    } finally {
      setCancelRequestLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!hasTicket) {
      alert("Please generate the ticket first.");
      return;
    }

    try {
      setTicketPdfLoading(true);

      const bookingData = JSON.parse(
        localStorage.getItem("bookingData") || "{}",
      );

      const blob = await pdf(
        <FlightTicketPDF
          booking={booking}
          pricing={pricingData}
          bookingData={bookingData}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `Ticket_${pnr}_${bookingId}.pdf`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("TICKET PDF ERROR 👉", error);

      alert("Unable to generate ticket PDF");
    } finally {
      setTicketPdfLoading(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (!hasTicket) {
      alert("Please generate the ticket first.");
      return;
    }

    try {
      setInvoiceLoading(true);

      const bookingData = JSON.parse(
        localStorage.getItem("bookingData") || "{}",
      );

      const blob = await pdf(
        <FlightInvoicePDF
          booking={booking}
          pricing={pricingData}
          bookingData={bookingData}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `Invoice_${pnr}_${bookingId}.pdf`;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("INVOICE PDF ERROR 👉", error);
      alert("Unable to generate invoice PDF");
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <>
      <div className="bg-gray-100 min-h-screen py-20 px-3 md:px-6 print:hidden">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {isReleased
                  ? "PNR Released"
                  : isOnHold
                    ? "⏸ Booking Hold"
                    : "🎉 Booking Confirmed"}
              </h2>

              <p className="text-sm mt-1 opacity-90">
                {isReleased
                  ? "Your PNR has been released successfully."
                  : hasTicket
                    ? "Your e-ticket is ready ✈"
                    : isOnHold
                      ? "Your booking is on hold. Generate the ticket."
                      : "Your booking has been created successfully."}
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
          {/* ACTIONS */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-3">
              {/* VIEW FULL BOOKING */}
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

              {/* ==============================
        BEFORE TICKET / ON HOLD
    ============================== */}
              {!hasTicket && (
                <>
                  {canGenerateTicket && (
                    <button
                      onClick={handleGenerateTicket}
                      disabled={ticketLoading}
                      className="flex-1 bg-emerald-600 text-white py-3 rounded-xl disabled:opacity-60"
                    >
                      {ticketLoading ? "Generating..." : "Generate Ticket"}
                    </button>
                  )}

                  {isNonLcc && !isReleased && (
                    <button
                      onClick={handleReleasePnr}
                      disabled={releaseLoading}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl disabled:opacity-60"
                    >
                      {releaseLoading ? "Releasing..." : "Release PNR"}
                    </button>
                  )}
                </>
              )}

              {/* ==============================
        AFTER TICKET GENERATED
    ============================== */}
              {hasTicket && (
                <>
                  <button
                    onClick={handleDownloadTicket}
                    disabled={ticketPdfLoading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl disabled:opacity-60"
                  >
                    {ticketPdfLoading ? "Generating Ticket..." : "Print Ticket"}
                  </button>

                  <button
                    onClick={handlePrintInvoice}
                    disabled={invoiceLoading}
                    className="flex-1 bg-amber-500 text-black py-3 rounded-xl disabled:opacity-60"
                  >
                    {invoiceLoading ? "Generating Invoice..." : "Print Invoice"}
                  </button>

                  {allPassengersTicketed && !isReleased && (
                    <button
                      onClick={handleOpenCancelRequest}
                      className="flex-1 bg-red-600 text-white py-3 rounded-xl"
                    >
                      Cancel Request
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT TICKET ONLY */}


      {showCancelModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-lg">
                Request (PNR: {pnr})
              </h3>

              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">

              {cancelDetailsLoading ? (
                <div className="py-10 text-center">
                  Loading booking details...
                </div>
              ) : (
                <>
                  {/* ==========================
                CANCELLATION TYPE
            ========================== */}

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Cancellation Type
                    </label>

                    <select
                      value={cancelType}
                      onChange={(e) => {
                        setCancelType(e.target.value);

                        // clear previous partial selection
                        setSelectedSectorIndexes([]);
                        setSelectedTicketIds([]);
                      }}
                      className="w-full border rounded-lg px-3 py-3"
                    >
                      <option value="">
                        -Select-
                      </option>

                      <option value="full">
                        Refund with Airline Penalty / Void
                      </option>

                      <option value="partial">
                        Partial Cancellation
                      </option>
                    </select>
                  </div>

                  {/* ==========================
                PARTIAL ONLY
            ========================== */}

                  {cancelType === "partial" && (
                    <>
                      {/* SECTORS */}

                      <div className="border-t pt-4">
                        <p className="font-semibold text-sm mb-3">
                          Please select Refund Sectors
                        </p>

                        {/* ALL SECTORS */}

                        <label className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={
                              cancelSegments.length > 0 &&
                              selectedSectorIndexes.length ===
                              cancelSegments.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSectorIndexes(
                                  cancelSegments.map(
                                    (_, index) => index,
                                  ),
                                );
                              } else {
                                setSelectedSectorIndexes([]);
                              }
                            }}
                          />

                          All
                        </label>

                        {cancelSegments.map((segment, index) => {
                          const origin =
                            segment?.Origin?.Airport?.AirportCode ||
                            "--";

                          const destination =
                            segment?.Destination?.Airport
                              ?.AirportCode || "--";

                          return (
                            <label
                              key={index}
                              className="flex items-center gap-2 mb-2"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSectorIndexes.includes(
                                  index,
                                )}
                                onChange={() => {
                                  setSelectedSectorIndexes(
                                    (previous) =>
                                      previous.includes(index)
                                        ? previous.filter(
                                          (item) =>
                                            item !== index,
                                        )
                                        : [
                                          ...previous,
                                          index,
                                        ],
                                  );
                                }}
                              />

                              {origin}-{destination}
                            </label>
                          );
                        })}
                      </div>

                      {/* PASSENGERS */}

                      <div className="border-t pt-4">
                        <p className="font-semibold text-sm mb-3">
                          Please select Passenger
                        </p>

                        {/* ALL PASSENGERS */}

                        <label className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={
                              cancelPassengers.length > 0 &&
                              selectedTicketIds.length ===
                              cancelPassengers.filter(
                                (p) => getCancelTicketId(p),
                              ).length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                const allIds =
                                  cancelPassengers
                                    .map(getCancelTicketId)
                                    .filter(Boolean);

                                setSelectedTicketIds(allIds);
                              } else {
                                setSelectedTicketIds([]);
                              }
                            }}
                          />

                          All
                        </label>

                        {cancelPassengers.map(
                          (passenger, index) => {
                            const ticketId =
                              getCancelTicketId(passenger);

                            const passengerName =
                              `${passenger?.Title || ""} ${passenger?.FirstName || ""
                                } ${passenger?.LastName || ""
                                }`
                                .replace(/\s+/g, " ")
                                .trim();

                            return (
                              <label
                                key={
                                  ticketId ||
                                  passenger?.PaxId ||
                                  index
                                }
                                className="flex items-center gap-2 mb-2"
                              >
                                <input
                                  type="checkbox"
                                  disabled={!ticketId}
                                  checked={
                                    ticketId
                                      ? selectedTicketIds.includes(
                                        ticketId,
                                      )
                                      : false
                                  }
                                  onChange={() => {
                                    if (!ticketId) return;

                                    setSelectedTicketIds(
                                      (previous) =>
                                        previous.includes(
                                          ticketId,
                                        )
                                          ? previous.filter(
                                            (id) =>
                                              id !==
                                              ticketId,
                                          )
                                          : [
                                            ...previous,
                                            ticketId,
                                          ],
                                    );
                                  }}
                                />

                                {index + 1}.{" "}
                                {passengerName ||
                                  "Passenger"}

                                {ticketId && (
                                  <span className="text-xs text-gray-500">
                                    (Ticket ID: {ticketId})
                                  </span>
                                )}
                              </label>
                            );
                          },
                        )}
                      </div>
                    </>
                  )}

                  {/* ==========================
                REMARKS
            ========================== */}

                  <div className="border-t pt-4">
                    <label className="block text-sm font-semibold mb-2">
                      Please enter remarks
                      <span className="text-red-600">
                        {" "}
                        *
                      </span>
                    </label>

                    <textarea
                      value={cancelRemarks}
                      onChange={(e) =>
                        setCancelRemarks(e.target.value)
                      }
                      rows={4}
                      className="w-full border rounded-lg p-3"
                      placeholder="Enter cancellation remarks"
                    />
                  </div>

                  {/* NOTE */}

                  <div className="text-xs text-gray-600 border-t pt-4">
                    <p className="font-semibold mb-1">
                      Note:
                    </p>

                    <p>
                      1. Partial refund will be processed
                      offline.
                    </p>

                    <p>
                      2. Cancellation charges are subject
                      to airline rules.
                    </p>
                  </div>

                  {/* BUTTONS */}

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setShowCancelModal(false)
                      }
                      disabled={cancelRequestLoading}
                      className="px-5 py-2 rounded-lg bg-gray-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSendCancelRequest}
                      disabled={cancelRequestLoading}
                      className="px-5 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
                    >
                      {cancelRequestLoading
                        ? "Sending..."
                        : "Send Request"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

const Row = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-600">{label}</span>
    <span>₹ {value ?? 0}</span>
  </div>
);

export default BookingSuccess;
