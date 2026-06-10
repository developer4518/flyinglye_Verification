"use client";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
    return 1;
  }

  const diff = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 1;
};

const getRoomData = (saved, bookingData) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.room ||
    saved?.selectedRoom ||
    saved?.room ||
    bookingData?.HotelRoomsDetails?.[0] ||
    {}
  );
};

const getHotelResult = (saved) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0] ||
    saved?.hotel?.hotel_raw ||
    {}
  );
};

const normalizeList = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flat(Infinity).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const HotelVoucher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();

  const savedLocalData = safeJsonParse(
    localStorage.getItem("hotelBookingData"),
    {},
  );

  const state = location.state || {};

  const savedData = state.savedData || savedLocalData;

  const rawBooking =
    state.booking ||
    savedData?.bookingResponse?.data ||
    savedData?.bookingResponse?.Data ||
    savedData?.bookingResponse?.Response ||
    savedData?.bookingResponse ||
    {};

  const booking =
    rawBooking?.data || rawBooking?.Data || rawBooking?.Response || rawBooking;

  const hotel =
    state.hotel ||
    savedData?.hotel ||
    booking?.HotelDetails ||
    booking?.HotelDetail ||
    {};

  const guestDetails =
    state.guestDetails ||
    savedData?.guestList ||
    booking?.HotelPassenger ||
    booking?.Passengers ||
    [];

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const hotelResult = useMemo(() => getHotelResult(savedData), [savedData]);

  const roomName = useMemo(() => {
    const name =
      roomData?.Name?.[0] ||
      roomData?.RoomName ||
      roomData?.RoomTypeName ||
      roomData?.RoomType ||
      roomData?.Name ||
      booking?.HotelRoomsDetails?.[0]?.RoomTypeName ||
      "Room";

    return Array.isArray(name) ? name[0] : name;
  }, [roomData, booking]);

  const confirmationNo =
    booking?.ConfirmationNo ||
    booking?.TBOConfirmationNo ||
    booking?.BookingRefNo ||
    bookingId ||
    "N/A";

  const hotelName =
    hotel?.hotel_name || hotel?.HotelName || booking?.HotelName || "Hotel";

  const hotelAddress =
    hotel?.address ||
    hotel?.Address ||
    booking?.HotelAddress ||
    hotelResult?.HotelAddress ||
    "Hotel address not available";

  const hotelCity =
    hotel?.city_name ||
    hotel?.CityName ||
    hotel?.city ||
    booking?.CityName ||
    "";

  const checkIn =
    savedData?.checkIn ||
    booking?.CheckInDate ||
    booking?.HotelCheckIn ||
    booking?.CheckIn;

  const checkOut =
    savedData?.checkOut ||
    booking?.CheckOutDate ||
    booking?.HotelCheckOut ||
    booking?.CheckOut;

  const nights = getNights(checkIn, checkOut);

  const leadGuest =
    guestDetails.find((g) => g.LeadPassenger) || guestDetails[0] || {};

  const leadGuestName = `${leadGuest?.Title ? `${leadGuest.Title}. ` : ""}${
    leadGuest?.FirstName || leadGuest?.firstName || ""
  } ${leadGuest?.LastName || leadGuest?.lastName || ""}`.trim();

  const adults = guestDetails.filter(
    (g) => Number(g.PaxType) === 1 || Number(g.Age) >= 12,
  );

  const children = guestDetails.filter(
    (g) => Number(g.PaxType) === 2 || Number(g.Age) < 12,
  );

  const inclusion =
    roomData?.Inclusion ||
    roomData?.MealType ||
    booking?.HotelRoomsDetails?.[0]?.MealType ||
    "Room Only";

  const roomPromotion =
    roomData?.RoomPromotion?.[0] ||
    roomData?.RoomPromotions?.[0] ||
    roomData?.Promotion ||
    "";

  const roomDescription =
    roomData?.RoomDescription ||
    roomData?.Description ||
    roomData?.RoomInfo ||
    "";

  const amenities = useMemo(() => {
    const list =
      roomData?.Amenities ||
      roomData?.RoomAmenities ||
      roomData?.amenities ||
      hotel?.amenities ||
      [];

    if (Array.isArray(list)) return list;
    if (typeof list === "string") {
      return list
        .split("|")
        .join(",")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }, [roomData, hotel]);

  const hotelNorms = useMemo(() => {
    const norms =
      hotelResult?.HotelNorms ||
      hotel?.HotelNorms ||
      hotel?.hotel_norms ||
      roomData?.HotelNorms ||
      [];

    return normalizeList(norms);
  }, [hotelResult, hotel, roomData]);

  const contactPhone = "9999055591";
  const contactEmail = "flyinglyte@outlook.com";

  const agencyName = "FLYINGLYTE1";
  const agencyCity = "Delhi";

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Hotel Voucher - ${confirmationNo}`);
    const body = encodeURIComponent(
      `Dear Guest,\n\nYour hotel voucher is ready.\n\nHotel: ${hotelName}\nConfirmation No: ${confirmationNo}\nCheck In: ${formatDate(
        checkIn,
      )}\nCheck Out: ${formatDate(checkOut)}\n\nRegards,\nFlyinglyte`,
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleGeneratePdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-3 md:px-8 font-[var(--font-body)]">
      <style>
        {`
          @media print {
            body {
              background: white !important;
            }

            .no-print {
              display: none !important;
            }

            .voucher-print-area {
              box-shadow: none !important;
              border-radius: 0 !important;
              max-width: 100% !important;
              background: white !important;
              color: #111827 !important;
            }

            .voucher-print-area * {
              color: #111827 !important;
              border-color: #cbd5e1 !important;
            }

            .voucher-print-header {
              background: #0f4c81 !important;
              color: white !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .voucher-print-header * {
              color: white !important;
            }

            .voucher-section-heading {
              background: #eef2ff !important;
              color: #0f4c81 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-red {
              color: red !important;
            }

            @page {
              margin: 12mm;
              size: A4;
            }
          }
        `}
      </style>

      <div className="max-w-6xl mx-auto">
        <div className="no-print mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-fit px-5 py-2 rounded-xl border border-[var(--border-soft)] text-[var(--gold-soft)] hover:bg-white/5 transition"
          >
            ← Back
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleEmail}
              className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--gold-soft)] hover:text-white transition"
            >
              Email Voucher
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-soft)] text-[var(--gold-soft)] hover:text-white transition"
            >
              Print Voucher
            </button>

            <button
              onClick={handleGeneratePdf}
              className="px-4 py-2 rounded-xl bg-linear-to-r from-start to-end text-black font-bold shadow-lg shadow-black/20 hover:scale-[1.02] transition"
            >
              Generate PDF
            </button>
          </div>
        </div>

        <div className="voucher-print-area bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
          {/* HEADER */}
          <div className="voucher-print-header bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[var(--border-soft)]">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--gold-main)] font-[var(--font-heading)] tracking-wide">
              Hotel Voucher
            </h1>

            <div className="no-print flex gap-3 text-sm">
              <button
                onClick={handleEmail}
                className="text-[var(--gold-soft)] underline underline-offset-4"
              >
                Email Voucher
              </button>
              <span className="text-[var(--text-muted)]">|</span>
              <button
                onClick={handlePrint}
                className="text-[var(--gold-soft)] underline underline-offset-4"
              >
                Print Voucher
              </button>
              <span className="text-[var(--text-muted)]">|</span>
              <button
                onClick={handleGeneratePdf}
                className="text-[var(--gold-soft)] underline underline-offset-4"
              >
                Generate PDF
              </button>
            </div>
          </div>

          {/* CONFIRMATION */}
          <VoucherBlock>
            <VoucherHeading>Confirmation No</VoucherHeading>
            <p className="px-4 py-3 text-[var(--text-main)] font-semibold">
              {confirmationNo}
            </p>
          </VoucherBlock>

          {/* ADDRESS DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-[var(--border-soft)]">
            <div className="p-4 md:border-r border-[var(--border-soft)]">
              <h3 className="font-bold text-[var(--gold-main)] mb-2">
                Hotel Address Details
              </h3>

              <p className="font-semibold text-white">{hotelName}</p>
              <p className="text-[var(--text-muted)] leading-relaxed">
                {hotelAddress}
                {hotelCity ? `, ${hotelCity}` : ""}
              </p>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${hotelName} ${hotelAddress}`,
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-2 text-[var(--gold-soft)] underline underline-offset-4"
              >
                View Map
              </a>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-[var(--gold-main)] mb-2">
                Agency Address Details
              </h3>

              <p className="font-semibold text-white">{agencyName}</p>
              <p className="text-[var(--text-muted)]">Delhi</p>
              <p className="text-[var(--text-muted)]">City : {agencyCity}</p>

              <p className="text-[var(--text-muted)]">
                Phone :{" "}
                <a
                  href={`tel:${contactPhone}`}
                  className="text-[var(--gold-soft)] hover:underline"
                >
                  {contactPhone}
                </a>
              </p>

              <p className="text-[var(--text-muted)]">
                Email :{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-[var(--gold-soft)] hover:underline"
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </div>

          {/* LEAD + DATES */}
          <div className="p-4 border-b border-[var(--border-soft)]">
            <p className="text-[var(--text-muted)]">
              <span className="font-bold text-[var(--gold-main)]">
                Lead Passenger Name:
              </span>{" "}
              <span className="text-white">{leadGuestName || "N/A"}</span>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <p>
                <span className="font-bold text-[var(--gold-main)]">
                  Check In Date:
                </span>{" "}
                <span className="text-white">{formatDate(checkIn)}</span>
              </p>

              <p>
                <span className="font-bold text-[var(--gold-main)]">
                  Check Out Date:
                </span>{" "}
                <span className="text-white">{formatDate(checkOut)}</span>
              </p>

              <p>
                <span className="font-bold text-[var(--gold-main)]">
                  No of Nights:
                </span>{" "}
                <span className="text-white">{nights}</span>
              </p>
            </div>
          </div>

          {/* ROOM TABLE */}
          <div className="overflow-x-auto border-b border-[var(--border-soft)]">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="voucher-section-heading bg-[var(--bg-secondary)] text-[var(--gold-soft)]">
                  <th className="w-16 text-left p-3 border-r border-[var(--border-soft)]">
                    S.No
                  </th>
                  <th className="text-left p-3 border-r border-[var(--border-soft)]">
                    Room Type
                  </th>
                  <th className="w-60 text-left p-3">Guests Type</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td className="p-3 text-center border-r border-[var(--border-soft)] align-middle">
                    1
                  </td>

                  <td className="p-4 border-r border-[var(--border-soft)] align-top">
                    <p className="font-bold text-white text-base">{roomName}</p>
                    <p className="text-[var(--text-muted)]">
                      Incl : {inclusion}
                    </p>

                    {roomPromotion && (
                      <p className="print-red mt-2 font-bold text-red-400">
                        {roomPromotion}
                      </p>
                    )}

                    <div className="mt-8 space-y-4 text-[var(--text-muted)] leading-relaxed">
                      <p>
                        <span className="font-bold text-white">
                          Room Description:
                        </span>
                      </p>

                      {roomDescription ? (
                        <p>{roomDescription}</p>
                      ) : (
                        <>
                          <p>Comfortable room with modern facilities.</p>
                          <p>
                            <span className="font-bold text-white">
                              Internet
                            </span>{" "}
                            - Free WiFi
                          </p>
                          <p>
                            <span className="font-bold text-white">
                              Entertainment
                            </span>{" "}
                            - Television with satellite channels
                          </p>
                          <p>
                            <span className="font-bold text-white">
                              Food and Drink
                            </span>{" "}
                            - Room service as per hotel policy
                          </p>
                          <p>
                            <span className="font-bold text-white">
                              Bathroom
                            </span>{" "}
                            - Private bathroom and toiletries
                          </p>
                          <p>
                            <span className="font-bold text-white">
                              Comfort
                            </span>{" "}
                            - Air conditioning and daily housekeeping
                          </p>
                        </>
                      )}

                      {amenities.length > 0 && (
                        <div>
                          <p className="font-bold text-white mb-1">
                            Amenities:
                          </p>
                          <p>{amenities.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-4 align-middle text-[var(--text-muted)]">
                    <p className="font-semibold text-white">
                      {adults.length || 1} Adult(s)
                      {children.length > 0 ? `, ${children.length} Child` : ""}
                    </p>

                    {adults.length > 0 && (
                      <p>
                        Adults:
                        {adults
                          .map((g) =>
                            `${g.FirstName || g.firstName || ""} ${
                              g.LastName || g.lastName || ""
                            }`.trim(),
                          )
                          .join(", ")}
                      </p>
                    )}

                    {children.length > 0 && (
                      <p>
                        Children:
                        {children
                          .map((g) =>
                            `${g.FirstName || g.firstName || ""} ${
                              g.LastName || g.lastName || ""
                            }`.trim(),
                          )
                          .join(", ")}
                      </p>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* PACKAGE */}
          <VoucherBlock>
            <VoucherTitle>Package Details:</VoucherTitle>

            <div className="p-4">
              <p className="font-bold text-[var(--gold-soft)]">
                Special Service Request:
              </p>
              <p className="text-[var(--text-muted)] mt-1">
                {booking?.SpecialRequest || booking?.SSR || "N.A."}
              </p>
            </div>
          </VoucherBlock>

          {/* REMARKS */}
          <VoucherBlock>
            <VoucherTitle>Remarks</VoucherTitle>
            <p className="p-4 text-[var(--text-muted)] leading-relaxed">
              {booking?.Remark ||
                booking?.Remarks ||
                "Please note that while your booking has been confirmed and is guaranteed, the rooming list with your name may not be adjusted in the hotel's reservation system until closer to arrival."}
            </p>
          </VoucherBlock>

          <VoucherBlock>
            <VoucherTitle>Agent Remarks</VoucherTitle>
            <p className="p-4 text-[var(--text-muted)]">N.a.</p>
          </VoucherBlock>

          {/* TERMS */}
          <VoucherBlock>
            <VoucherTitle>Booking Terms & Conditions</VoucherTitle>

            <div className="p-4 text-[var(--text-muted)] leading-relaxed">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  You must present a photo ID at the time of check in. Hotel may
                  ask for credit card or cash deposit for extra services.
                </li>
                <li>
                  All extra charges should be collected directly from clients,
                  such as parking, phone calls, room service, city tax, etc.
                </li>
                <li>
                  We do not accept responsibility for additional expenses due to
                  changes or delays in air, road, rail, sea or other causes.
                </li>
                <li>
                  In case of wrong residency or nationality selected at the time
                  of booking, supplement charges may apply and need to be paid
                  directly at hotel.
                </li>
                <li>
                  Special requests for bed type, early check in, late check out,
                  smoking rooms, etc. are subject to availability.
                </li>
                <li>
                  Early check out will attract full cancellation charges unless
                  otherwise specified.
                </li>
                <li>
                  In case of late check-in, guest should inform the hotel or TBO
                  in advance to avoid no-show marking.
                </li>
              </ul>
            </div>
          </VoucherBlock>

          {/* HOTEL POLICIES */}
          <VoucherBlock>
            <VoucherTitle>Hotel Policies</VoucherTitle>

            <div className="p-4 text-[var(--text-muted)] leading-relaxed">
              {hotelNorms.length > 0 ? (
                <ul className="list-disc pl-6 space-y-2">
                  {hotelNorms.map((norm, index) => (
                    <li key={index}>{norm}</li>
                  ))}
                </ul>
              ) : (
                <ul className="list-disc pl-6 space-y-2">
                  <li>{hotelCity || "India"} hotel policy applies.</li>
                  <li>
                    <span className="font-bold text-white">{roomName}</span>
                  </li>
                  <li>CheckIn Time-Begin: 12:00 PM</li>
                  <li>CheckIn Time-End: anytime</li>
                  <li>CheckOut Time: 12:00 PM</li>
                  <li>Minimum CheckIn Age : 18</li>
                  <li>
                    Government-issued photo identification may be required at
                    check-in.
                  </li>
                  <li>
                    Special requests are subject to availability and may incur
                    additional charges.
                  </li>
                  <li>
                    City tax and resort fee are to be paid directly at hotel if
                    applicable.
                  </li>
                  <li>
                    Extra person charges may apply at check-in, as per the
                    property&apos;s policy.
                  </li>
                </ul>
              )}
            </div>
          </VoucherBlock>

          {/* CONTACT */}
          <div className="p-4">
            <h3 className="font-bold text-[var(--gold-main)] text-lg mb-2">
              Contact Details:
            </h3>

            <p className="text-[var(--text-muted)]">
              Phone :{" "}
              <a
                href={`tel:${contactPhone}`}
                className="text-[var(--gold-soft)] hover:underline"
              >
                {contactPhone}
              </a>
            </p>

            <p className="text-[var(--text-muted)]">
              Email :{" "}
              <a
                href={`mailto:${contactEmail}`}
                className="text-[var(--gold-soft)] hover:underline"
              >
                {contactEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const VoucherBlock = ({ children }) => {
  return (
    <section className="border-b border-[var(--border-soft)]">
      {children}
    </section>
  );
};

const VoucherHeading = ({ children }) => {
  return (
    <div className="voucher-section-heading bg-[var(--bg-secondary)] px-4 py-3 font-bold text-[var(--gold-main)] border-b border-[var(--border-soft)]">
      {children}
    </div>
  );
};

const VoucherTitle = ({ children }) => {
  return (
    <h2 className="voucher-section-heading bg-[var(--bg-secondary)] px-4 py-3 font-bold text-[var(--gold-main)] text-lg border-b border-[var(--border-soft)]">
      {children}
    </h2>
  );
};

export default HotelVoucher;
