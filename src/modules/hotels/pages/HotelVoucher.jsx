"use client";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  if (!checkIn || !checkOut) return "N/A";

  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  if (Number.isNaN(inDate.getTime()) || Number.isNaN(outDate.getTime())) {
    return "N/A";
  }

  const diff = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : "N/A";
};

const normalizeArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flat(Infinity).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split("|")
      .join("\n")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const cleanText = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") return "";
  return String(value).trim();
};

const getRoomData = (saved, bookingData) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.room ||
    saved?.selectedRoom ||
    saved?.room ||
    bookingData?.HotelRoomsDetails?.[0] ||
    bookingData?.Rooms?.[0] ||
    {}
  );
};

const getHotelResult = (saved, bookingData) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0] ||
    saved?.hotel?.hotel_raw ||
    bookingData?.HotelResult?.[0] ||
    bookingData?.Response?.HotelResult?.[0] ||
    {}
  );
};

const getGuestName = (guest) => {
  return `${guest?.Title ? `${guest.Title}. ` : ""}${
    guest?.FirstName || guest?.firstName || guest?.First || ""
  } ${guest?.LastName || guest?.lastName || guest?.Last || ""}`.trim();
};

const getFirstValue = (...values) => {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
};

const HotelVoucher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();

  const voucherRef = useRef(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfCaptureMode, setPdfCaptureMode] = useState(false);

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
    booking?.Hotel ||
    {};

  const guestDetails =
    state.guestDetails ||
    savedData?.guestList ||
    booking?.HotelPassenger ||
    booking?.Passengers ||
    booking?.GuestDetails ||
    [];

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const hotelResult = useMemo(
    () => getHotelResult(savedData, booking),
    [savedData, booking],
  );

  const roomName = useMemo(() => {
    const name =
      roomData?.Name?.[0] ||
      roomData?.RoomName ||
      roomData?.RoomTypeName ||
      roomData?.RoomType ||
      roomData?.Name ||
      booking?.HotelRoomsDetails?.[0]?.RoomTypeName;

    return Array.isArray(name) ? name[0] : name || "N/A";
  }, [roomData, booking]);

  const confirmationNo = getFirstValue(
    booking?.ConfirmationNo,
    booking?.TBOConfirmationNo,
    booking?.BookingRefNo,
    booking?.BookingId,
    bookingId,
  );

  const hotelName = getFirstValue(
    hotel?.hotel_name,
    hotel?.HotelName,
    booking?.HotelName,
    hotelResult?.HotelName,
  );

  const hotelAddress = getFirstValue(
    hotel?.address,
    hotel?.Address,
    booking?.HotelAddress,
    hotelResult?.HotelAddress,
    hotelResult?.Address,
  );

  const hotelCity = getFirstValue(
    hotel?.city_name,
    hotel?.CityName,
    hotel?.city,
    booking?.CityName,
    hotelResult?.CityName,
  );

  const checkIn =
    savedData?.checkIn ||
    booking?.CheckInDate ||
    booking?.HotelCheckIn ||
    booking?.CheckIn ||
    roomData?.CheckInDate;

  const checkOut =
    savedData?.checkOut ||
    booking?.CheckOutDate ||
    booking?.HotelCheckOut ||
    booking?.CheckOut ||
    roomData?.CheckOutDate;

  const nights = getNights(checkIn, checkOut);

  const leadGuest =
    guestDetails.find((g) => g?.LeadPassenger) || guestDetails[0] || {};

  const leadGuestName = getGuestName(leadGuest);

  const adults = guestDetails.filter(
    (g) => Number(g?.PaxType) === 1 || Number(g?.Age) >= 12,
  );

  const children = guestDetails.filter(
    (g) => Number(g?.PaxType) === 2 || Number(g?.Age) < 12,
  );

  const adultNames = adults.map(getGuestName).filter(Boolean).join(", ");
  const childNames = children.map(getGuestName).filter(Boolean).join(", ");

  const inclusion = getFirstValue(
    roomData?.Inclusion,
    roomData?.MealType,
    booking?.HotelRoomsDetails?.[0]?.MealType,
  );

  const roomPromotion = getFirstValue(
    roomData?.RoomPromotion?.[0],
    roomData?.RoomPromotions?.[0],
    roomData?.Promotion,
  );

  const roomDescription = getFirstValue(
    roomData?.RoomDescription,
    roomData?.Description,
    roomData?.RoomInfo,
    booking?.HotelRoomsDetails?.[0]?.RoomDescription,
    booking?.HotelRoomsDetails?.[0]?.Description,
  );

  const amenities = useMemo(() => {
    const list =
      roomData?.Amenities ||
      roomData?.RoomAmenities ||
      roomData?.amenities ||
      hotel?.amenities ||
      hotel?.HotelFacilities ||
      hotelResult?.HotelFacilities ||
      [];

    if (Array.isArray(list)) return list.filter(Boolean);

    if (typeof list === "string") {
      return list
        .split("|")
        .join(",")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }, [roomData, hotel, hotelResult]);

  const hotelNorms = useMemo(() => {
    const norms =
      hotelResult?.HotelNorms ||
      hotel?.HotelNorms ||
      hotel?.hotel_norms ||
      roomData?.HotelNorms ||
      booking?.HotelNorms ||
      [];

    return normalizeArray(norms);
  }, [hotelResult, hotel, roomData, booking]);

  const bookingTerms = useMemo(() => {
    return normalizeArray(
      booking?.TermsAndConditions ||
        booking?.BookingTermsAndConditions ||
        booking?.TermsConditions ||
        booking?.Terms ||
        roomData?.TermsAndConditions ||
        hotelResult?.TermsAndConditions,
    );
  }, [booking, roomData, hotelResult]);

  const specialRequest = getFirstValue(
    booking?.SpecialRequest,
    booking?.SpecialServiceRequest,
    booking?.SSR,
    savedData?.specialRequest,
  );

  const remarks = getFirstValue(
    booking?.Remark,
    booking?.Remarks,
    booking?.HotelRemarks,
    roomData?.Remarks,
  );

  const agentRemarks = getFirstValue(
    booking?.AgentRemark,
    booking?.AgentRemarks,
    savedData?.agentRemarks,
  );

  const agencyName = getFirstValue(
    booking?.AgencyName,
    booking?.AgentName,
    booking?.AgencyDetails?.Name,
    savedData?.agency?.name,
    state?.agency?.name,
  );

  const agencyAddress = getFirstValue(
    booking?.AgencyAddress,
    booking?.AgencyDetails?.Address,
    savedData?.agency?.address,
    state?.agency?.address,
  );

  const agencyCity = getFirstValue(
    booking?.AgencyCity,
    booking?.AgencyDetails?.City,
    savedData?.agency?.city,
    state?.agency?.city,
  );

  const contactPhone = getFirstValue(
    booking?.AgencyPhone,
    booking?.Phone,
    booking?.ContactNo,
    booking?.AgencyDetails?.Phone,
    savedData?.agency?.phone,
    state?.agency?.phone,
  );

  const contactEmail = getFirstValue(
    booking?.AgencyEmail,
    booking?.Email,
    booking?.AgencyDetails?.Email,
    savedData?.agency?.email,
    state?.agency?.email,
  );

  const hasAgencyData =
    agencyName || agencyAddress || agencyCity || contactPhone || contactEmail;

  const hasHotelData = hotelName || hotelAddress || hotelCity;

  const waitForPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(
      `Hotel Voucher - ${confirmationNo || "Booking"}`,
    );

    const body = encodeURIComponent(
      `Hotel Voucher

Hotel: ${hotelName || "N/A"}
Confirmation No: ${confirmationNo || "N/A"}
Check In: ${formatDate(checkIn)}
Check Out: ${formatDate(checkOut)}`,
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleGeneratePdf = async () => {
    if (!voucherRef.current) return;

    try {
      setPdfLoading(true);
      setPdfCaptureMode(true);

      await document.fonts?.ready;
      await waitForPaint();

      const voucherElement = voucherRef.current;

      const canvas = await html2canvas(voucherElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0b0f14",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: voucherElement.scrollWidth,
        windowHeight: voucherElement.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 6;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let remainingHeight = imgHeight;
      let yPosition = margin;

      pdf.setFillColor(11, 15, 20);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(imgData, "PNG", margin, yPosition, usableWidth, imgHeight);

      remainingHeight -= usableHeight;

      while (remainingHeight > 0) {
        pdf.addPage();
        yPosition = margin - (imgHeight - remainingHeight);

        pdf.setFillColor(11, 15, 20);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.addImage(imgData, "PNG", margin, yPosition, usableWidth, imgHeight);

        remainingHeight -= usableHeight;
      }

      pdf.save(`Hotel-Voucher-${confirmationNo || "Booking"}.pdf`);
    } catch (error) {
      console.error("PDF GENERATE ERROR:", error);
      alert("Unable to generate PDF. Please try again.");
    } finally {
      setPdfCaptureMode(false);
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] py-10 md:py-24 px-3 font-[var(--font-body)] text-[var(--text-main)]">
      <style>
        {`
          .voucher-wrapper {
            width: 100%;
            max-width: 1050px;
            margin: 0 auto;
            background: var(--bg-card);
            border: 1px solid rgba(201, 162, 77, 0.28);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.45);
          }

          .voucher-wrapper.pdf-capture {
            border-radius: 0;
            box-shadow: none;
          }

          .voucher-top {
            background: linear-gradient(90deg, var(--bg-primary), var(--bg-via), var(--bg-secondary));
            color: var(--text-main);
            padding: 16px 20px;
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid rgba(201, 162, 77, 0.25);
          }

          .voucher-title {
            font-family: var(--font-heading);
            font-size: 28px;
            line-height: 1.2;
            color: var(--gold-main);
            letter-spacing: 0.5px;
            white-space: nowrap;
          }

          .voucher-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 10px;
            font-size: 14px;
          }

          .voucher-actions button {
            text-decoration: underline;
            text-underline-offset: 4px;
            color: var(--gold-soft);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: 0.2s ease;
            white-space: nowrap;
          }

          .voucher-actions button:hover {
            color: #ffffff;
          }

          .voucher-actions button:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .voucher-gold {
            color: var(--gold-main);
            font-weight: 700;
          }

          .voucher-row {
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }

          .voucher-heading {
            background: linear-gradient(90deg, rgba(248, 222, 130, 0.14), rgba(234, 168, 42, 0.08));
            color: var(--gold-main);
            font-weight: 800;
            padding: 10px 14px;
            border-bottom: 1px solid rgba(201, 162, 77, 0.22);
          }

          .voucher-cell {
            padding: 12px 14px;
            color: var(--text-muted);
            line-height: 1.55;
          }

          .voucher-cell strong,
          .voucher-cell b {
            color: var(--text-main);
          }

          .voucher-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1.35fr;
            align-items: stretch;
          }

          .voucher-grid-2 > div:first-child {
            border-right: 1px solid rgba(255, 255, 255, 0.08);
          }

          .date-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 14px;
            align-items: start;
          }

          .date-item {
            display: flex;
            gap: 6px;
            align-items: baseline;
            flex-wrap: wrap;
          }

          .table-scroll {
            width: 100%;
            overflow-x: auto;
          }

          .voucher-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          .voucher-table th {
            background: linear-gradient(90deg, rgba(248, 222, 130, 0.14), rgba(234, 168, 42, 0.08));
            color: var(--gold-main);
            font-weight: 800;
            text-align: left;
            padding: 10px 12px;
            border: 1px solid rgba(201, 162, 77, 0.22);
            vertical-align: middle;
          }

          .voucher-table td {
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            vertical-align: top;
            color: var(--text-muted);
            line-height: 1.55;
          }

          .sno-col {
            width: 64px;
            text-align: center !important;
          }

          .guest-col {
            width: 230px;
          }

          .sno-cell {
            text-align: center;
            vertical-align: middle !important;
            color: #ffffff !important;
            font-weight: 700;
          }

          .guest-cell {
            vertical-align: middle !important;
            word-break: break-word;
          }

          .room-name {
            color: #ffffff;
            font-weight: 800;
            font-size: 16px;
            line-height: 1.35;
          }

          .terms-list,
          .policy-list {
            padding-left: 42px;
            padding-right: 18px;
            margin: 14px 0 4px;
            line-height: 1.55;
          }

          .terms-list li,
          .policy-list li {
            padding-left: 4px;
            margin-bottom: 6px;
          }

          .room-description {
            margin-top: 20px;
          }

          .room-description p {
            margin-bottom: 10px;
          }

          .red-text {
            color: #ff5c5c;
            font-weight: 800;
          }

          .gold-link {
            color: var(--gold-soft);
            text-decoration: underline;
            text-underline-offset: 4px;
          }

          .back-btn {
            background: linear-gradient(90deg, var(--color-start), var(--color-end));
            color: #000000;
            border-radius: 14px;
            padding: 10px 22px;
            font-weight: 800;
            box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          }

          .pdf-capture .no-print {
            display: none !important;
          }

          .pdf-capture .voucher-top {
            grid-template-columns: 1fr;
          }

          @media (max-width: 768px) {
            .voucher-wrapper {
              border-radius: 18px;
            }

            .voucher-top {
              grid-template-columns: 1fr;
              align-items: flex-start;
            }

            .voucher-title {
              font-size: 24px;
            }

            .voucher-actions {
              justify-content: flex-start;
              font-size: 13px;
            }

            .voucher-grid-2 {
              grid-template-columns: 1fr;
            }

            .voucher-grid-2 > div:first-child {
              border-right: none;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }

            .date-grid {
              grid-template-columns: 1fr;
              gap: 8px;
            }

            .voucher-table {
              min-width: 850px;
            }

            .terms-list,
            .policy-list {
              padding-left: 24px;
              padding-right: 6px;
            }
          }

          @media print {
            html,
            body {
              background: #0b0f14 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .no-print {
              display: none !important;
            }

            .voucher-wrapper {
              max-width: 100% !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: var(--bg-card) !important;
              border: 1px solid rgba(201, 162, 77, 0.28) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .voucher-top {
              grid-template-columns: 1fr !important;
              background: linear-gradient(90deg, var(--bg-primary), var(--bg-via), var(--bg-secondary)) !important;
              color: var(--text-main) !important;
              border-bottom: 1px solid rgba(201, 162, 77, 0.25) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .voucher-heading,
            .voucher-table th {
              background: linear-gradient(90deg, rgba(248, 222, 130, 0.14), rgba(234, 168, 42, 0.08)) !important;
              color: var(--gold-main) !important;
              border-color: rgba(201, 162, 77, 0.22) !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .voucher-cell,
            .voucher-table td {
              color: var(--text-muted) !important;
              border-color: rgba(255, 255, 255, 0.08) !important;
              background: transparent !important;
            }

            .table-scroll {
              overflow: visible !important;
            }

            .voucher-table {
              min-width: 0 !important;
            }

            @page {
              size: A4;
              margin: 8mm;
            }
          }
        `}
      </style>

      <div
        ref={voucherRef}
        className={`voucher-wrapper ${pdfCaptureMode ? "pdf-capture" : ""}`}
      >
        <div className="voucher-top">
          <div className="voucher-title">Hotel Voucher</div>

          <div className="voucher-actions no-print">
            <button onClick={handleEmail}>Email Voucher</button>
            <span className="text-[var(--text-muted)]">|</span>

            <button onClick={handlePrint}>Print Voucher</button>
            <span className="text-[var(--text-muted)]">|</span>

            <button onClick={handleGeneratePdf} disabled={pdfLoading}>
              {pdfLoading ? "Generating..." : "Generate PDF 🧾"}
            </button>
          </div>
        </div>

        {confirmationNo && (
          <section className="voucher-row">
            <div className="voucher-heading">Confirmation No</div>
            <div className="voucher-cell font-semibold text-white">
              {confirmationNo}
            </div>
          </section>
        )}

        {(hasHotelData || hasAgencyData) && (
          <section className="voucher-row voucher-grid-2">
            <div className="voucher-cell">
              <div className="voucher-gold">Hotel Address Details</div>

              {hotelName && (
                <div className="text-white font-semibold mt-1">{hotelName}</div>
              )}

              {(hotelAddress || hotelCity) && (
                <div>
                  {hotelAddress}
                  {hotelCity ? `, ${hotelCity}` : ""}
                </div>
              )}

              {(hotelName || hotelAddress) && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${hotelName} ${hotelAddress}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="gold-link inline-block mt-1"
                >
                  View Map
                </a>
              )}
            </div>

            {hasAgencyData && (
              <div className="voucher-cell">
                <div className="voucher-gold">Agency Address Details</div>

                {agencyName && (
                  <div className="text-white font-semibold mt-1">
                    {agencyName}
                  </div>
                )}

                {agencyAddress && <div>{agencyAddress}</div>}
                {agencyCity && <div>City : {agencyCity}</div>}

                {contactPhone && (
                  <div>
                    Phone :{" "}
                    <a href={`tel:${contactPhone}`} className="gold-link">
                      {contactPhone}
                    </a>
                  </div>
                )}

                {contactEmail && (
                  <div>
                    Email :{" "}
                    <a href={`mailto:${contactEmail}`} className="gold-link">
                      {contactEmail}
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="voucher-row voucher-cell">
          {leadGuestName && (
            <div>
              <span className="voucher-gold">Lead Passenger Name:</span>{" "}
              <span className="text-white">{leadGuestName}</span>
            </div>
          )}

          <div className="date-grid mt-5">
            {checkIn && (
              <div className="date-item">
                <span className="voucher-gold">Check In Date:</span>
                <span className="text-white">{formatDate(checkIn)}</span>
              </div>
            )}

            {checkOut && (
              <div className="date-item">
                <span className="voucher-gold">Check Out Date:</span>
                <span className="text-white">{formatDate(checkOut)}</span>
              </div>
            )}

            {nights !== "N/A" && (
              <div className="date-item">
                <span className="voucher-gold">No of Nights:</span>
                <span className="text-white">{nights}</span>
              </div>
            )}
          </div>
        </section>

        <section className="table-scroll">
          <table className="voucher-table">
            <thead>
              <tr>
                <th className="sno-col">S.No</th>
                <th>Room Type</th>
                <th className="guest-col">Guests Type</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="sno-cell">1</td>

                <td>
                  <div className="room-name">{roomName}</div>

                  {inclusion && <div>Incl : {inclusion}</div>}

                  {roomPromotion && (
                    <div className="red-text mt-1">{roomPromotion}</div>
                  )}

                  {(roomDescription || amenities.length > 0) && (
                    <div className="room-description">
                      {roomDescription && (
                        <>
                          <p>
                            <strong>Room Description:</strong>
                          </p>
                          <p>{roomDescription}</p>
                        </>
                      )}

                      {amenities.length > 0 && (
                        <p>
                          <strong>Amenities</strong> - {amenities.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </td>

                <td className="guest-cell">
                  {(adults.length > 0 || children.length > 0) && (
                    <div className="text-white font-semibold">
                      {adults.length > 0 ? `${adults.length} Adult(s)` : ""}
                      {children.length > 0
                        ? `${adults.length > 0 ? ", " : ""}${
                            children.length
                          } Child`
                        : ""}
                    </div>
                  )}

                  {adultNames && <div>Adults: {adultNames}</div>}
                  {childNames && <div>Children: {childNames}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {specialRequest && (
          <section className="voucher-row">
            <div className="voucher-cell">
              <h2 className="voucher-gold text-lg mb-4">Package Details:</h2>

              <div className="voucher-gold text-sm">
                Special Service Request:
              </div>

              <div className="mt-2">{specialRequest}</div>
            </div>
          </section>
        )}

        {remarks && (
          <section className="voucher-row">
            <div className="voucher-cell">
              <h2 className="voucher-gold text-lg mb-2">Remarks</h2>
              <p>{remarks}</p>
            </div>
          </section>
        )}

        {agentRemarks && (
          <section className="voucher-row">
            <div className="voucher-cell">
              <h2 className="voucher-gold text-lg mb-2">Agent Remarks</h2>
              <p>{agentRemarks}</p>
            </div>
          </section>
        )}

        {bookingTerms.length > 0 && (
          <section className="voucher-row">
            <div className="voucher-cell">
              <h2 className="voucher-gold text-lg">
                Booking Terms & Conditions
              </h2>

              <ul className="terms-list list-disc">
                {bookingTerms.map((term, index) => (
                  <li key={index}>{term}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {hotelNorms.length > 0 && (
          <section className="voucher-row">
            <div className="voucher-cell">
              <h2 className="voucher-gold text-lg">Hotel Policies</h2>

              <ul className="policy-list list-disc">
                {hotelNorms.map((norm, index) => (
                  <li key={index}>{norm}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {(contactPhone || contactEmail) && (
          <section className="voucher-cell">
            <h2 className="voucher-gold text-lg mb-2">Contact Details:</h2>

            {contactPhone && (
              <div>
                Phone :{" "}
                <a href={`tel:${contactPhone}`} className="gold-link">
                  {contactPhone}
                </a>
              </div>
            )}

            {contactEmail && (
              <div>
                Email :{" "}
                <a href={`mailto:${contactEmail}`} className="gold-link">
                  {contactEmail}
                </a>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="no-print max-w-[1050px] mx-auto mt-5 flex justify-end">
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
      </div>
    </div>
  );
};

export default HotelVoucher;
