"use client";

import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useRef } from "react";
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

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return `₹ ${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
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

const HotelInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();
  const invoiceRef = useRef(null);

  const saved = safeJsonParse(localStorage.getItem("hotelBookingData"), {});

  const bookingData =
    location.state?.booking ||
    saved.bookingResponse?.data ||
    saved.bookingResponse?.Data ||
    saved.bookingResponse?.Response ||
    saved.bookingResponse ||
    {};

  const booking =
    bookingData?.data ||
    bookingData?.Data ||
    bookingData?.Response ||
    bookingData ||
    {};

  const hotel =
    location.state?.hotel || saved.hotel || booking?.HotelDetails || {};

  const guestDetails =
    location.state?.guestDetails ||
    saved.guestList ||
    booking?.HotelPassenger ||
    [];

  const savedData = location.state?.savedData || saved || {};

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const roomName = useMemo(() => {
    const name =
      roomData?.Name?.[0] ||
      roomData?.RoomName ||
      roomData?.RoomTypeName ||
      roomData?.RoomType ||
      booking?.HotelRoomsDetails?.[0]?.RoomTypeName ||
      "Room";

    return Array.isArray(name) ? name[0] : name;
  }, [roomData, booking]);

  const hotelName =
    hotel?.hotel_name || hotel?.HotelName || booking?.HotelName || "Hotel";

  const city =
    hotel?.city ||
    hotel?.CityName ||
    booking?.CityName ||
    booking?.HotelCity ||
    "N/A";

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

  const leadGuest = guestDetails?.[0] || {};

  const guestName = `${leadGuest?.Title ? `${leadGuest.Title}. ` : ""}${
    leadGuest?.FirstName || leadGuest?.firstName || ""
  } ${leadGuest?.LastName || leadGuest?.lastName || ""}`.trim();

  const invoiceNo =
    booking?.InvoiceNumber ||
    booking?.InvoiceNo ||
    `MW/2627/${booking?.BookingId || bookingId || "INV"}`;

  const invoiceDate =
    booking?.InvoiceDate ||
    booking?.InvoiceCreatedOn ||
    booking?.BookingDate ||
    new Date();

  const confirmationNo =
    booking?.ConfirmationNo ||
    booking?.HotelConfirmationNo ||
    booking?.TBOConfirmationNo ||
    "N/A";

  const netAmount =
    savedData?.net ||
    booking?.NetAmount ||
    booking?.TotalAmount ||
    booking?.InvoiceAmount ||
    roomData?.TotalFare ||
    0;

  const offeredRate = Number(roomData?.TotalFare || netAmount || 0);
  const tax = Number(roomData?.TotalTax || booking?.TotalTax || 0);
  const commission = Number(booking?.Commission || booking?.CommEarned || 0);
  const tds = Number(booking?.TDS || booking?.Tds || 0);
  const gst = Number(booking?.TotalGSTAmount || booking?.GST || 0);
  const netReceivable = Math.round(Number(netAmount || 0));

  const handleGeneratePdf = async () => {
    if (!invoiceRef.current) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#0b0f14",
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`hotel-invoice-${invoiceNo}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = `Hotel Invoice - ${invoiceNo}`;

    const body = `Dear Guest,%0D%0A%0D%0APlease find your hotel invoice details.%0D%0A%0D%0AHotel: ${hotelName}%0D%0ABooking ID: ${
      booking?.BookingId || bookingId || "N/A"
    }%0D%0AInvoice No: ${invoiceNo}%0D%0AConfirmation No: ${confirmationNo}%0D%0A%0D%0ARegards,%0D%0AFLYINGLYTE`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${body}`;
  };

  if (!booking || Object.keys(booking).length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center text-center px-4 font-[var(--font-body)]">
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          Invoice data not found
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] text-black font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-10 px-3 md:px-8 font-[var(--font-body)]">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            #invoice-print-area,
            #invoice-print-area * {
              visibility: visible;
            }

            #invoice-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }

            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="max-w-6xl mx-auto">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-xl border border-[var(--border-soft)] text-[var(--gold-soft)] hover:bg-white/5 transition font-bold"
          >
            ← Back To Booking
          </button>

          <div className="flex flex-wrap gap-3">
            <InvoiceActionButton onClick={handleGeneratePdf}>
              Generate PDF
            </InvoiceActionButton>

            <InvoiceActionButton onClick={handleEmail}>
              Email
            </InvoiceActionButton>

            <InvoiceActionButton onClick={handlePrint}>
              Print
            </InvoiceActionButton>
          </div>
        </div>

        <div
          ref={invoiceRef}
          id="invoice-print-area"
          className="bg-[var(--bg-card)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-2xl shadow-black/30"
        >
          <div className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] px-5 py-5 border-b border-[var(--border-soft)] flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="font-[var(--font-logo)] text-3xl md:text-4xl tracking-wide">
                <span className="text-[var(--gold-main)]">travel</span>
                <span className="text-[var(--gold-soft)]">boutique</span>
                <span className="text-white">online</span>
              </h1>

              <p className="text-[var(--text-muted)] text-sm mt-1">
                Hotel Invoice
              </p>
            </div>

            <div className="text-sm md:text-right space-y-1">
              <p>
                <span className="text-[var(--text-muted)]">Invoice No:</span>{" "}
                <span className="font-bold text-[var(--gold-soft)]">
                  {invoiceNo}
                </span>
              </p>

              <p>
                <span className="text-[var(--text-muted)]">Invoice Date:</span>{" "}
                <span className="font-bold text-white">
                  {formatDate(invoiceDate)}
                </span>
              </p>

              <p>
                <span className="text-[var(--text-muted)]">
                  TBO Confirmation No:
                </span>{" "}
                <span className="font-bold text-white">{confirmationNo}</span>
              </p>
            </div>
          </div>

          <div className="p-5 md:p-7">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--gold-main)] font-[var(--font-heading)]">
                Invoice
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[var(--border-soft)] pb-6">
              <div>
                <h3 className="text-xl font-bold text-[var(--gold-main)] mb-3">
                  TBO Tek Limited
                </h3>

                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p>Regd Office: E-78, South Extn Part-I,</p>
                  <p>New Delhi 110049</p>
                  <p>Corp Off: Plot No 728, Udyog Vihar</p>
                  <p>Phase-V, Gurgaon 122016</p>
                  <p>Email: info@travelboutiqueonline.com</p>
                  <p>Web: www.travelboutiqueonline.com</p>
                  <p>Phone: 0124-4998999</p>
                  <p>State: Haryana</p>
                  <p className="text-white font-semibold">
                    GSTIN: 06AACCT6259K1ZZ
                  </p>
                  <p className="text-white font-semibold">
                    CIN Number: L74999DL2006PLC155233
                  </p>
                  <p className="text-white font-semibold">PAN: AACCT6259K</p>
                </div>
              </div>

              <div className="md:text-right">
                <h3 className="text-xl font-bold text-[var(--gold-main)] mb-3">
                  Invoice To
                </h3>

                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p className="text-white font-bold">FLYINGLYTE1</p>
                  <p>
                    <span className="font-bold text-white">Owner's Name:</span>{" "}
                    Anu Jain
                  </p>
                  <p>Delhi</p>
                  <p>PIN - 110021</p>
                  <p>
                    <span className="font-bold text-white">Phone:</span>{" "}
                    9999055591
                  </p>
                  <p>
                    <span className="font-bold text-white">Email:</span>{" "}
                    flyinglyte@outlook.com
                  </p>
                  <p>
                    <span className="font-bold text-white">PAN:</span>{" "}
                    AALFF0579Q
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] text-[var(--gold-soft)]">
                  <tr>
                    <th className="p-3 text-left border border-[var(--border-soft)]">
                      Hotel Name
                    </th>
                    <th className="p-3 text-left border border-[var(--border-soft)]">
                      Room Type
                    </th>
                    <th className="p-3 text-left border border-[var(--border-soft)]">
                      PAX Name
                    </th>
                    <th className="p-3 text-center border border-[var(--border-soft)]">
                      Rooms
                    </th>
                    <th className="p-3 text-center border border-[var(--border-soft)]">
                      Nights
                    </th>
                    <th className="p-3 text-right border border-[var(--border-soft)]">
                      Rate
                    </th>
                    <th className="p-3 text-right border border-[var(--border-soft)]">
                      Tax
                    </th>
                    <th className="p-3 text-right border border-[var(--border-soft)]">
                      Service Charges
                    </th>
                    <th className="p-3 text-center border border-[var(--border-soft)]">
                      Currency
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="text-white">
                    <td className="p-3 border border-[var(--border-soft)]">
                      {hotelName}
                    </td>

                    <td className="p-3 border border-[var(--border-soft)]">
                      {roomName}
                    </td>

                    <td className="p-3 border border-[var(--border-soft)]">
                      {guestName || "N/A"}
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
                      1
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
                      {nights}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      {offeredRate.toFixed(2)}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      {tax.toFixed(2)}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      0.00
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
                      INR
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <InfoBox label="City" value={city} />
              <InfoBox label="Check In" value={formatDate(checkIn)} />
              <InfoBox label="Check Out" value={formatDate(checkOut)} />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-sm text-[var(--text-muted)] space-y-2">
                <p>
                  <span className="text-white font-bold">Billed By:</span>{" "}
                  Travelboutique Online
                </p>

                <p>
                  <span className="text-white font-bold">Issued By:</span>{" "}
                  FLYINGLYTE1
                </p>
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-5 text-sm space-y-3">
                <AmountRow label="Gross" value={offeredRate} highlight />
                <AmountRow label="Less Commission Earned" value={commission} />
                <AmountRow label="Add TDS" value={tds} />
                <AmountRow label="Add CGST @0%" value={0} />
                <AmountRow label="Add SGST @0%" value={0} />
                <AmountRow label="Add IGST @18%" value={gst} />

                <div className="border-t border-[var(--border-soft)] pt-3">
                  <AmountRow label="Net Amount" value={netAmount} highlight />

                  <div className="flex justify-between gap-4 text-lg font-bold text-[var(--gold-main)] mt-2">
                    <span>Net Receivable</span>
                    <span>{formatMoney(netReceivable)}</span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] text-right mt-1">
                    Amount in ₹
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-[var(--gold-main)] mb-3">
                GST Details
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)]">
                <table className="w-full text-sm min-w-[750px]">
                  <thead className="bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-via)] to-[var(--bg-secondary)] text-[var(--gold-soft)]">
                    <tr>
                      <th className="p-3 text-left border border-[var(--border-soft)]">
                        Service Description
                      </th>
                      <th className="p-3 text-left border border-[var(--border-soft)]">
                        SAC
                      </th>
                      <th className="p-3 text-right border border-[var(--border-soft)]">
                        Taxable Value
                      </th>
                      <th className="p-3 text-right border border-[var(--border-soft)]">
                        CGST @ 0%
                      </th>
                      <th className="p-3 text-right border border-[var(--border-soft)]">
                        SGST @ 0%
                      </th>
                      <th className="p-3 text-right border border-[var(--border-soft)]">
                        IGST @ 18%
                      </th>
                      <th className="p-3 text-right border border-[var(--border-soft)]">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="text-white">
                      <td className="p-3 border border-[var(--border-soft)]">
                        Transaction Fees
                      </td>

                      <td className="p-3 border border-[var(--border-soft)]">
                        9985
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        0
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        0
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        0
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {gst.toFixed(2)}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {gst.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-5 text-sm text-[var(--text-muted)]">
              <p className="text-[var(--gold-soft)] font-bold mb-2">Note:</p>
              <p>
                This is a system generated invoice. Amounts are shown in INR and
                generated from hotel booking response data.
              </p>
            </div>

            <div className="no-print mt-6 flex flex-wrap justify-end gap-4">
              <button
                onClick={handleGeneratePdf}
                className="text-[var(--gold-main)] underline underline-offset-4 font-bold"
              >
                Generate PDF
              </button>

              <button
                onClick={handleEmail}
                className="text-[var(--gold-main)] underline underline-offset-4 font-bold"
              >
                Email
              </button>

              <button
                onClick={handlePrint}
                className="text-[var(--gold-main)] underline underline-offset-4 font-bold"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceActionButton = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--color-start)] to-[var(--color-end)] text-black font-bold text-sm shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition"
    >
      {children}
    </button>
  );
};

const InfoBox = ({ label, value }) => {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-4">
      <span className="font-bold text-[var(--gold-soft)]">{label}:</span>{" "}
      <span className="text-white">{value}</span>
    </div>
  );
};

const AmountRow = ({ label, value, highlight = false }) => {
  return (
    <div
      className={`flex justify-between gap-4 ${
        highlight ? "text-white font-bold" : "text-[var(--text-muted)]"
      }`}
    >
      <span>{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  );
};

export default HotelInvoice;
