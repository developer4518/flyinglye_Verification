import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pdf } from "@react-pdf/renderer";
import { useNavigate } from "react-router-dom";

import { getFlightBookings } from "../services/bookingApi";
import { privateApi } from "../services/api";

import FlightTicketPDF from "../modules/flights/components/FlightTicketPDF";
import FlightInvoicePDF from "../modules/flights/components/FlightInvoicePDF";

/* ================= HELPERS ================= */

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getStoredItinerary = (booking) => {
  return (
    booking?.tbo_response?.Response?.Response?.FlightItinerary ||
    booking?.tbo_response?.Response?.FlightItinerary ||
    {}
  );
};

const getFreshItinerary = (response) => {
  return (
    response?.data?.Response?.FlightItinerary ||
    response?.Response?.FlightItinerary ||
    null
  );
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const formatTicketDate = (date) => {
  if (!date) return "";

  if (String(date).includes("T")) {
    return date;
  }

  return `${date}T00:00:00`;
};

const FlightBookings = () => {
  const navigate = useNavigate();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["flightBookings"],
    queryFn: getFlightBookings,
  });

  /* ================= PDF LOADING ================= */

  const [actionLoading, setActionLoading] = useState("");

  /* ================= CANCEL REQUEST ================= */

  const [showCancelModal, setShowCancelModal] = useState(false);

  const [selectedBooking, setSelectedBooking] = useState(null);

  const [cancelDetails, setCancelDetails] = useState(null);

  const [cancelType, setCancelType] = useState("");
  const [cancelRemarks, setCancelRemarks] = useState("");

  const [selectedSectorIndexes, setSelectedSectorIndexes] = useState([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState([]);

  const [cancelDetailsLoading, setCancelDetailsLoading] = useState(false);
  const [cancelRequestLoading, setCancelRequestLoading] = useState(false);

  // ================= CHANGE REQUEST STATUS =================

  const [requestStatusLoading, setRequestStatusLoading] = useState(null);

  const [showRequestStatusModal, setShowRequestStatusModal] =
    useState(false);

  const [requestStatusData, setRequestStatusData] =
    useState(null);

  /* ================= CANCEL DATA ================= */

  const cancelPassengers = toArray(
    cancelDetails?.Passenger,
  );

  const cancelSegments = toArray(
    cancelDetails?.Segments,
  );

  const getTicketId = (passenger) =>
    passenger?.Ticket?.TicketId ||
    passenger?.TicketId ||
    null;

  /* ================= GET BOOKING DETAILS ================= */

  const fetchBookingDetails = async (booking) => {
    const pnr =
      booking?.ticket_pnr ||
      getStoredItinerary(booking)?.PNR;

    const bookingId =
      booking?.ticket_booking_id ||
      getStoredItinerary(booking)?.BookingId;

    if (!pnr || !bookingId) {
      throw new Error(
        "PNR or Booking ID is missing.",
      );
    }

    const { data } = await privateApi.post(
      "/api/airlines/booking-details/",
      {
        PNR: pnr,
        BookingId: Number(bookingId),
      },
    );

    const itinerary = getFreshItinerary(data);

    if (!itinerary) {
      throw new Error(
        "Booking details not available.",
      );
    }

    return {
      response: data,
      itinerary,
      pnr,
      bookingId,
    };
  };



  const handleViewBookingDetails = (booking) => {
    const itinerary = getStoredItinerary(booking);

    const bookingId =
      booking?.ticket_booking_id ||
      itinerary?.BookingId;

    const pnr =
      booking?.ticket_pnr ||
      itinerary?.PNR;

    if (!bookingId || !pnr) {
      alert("Booking ID or PNR is missing.");
      return;
    }

    navigate(
      `/flight-booking-details/${bookingId}`,
      {
        state: {
          bookingId,
          pnr,
          totalAmount: Number(booking?.total_amount || 0),
          fromMyBookings: true,
        },
      },
    );
  };

  /* ================= PRICING FOR PDF ================= */

  const getPricing = (booking, itinerary) => {
    const fare = itinerary?.Fare || {};

    const totalAmount = Number(
      booking?.total_amount ||
      fare?.PublishedFare ||
      fare?.OfferedFare ||
      0,
    );

    return {
      flightFare: Number(
        fare?.PublishedFare ||
        fare?.OfferedFare ||
        totalAmount,
      ),

      seatPrice: Number(
        fare?.TotalSeatCharges || 0,
      ),

      mealPrice: Number(
        fare?.TotalMealCharges || 0,
      ),

      baggagePrice: Number(
        fare?.TotalBaggageCharges || 0,
      ),

      convenienceFee: 0,

      totalPrice: totalAmount,
    };
  };

  /* ================= VIEW TICKET ================= */

  const handleViewTicket = async (booking) => {
    const key = `ticket-${booking?.id}`;

    try {
      setActionLoading(key);

      const {
        response,
        itinerary,
        pnr,
        bookingId,
      } = await fetchBookingDetails(booking);

      const pricing = getPricing(
        booking,
        itinerary,
      );

      const blob = await pdf(
        <FlightTicketPDF
          booking={response}
          pricing={pricing}
          bookingData={{}}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);

      console.log(
        "VIEW TICKET 👉",
        pnr,
        bookingId,
      );
    } catch (error) {
      console.error(
        "VIEW TICKET ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to open ticket.",
      );
    } finally {
      setActionLoading("");
    }
  };

  /* ================= VIEW INVOICE ================= */

  const handleViewInvoice = async (booking) => {
    const key = `invoice-${booking?.id}`;

    try {
      setActionLoading(key);

      const {
        response,
        itinerary,
      } = await fetchBookingDetails(booking);

      const pricing = getPricing(
        booking,
        itinerary,
      );

      const blob = await pdf(
        <FlightInvoicePDF
          booking={response}
          pricing={pricing}
          bookingData={{}}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      console.error(
        "VIEW INVOICE ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to open invoice.",
      );
    } finally {
      setActionLoading("");
    }
  };



  /* ================= GET TICKETED ================= */

  const handleGetTicketed = async (booking) => {
    const key = `get-ticketed-${booking?.id}`;

    try {
      setActionLoading(key);

      const {
        itinerary,
        pnr,
        bookingId,
      } = await fetchBookingDetails(booking);

      const traceId =
        booking?.trace_id ||
        booking?.tbo_response?.Response?.TraceId ||
        booking?.tbo_response?.Response?.Response?.TraceId ||
        "";

      if (!traceId) {
        alert("TraceId missing.");
        return;
      }

      if (!pnr || !bookingId) {
        alert("PNR or Booking ID missing.");
        return;
      }

      const passengers = toArray(
        itinerary?.Passenger,
      );

      const segments = toArray(
        itinerary?.Segments,
      );

      // ✅ Domestic / International check
      const isInternational = segments.some(
        (segment) => {
          const originCountry =
            segment?.Origin?.Airport?.CountryCode ||
            "";

          const destinationCountry =
            segment?.Destination?.Airport?.CountryCode ||
            "";

          if (
            !originCountry ||
            !destinationCountry
          ) {
            return false;
          }

          return (
            originCountry !==
            destinationCountry
          );
        },
      );

      /*
       * Booking ke original passenger payload ko
       * fallback ke liye use karenge.
       */
      const savedPassengers =
        booking?.request_payload?.Passengers ||
        booking?.passengers ||
        [];

      let passportPayload = [];

      // ✅ Passport payload only for international
      if (isInternational) {
        passportPayload = passengers.map(
          (apiPassenger, index) => {
            const savedPassenger =
              savedPassengers?.[index] || {};

            return {
              PaxId: apiPassenger?.PaxId,

              PassportNo:
                apiPassenger?.PassportNo ||
                savedPassenger?.PassportNo ||
                savedPassenger?.passport ||
                savedPassenger?.passportNo ||
                "",

              PassportExpiry:
                formatTicketDate(
                  apiPassenger?.PassportExpiry ||
                  savedPassenger?.PassportExpiry ||
                  savedPassenger?.passportExpiry,
                ),

              DateOfBirth:
                formatTicketDate(
                  apiPassenger?.DateOfBirth ||
                  savedPassenger?.DateOfBirth ||
                  savedPassenger?.dob ||
                  savedPassenger?.dateOfBirth,
                ),
            };
          },
        );

        const missingPassport =
          passportPayload.some(
            (passenger) =>
              !passenger.PaxId ||
              !passenger.PassportNo ||
              !passenger.PassportExpiry ||
              !passenger.DateOfBirth,
          );

        if (missingPassport) {
          console.log(
            "PASSPORT PAYLOAD ERROR 👉",
            passportPayload,
          );

          alert(
            "Passport details missing for one or more passengers.",
          );

          return;
        }
      }

      const payload = {
        TraceId: traceId,
        PNR: pnr,
        BookingId: Number(bookingId),
        Passport: passportPayload,
        IsPriceChangeAccepted: true,
      };

      console.log(
        "MY BOOKINGS GET TICKETED PAYLOAD 👉",
        payload,
      );

      const { data } = await privateApi.post(
        "/api/airlines/ticket/",
        payload,
      );

      console.log(
        "MY BOOKINGS GET TICKETED RESPONSE 👉",
        data,
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Ticket generation failed.",
        );
      }

      alert("Ticket generated successfully.");

      // ✅ My Bookings API dubara fetch
      await refetch();

    } catch (error) {
      console.error(
        "GET TICKETED ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.Error
          ?.ErrorMessage ||
        error?.response?.data?.Response?.Error
          ?.ErrorMessage ||
        error?.message ||
        "Ticket generation failed.",
      );
    } finally {
      setActionLoading("");
    }
  };


  /* ================= RELEASE PNR ================= */

  const handleReleasePnr = async (booking) => {
    const key = `release-${booking?.id}`;

    try {
      setActionLoading(key);

      // Fresh booking details lao
      const {
        itinerary,
        pnr,
        bookingId,
      } = await fetchBookingDetails(booking);

      // ✅ Safety: Release PNR only for Non-LCC / Full Service
      if (itinerary?.IsLCC === true) {
        alert(
          "Release PNR is available only for Full Service flights.",
        );
        return;
      }

      if (!pnr || !bookingId) {
        alert("PNR or Booking ID missing.");
        return;
      }

      // ✅ Source fresh booking-details se lo
      const source =
        itinerary?.Source ??
        getStoredItinerary(booking)?.Source ??
        booking?.release_pnr_meta?.Source ??
        null;

      if (
        source === null ||
        source === undefined ||
        source === ""
      ) {
        console.log(
          "RELEASE PNR SOURCE MISSING 👉",
          {
            booking,
            itinerary,
          },
        );

        alert(
          "Source missing. Unable to release PNR.",
        );

        return;
      }

      const payload = {
        BookingId: Number(bookingId),
        Source: Number(source),
      };

      console.log(
        "MY BOOKINGS RELEASE PNR PAYLOAD 👉",
        payload,
      );

      const { data } = await privateApi.post(
        "/api/airlines/release-pnr/",
        payload,
      );

      console.log(
        "MY BOOKINGS RELEASE PNR RESPONSE 👉",
        data,
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Unable to release PNR.",
        );
      }

      alert(
        "Your PNR has been released successfully.",
      );

      // ✅ My Bookings ko fresh karo
      await refetch();

    } catch (error) {
      console.error(
        "MY BOOKINGS RELEASE PNR ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to release PNR.",
      );
    } finally {
      setActionLoading("");
    }
  };

  /* ================= OPEN CHANGE REQUEST ================= */

  const handleOpenChangeRequest = async (booking) => {
    if (!booking?.can_view_ticket) {
      alert(
        "Change request is available only for ticketed bookings.",
      );
      return;
    }

    setSelectedBooking(booking);

    setCancelType("");
    setCancelRemarks("");

    setSelectedSectorIndexes([]);
    setSelectedTicketIds([]);

    setCancelDetails(null);

    setShowCancelModal(true);

    try {
      setCancelDetailsLoading(true);

      const { itinerary } =
        await fetchBookingDetails(booking);

      setCancelDetails(itinerary);
    } catch (error) {
      console.error(
        "CHANGE REQUEST DETAILS ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to fetch booking details.",
      );

      setShowCancelModal(false);
    } finally {
      setCancelDetailsLoading(false);
    }
  };

  /* ================= SEND CHANGE REQUEST ================= */

  const handleSendCancelRequest = async () => {
    if (!cancelType) {
      alert(
        "Please select cancellation type.",
      );
      return;
    }

    if (!cancelRemarks.trim()) {
      alert("Please enter remarks.");
      return;
    }

    if (cancelType === "partial") {
      if (
        selectedSectorIndexes.length === 0
      ) {
        alert(
          "Please select at least one sector.",
        );
        return;
      }

      if (selectedTicketIds.length === 0) {
        alert(
          "Please select at least one passenger.",
        );
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

      const bookingId =
        selectedBooking?.ticket_booking_id ||
        cancelDetails?.BookingId;

      if (!bookingId) {
        alert("Booking ID missing.");
        return;
      }

      const payload = {
        BookingId: Number(bookingId),

        RequestType:
          cancelType === "full" ? 1 : 2,

        CancellationType: 3,

        Remarks: cancelRemarks.trim(),
      };

      /* PARTIAL ONLY */

      if (cancelType === "partial") {
        payload.Sectors =
          selectedSectorIndexes.map(
            (index) => {
              const segment =
                cancelSegments[index];

              return {
                Origin:
                  segment?.Origin?.Airport
                    ?.AirportCode || "",

                Destination:
                  segment?.Destination?.Airport
                    ?.AirportCode || "",
              };
            },
          );

        payload.TicketId =
          selectedTicketIds.map(Number);
      }

      console.log(
        "CHANGE REQUEST PAYLOAD 👉",
        payload,
      );

      const { data } = await privateApi.post(
        "/api/airlines/sendrequest/",
        payload,
      );

      console.log(
        "CHANGE REQUEST RESPONSE 👉",
        data,
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Cancellation request failed.",
        );
      }

      const changeRequestId =
        data?.change_request_id ||
        data?.change_request_ids?.[0] ||
        "N/A";

      alert(
        `Cancellation request sent successfully.\n\n` +
        `Change Request ID: ${changeRequestId}\n\n` +
        `Please note this Change Request ID. ` +
        `You can use it to track your cancellation status.`,
      );

      setShowCancelModal(false);

      setSelectedBooking(null);
      setCancelDetails(null);

      await refetch();
    } catch (error) {
      console.error(
        "CHANGE REQUEST ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to send cancellation request.",
      );
    } finally {
      setCancelRequestLoading(false);
    }
  };


  /* ================= GET CHANGE REQUEST STATUS ================= */

  const handleGetChangeRequestStatus = async (
    booking,
    changeRequestId,
  ) => {
    if (!changeRequestId) {
      alert("Change Request ID is missing.");
      return;
    }

    try {
      setRequestStatusLoading(booking?.id);

      const payload = {
        ChangeRequestId: Number(changeRequestId),
      };

      console.log(
        "GET CHANGE REQUEST STATUS PAYLOAD 👉",
        payload,
      );

      const { data } = await privateApi.post(
        "/api/airlines/getchangerequeststatus/",
        payload,
      );

      console.log(
        "GET CHANGE REQUEST STATUS RESPONSE 👉",
        data,
      );

      if (!data?.success) {
        throw new Error(
          data?.message ||
          "Unable to fetch change request status.",
        );
      }

      setRequestStatusData(data);
      setShowRequestStatusModal(true);

      // optional but useful:
      // latest lifecycle My Bookings me bhi refresh ho jayega
      await refetch();

    } catch (error) {
      console.error(
        "GET CHANGE REQUEST STATUS ERROR 👉",
        error,
      );

      alert(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to fetch change request status.",
      );
    } finally {
      setRequestStatusLoading(null);
    }
  };

  /* ================= LOADING ================= */

  if (isLoading) {
    return (
      <div className="text-gray-300 py-10">
        Loading flights...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-red-400 py-10">
        Unable to load flight bookings.
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-gray-400 py-10">
        No flight bookings
      </div>
    );
  }

  return (
    <>
      {/* ================= CARDS ================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((booking) => {
          const itinerary =
            getStoredItinerary(booking);

          const segments = toArray(
            itinerary?.Segments,
          );

          /*
           * Screenshot ke according card par
           * first flight sector show kar rahe hain.
           *
           * DEL -> DOH
           * DEL -> DXB
           * BLR -> BOM
           */

          const firstSegment =
            segments[0] || {};

          const lastSegment =
            segments[segments.length - 1] || {};

          const originCode =
            firstSegment?.Origin?.Airport
              ?.AirportCode ||
            itinerary?.Origin ||
            "N/A";

          const originCity =
            firstSegment?.Origin?.Airport
              ?.CityName ||
            originCode;

          const destinationCode =
            itinerary?.Destination ||
            lastSegment?.Destination?.Airport?.AirportCode ||
            "N/A";

          const destinationCity =
            lastSegment?.Destination?.Airport?.CityName ||
            destinationCode;

          const airlineName =
            firstSegment?.Airline?.AirlineName ||
            "N/A";

          const flightNumber =
            firstSegment?.Airline
              ?.FlightNumber || "N/A";

          const departure =
            firstSegment?.Origin?.DepTime;

          const arrival =
            lastSegment?.Destination?.ArrTime;

          const bookingId =
            booking?.ticket_booking_id ||
            itinerary?.BookingId ||
            "N/A";

          const pnr =
            booking?.ticket_pnr ||
            itinerary?.PNR ||
            "N/A";


          const ticketStatus = String(
            booking?.ticket_status ||
            booking?.booking_status ||
            booking?.status ||
            ""
          ).toLowerCase();

          const cancellationStatus = String(
            booking?.cancellation_status || ""
          ).toLowerCase();

          const isTicketed =
            ticketStatus === "ticketed";

          const isHold =
            ticketStatus === "hold" ||
            ticketStatus === "on_hold";

          const isReleased =
            ticketStatus === "released" ||
            String(booking?.pnr_status || "").toLowerCase() === "released";

          const isCancelled =
            ticketStatus === "cancelled" ||
            cancellationStatus === "cancelled";

          const hasChangeRequest =
            (
              booking?.change_request_id !== null &&
              booking?.change_request_id !== undefined &&
              booking?.change_request_id !== ""
            ) ||
            cancellationStatus === "requested";


          const changeRequestId =
            booking?.change_request_id ||
            booking?.change_request_ids?.[0] ||
            booking?.tbo_response?._lifecycle?.change_request_id ||
            booking?.tbo_response?.change_request_meta?.ChangeRequestId ||
            null;

          const status =
            booking?.ticket_status ||
            booking?.booking_status ||
            booking?.status ||
            "pending";

          const totalAmount = Number(
            booking?.total_amount || 0,
          );



          return (
            <div
              key={booking?.id}
              className="bg-[#151515] border border-white/10 hover:border-[#E6B35C]/70 rounded-2xl p-5 transition"
            >
              {/* TOP */}

              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-gray-400 text-sm">
                    Booking ID
                  </p>

                  <p className="font-bold text-lg">
                    {bookingId}
                  </p>
                </div>

                <span
                  className={`text-xs font-semibold px-4 py-1 rounded-full capitalize ${isTicketed
                    ? "bg-green-900/60 text-green-300"
                    : isHold
                      ? "bg-yellow-900/60 text-yellow-300"
                      : isReleased
                        ? "bg-purple-900/60 text-purple-300"
                        : isCancelled
                          ? "bg-red-900/60 text-red-300"
                          : status === "failed"
                            ? "bg-red-900/60 text-red-300"
                            : "bg-blue-900/60 text-blue-300"
                    }`}
                >
                  {status}
                </span>
              </div>

              {/* ROUTE */}

              <div className="bg-black/30 rounded-xl px-4 py-5 flex items-center justify-between mb-5">
                <div>
                  <p className="text-2xl font-bold">
                    {originCode}
                  </p>

                  <p className="text-gray-400 text-sm mt-1">
                    {originCity}
                  </p>
                </div>

                <div className="text-yellow-400 text-xl">
                  ✈
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {destinationCode}
                  </p>

                  <p className="text-gray-400 text-sm mt-1">
                    {destinationCity}
                  </p>
                </div>
              </div>

              {/* DETAILS */}

              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-yellow-400 mr-2">
                    🎫
                  </span>

                  <span className="font-semibold">
                    PNR:
                  </span>{" "}

                  {pnr}
                </p>

                <p>
                  <span className="text-yellow-400 mr-2">
                    ✈
                  </span>

                  <span className="font-semibold">
                    {airlineName}
                  </span>

                  {" - "}
                  {flightNumber}
                </p>

                <p>
                  <span className="text-yellow-400 mr-2">
                    📅
                  </span>

                  <span className="font-semibold">
                    Departure:
                  </span>{" "}

                  {formatDate(departure)}
                </p>

                <p>
                  <span className="text-yellow-400 mr-2">
                    📅
                  </span>

                  <span className="font-semibold">
                    Arrival:
                  </span>{" "}

                  {formatDate(arrival)}
                </p>
              </div>

              {/* PRICE */}

              <div className="border-t border-white/10 mt-5 pt-4">
                <p className="text-xl font-bold">
                  <span className="text-yellow-400 mr-3">
                    ₹
                  </span>

                  {totalAmount.toLocaleString(
                    "en-IN",
                  )}
                </p>
              </div>

              {/* ================= ACTIONS ================= */}

              {(isTicketed || isHold || isReleased || isCancelled) && (
                <div className="grid grid-cols-2 gap-2 mt-4">

                  {/* ================= BOOKING DETAILS ================= */}

                  <button
                    type="button"
                    onClick={() =>
                      handleViewBookingDetails(booking)
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg"
                  >
                    Booking Details
                  </button>

                  {/* ================= VIEW INVOICE ================= */}

                  {!isReleased && (
                    <button
                      type="button"
                      onClick={() => handleViewInvoice(booking)}
                      disabled={
                        !isTicketed ||
                        actionLoading === `invoice-${booking.id}`
                      }
                      className={`font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg transition ${isTicketed
                          ? "bg-white/10 hover:bg-white/20 text-white"
                          : "bg-white/5 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      {actionLoading === `invoice-${booking.id}`
                        ? "Opening..."
                        : "View Invoice"}
                    </button>
                  )}

                  {/* ================= TICKETED ================= */}

                  {isTicketed && (
                    <>
                      {/* VIEW TICKET */}

                      <button
                        type="button"
                        onClick={() =>
                          handleViewTicket(booking)
                        }
                        disabled={
                          actionLoading === `ticket-${booking.id}`
                        }
                        className="bg-[#E6B35C] hover:bg-[#dca94f] text-black font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg disabled:opacity-60"
                      >
                        {actionLoading === `ticket-${booking.id}`
                          ? "Opening..."
                          : "View Ticket"}
                      </button>

                      {/* CHANGE REQUEST */}

                      {!hasChangeRequest ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenChangeRequest(booking)
                          }
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg"
                        >
                          Send Change Request
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="bg-gray-700 text-gray-300 font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg cursor-not-allowed"
                        >
                          <div className="flex flex-col items-center">
                            <span>Change Request Submitted</span>

                            {changeRequestId && (
                              <span className="text-xs mt-1 text-gray-400">
                                ID: {changeRequestId}
                              </span>
                            )}
                          </div>
                        </button>


                      )}



                      {hasChangeRequest && changeRequestId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleGetChangeRequestStatus(
                              booking,
                              changeRequestId,
                            )
                          }
                          disabled={
                            requestStatusLoading === booking?.id
                          }
                          className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg disabled:opacity-60"
                        >
                          {requestStatusLoading === booking?.id
                            ? "Checking Status..."
                            : "Get Status of Request"}
                        </button>
                      )}
                    </>
                  )}

                  {/* ================= HOLD ================= */}

                  {isHold && (
                    <>
                      {/* GET TICKETED */}

                      <button
                        type="button"
                        onClick={() =>
                          handleGetTicketed(booking)
                        }
                        disabled={
                          actionLoading ===
                          `get-ticketed-${booking.id}`
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg disabled:opacity-60"
                      >
                        {actionLoading ===
                          `get-ticketed-${booking.id}`
                          ? "Generating..."
                          : "Get Ticketed"}
                      </button>

                      {/* RELEASE PNR */}

                      <button
                        type="button"
                        onClick={() =>
                          handleReleasePnr(booking)
                        }
                        disabled={
                          actionLoading ===
                          `release-${booking.id}`
                        }
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-2 sm:py-2.5 sm:px-3 text-xs sm:text-sm rounded-lg disabled:opacity-60"
                      >
                        {actionLoading ===
                          `release-${booking.id}`
                          ? "Releasing..."
                          : "Release PNR"}
                      </button>
                    </>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= CHANGE REQUEST MODAL ================= */}

      {showCancelModal && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-lg">
                Request (PNR:{" "}
                {selectedBooking?.ticket_pnr ||
                  cancelDetails?.PNR ||
                  "N/A"}
                )
              </h3>

              <button
                type="button"
                disabled={
                  cancelRequestLoading
                }
                onClick={() =>
                  setShowCancelModal(false)
                }
                className="text-xl"
              >
                ✕
              </button>
            </div>

            {cancelDetailsLoading ? (
              <div className="p-10 text-center">
                Loading booking details...
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* TYPE */}

                <div>
                  <label className="block font-semibold text-sm mb-2">
                    Cancellation Type
                  </label>

                  <select
                    value={cancelType}
                    onChange={(event) => {
                      setCancelType(
                        event.target.value,
                      );

                      setSelectedSectorIndexes(
                        [],
                      );

                      setSelectedTicketIds([]);
                    }}
                    className="w-full border rounded-lg px-3 py-3"
                  >
                    <option value="">
                      -Select-
                    </option>

                    <option value="full">
                      Refund with Airline Penalty /
                      Void
                    </option>

                    <option value="partial">
                      Partial Cancellation
                    </option>
                  </select>
                </div>

                {/* PARTIAL */}

                {cancelType === "partial" && (
                  <>
                    {/* SECTORS */}

                    <div className="border-t pt-4">
                      <p className="font-semibold text-sm mb-3">
                        Please select Refund Sectors
                      </p>

                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={
                            cancelSegments.length >
                            0 &&
                            selectedSectorIndexes.length ===
                            cancelSegments.length
                          }
                          onChange={(event) => {
                            if (
                              event.target.checked
                            ) {
                              setSelectedSectorIndexes(
                                cancelSegments.map(
                                  (_, index) =>
                                    index,
                                ),
                              );
                            } else {
                              setSelectedSectorIndexes(
                                [],
                              );
                            }
                          }}
                        />

                        All
                      </label>

                      {cancelSegments.map(
                        (segment, index) => {
                          const origin =
                            segment?.Origin
                              ?.Airport
                              ?.AirportCode ||
                            "--";

                          const destination =
                            segment?.Destination
                              ?.Airport
                              ?.AirportCode ||
                            "--";

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
                                    (
                                      previous,
                                    ) =>
                                      previous.includes(
                                        index,
                                      )
                                        ? previous.filter(
                                          (
                                            item,
                                          ) =>
                                            item !==
                                            index,
                                        )
                                        : [
                                          ...previous,
                                          index,
                                        ],
                                  );
                                }}
                              />

                              {origin}-
                              {destination}
                            </label>
                          );
                        },
                      )}
                    </div>

                    {/* PASSENGERS */}

                    <div className="border-t pt-4">
                      <p className="font-semibold text-sm mb-3">
                        Please select Passenger
                      </p>

                      <label className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={
                            cancelPassengers.length >
                            0 &&
                            selectedTicketIds.length ===
                            cancelPassengers.filter(
                              (passenger) =>
                                getTicketId(
                                  passenger,
                                ),
                            ).length
                          }
                          onChange={(event) => {
                            if (
                              event.target.checked
                            ) {
                              const ids =
                                cancelPassengers
                                  .map(
                                    getTicketId,
                                  )
                                  .filter(
                                    Boolean,
                                  );

                              setSelectedTicketIds(
                                ids,
                              );
                            } else {
                              setSelectedTicketIds(
                                [],
                              );
                            }
                          }}
                        />

                        All
                      </label>

                      {cancelPassengers.map(
                        (
                          passenger,
                          index,
                        ) => {
                          const ticketId =
                            getTicketId(
                              passenger,
                            );

                          const name =
                            `${passenger?.Title ||
                              ""
                              } ${passenger?.FirstName ||
                              ""
                              } ${passenger?.LastName ||
                              ""
                              }`
                              .replace(
                                /\s+/g,
                                " ",
                              )
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
                                disabled={
                                  !ticketId
                                }
                                checked={
                                  ticketId
                                    ? selectedTicketIds.includes(
                                      ticketId,
                                    )
                                    : false
                                }
                                onChange={() => {
                                  if (
                                    !ticketId
                                  ) {
                                    return;
                                  }

                                  setSelectedTicketIds(
                                    (
                                      previous,
                                    ) =>
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
                              {name ||
                                "Passenger"}

                              {ticketId && (
                                <span className="text-xs text-gray-500">
                                  (Ticket ID:{" "}
                                  {ticketId})
                                </span>
                              )}
                            </label>
                          );
                        },
                      )}
                    </div>
                  </>
                )}

                {/* REMARKS */}

                <div className="border-t pt-4">
                  <label className="block font-semibold text-sm mb-2">
                    Please enter remarks{" "}
                    <span className="text-red-600">
                      *
                    </span>
                  </label>

                  <textarea
                    rows={4}
                    value={cancelRemarks}
                    onChange={(event) =>
                      setCancelRemarks(
                        event.target.value,
                      )
                    }
                    placeholder="Enter cancellation remarks"
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                {/* NOTE */}

                <div className="border-t pt-4 text-xs text-gray-600">
                  <p className="font-semibold mb-1">
                    Note:
                  </p>

                  <p>
                    1. Partial refund will be
                    processed offline.
                  </p>

                  <p>
                    2. Cancellation charges are
                    subject to airline rules.
                  </p>
                </div>

                {/* BUTTONS */}

                <div className="border-t pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={
                      cancelRequestLoading
                    }
                    onClick={() =>
                      setShowCancelModal(
                        false,
                      )
                    }
                    className="px-5 py-2.5 bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      cancelRequestLoading
                    }
                    onClick={
                      handleSendCancelRequest
                    }
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-60"
                  >
                    {cancelRequestLoading
                      ? "Sending..."
                      : "Send Request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CHANGE REQUEST STATUS MODAL ================= */}

      {showRequestStatusModal && requestStatusData && (
        <div className="fixed inset-0 z-[250] bg-black/70 flex items-center justify-center p-4">

          <div className="bg-white text-black w-full max-w-md rounded-2xl shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold">
                Change Request Status
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowRequestStatusModal(false);
                  setRequestStatusData(null);
                }}
                className="text-xl"
              >
                ✕
              </button>
            </div>

            {/* BODY */}

            <div className="p-5 space-y-4">

              {/* CHANGE REQUEST ID */}

              <div>
                <p className="text-xs text-gray-500">
                  Change Request ID
                </p>

                <p className="font-semibold">
                  {requestStatusData?.change_request_id ||
                    "N/A"}
                </p>
              </div>

              {/* CANCELLATION STATUS */}

              <div>
                <p className="text-xs text-gray-500">
                  Cancellation Status
                </p>

                <p className="font-semibold capitalize text-orange-600">
                  {String(
                    requestStatusData?.cancellation_status ||
                    "N/A",
                  ).replaceAll("_", " ")}
                </p>
              </div>

              {/* REQUEST STATUS */}

              <div>
                <p className="text-xs text-gray-500">
                  Request Status
                </p>

                <p className="font-semibold">
                  {requestStatusData?.change_request_status_text ||
                    "N/A"}
                </p>
              </div>

              {/* REFUND */}

              <div className="border-t pt-4">
                <p className="text-xs text-gray-500">
                  Refund Status
                </p>

                {requestStatusData?.refunded_amount !== null &&
                  requestStatusData?.refunded_amount !== undefined ? (
                  <p className="font-semibold text-green-600">
                    Refunded Amount: ₹
                    {Number(
                      requestStatusData.refunded_amount,
                    ).toLocaleString("en-IN")}
                  </p>
                ) : (
                  <p className="font-semibold text-red-600">
                    Amount not refunded yet
                  </p>
                )}
              </div>

              {/* CANCELLATION CHARGE */}

              {requestStatusData?.cancellation_charge !== null &&
                requestStatusData?.cancellation_charge !==
                undefined && (
                  <div>
                    <p className="text-xs text-gray-500">
                      Cancellation Charge
                    </p>

                    <p className="font-semibold">
                      ₹
                      {Number(
                        requestStatusData.cancellation_charge,
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}

              {/* IN PROGRESS NOTE */}

              {String(
                requestStatusData?.cancellation_status ||
                "",
              ).toLowerCase() === "in_progress" && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-3 text-sm">
                    Your cancellation request is currently
                    in progress. The refund amount has not
                    been processed yet.
                  </div>
                )}

            </div>

            {/* FOOTER */}

            <div className="border-t p-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRequestStatusModal(false);
                  setRequestStatusData(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold"
              >
                OK
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default FlightBookings;