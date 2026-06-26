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

const formatMoney = (value, currency = "INR") => {
  const amount = Number(value || 0);

  if (currency === "INR") {
    return `₹ ${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency} ${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatAmount = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

const getNestedBooking = (data) => {
  return (
    data?.data?.Response ||
    data?.data?.Data ||
    data?.data ||
    data?.Response ||
    data?.Data ||
    data
  );
};

const getRoomData = (saved, booking) => {
  return (
    saved?.prebookData?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    saved?.prebookData?.room ||
    saved?.selectedRoom ||
    saved?.room ||
    booking?.HotelRoomsDetails?.[0] ||
    booking?.HotelRoomsDetail?.[0] ||
    booking?.Rooms?.[0] ||
    {}
  );
};

const getHotelData = (saved, booking, locationHotel) => {
  return (
    locationHotel ||
    saved?.hotel ||
    booking?.HotelDetails ||
    booking?.HotelDetail ||
    booking?.Hotel ||
    {}
  );
};

const getFullName = (guest = {}) => {
  return `${guest?.Title ? `${guest.Title}. ` : ""}${
    guest?.FirstName || guest?.firstName || ""
  } ${guest?.LastName || guest?.lastName || ""}`.trim();
};

const HotelInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingId } = useParams();
  const invoiceRef = useRef(null);

  const saved = safeJsonParse(localStorage.getItem("hotelBookingData"), {});

  const rawBookingData =
    location.state?.fullResponse ||
    location.state?.booking ||
    saved?.bookingResponse ||
    saved?.bookingData ||
    {};

  const booking = getNestedBooking(rawBookingData);
  const savedData = location.state?.savedData || saved || {};

  const hotel = getHotelData(savedData, booking, location.state?.hotel);

  const guestDetails =
    location.state?.guestDetails ||
    saved?.guestList ||
    booking?.HotelPassenger ||
    booking?.HotelPassengers ||
    booking?.PassengerDetails ||
    booking?.Passengers ||
    [];

  const roomData = useMemo(
    () => getRoomData(savedData, booking),
    [savedData, booking],
  );

  const responseData = useMemo(
    () => ({
      rawBookingData,
      booking,
      hotel,
      guestDetails,
      roomData,
      savedData,
      locationState: location.state || {},
    }),
    [
      rawBookingData,
      booking,
      hotel,
      guestDetails,
      roomData,
      savedData,
      location.state,
    ],
  );

  const roomName = useMemo(() => {
    const name =
      roomData?.Name?.[0] ||
      roomData?.RoomName ||
      roomData?.RoomTypeName ||
      roomData?.RoomType ||
      booking?.HotelRoomsDetails?.[0]?.RoomTypeName ||
      booking?.HotelRoomsDetail?.[0]?.RoomTypeName ||
      "Room";

    return Array.isArray(name) ? name[0] : name;
  }, [roomData, booking]);

  const hotelName =
    hotel?.hotel_name ||
    hotel?.HotelName ||
    booking?.HotelName ||
    booking?.HotelDetails?.HotelName ||
    "Hotel";

  const city =
    hotel?.city ||
    hotel?.CityName ||
    hotel?.City ||
    booking?.CityName ||
    booking?.HotelCity ||
    booking?.City ||
    "N/A";

  const checkIn =
    savedData?.checkIn ||
    booking?.CheckInDate ||
    booking?.HotelCheckIn ||
    booking?.CheckIn ||
    booking?.CheckInDateTime;

  const checkOut =
    savedData?.checkOut ||
    booking?.CheckOutDate ||
    booking?.HotelCheckOut ||
    booking?.CheckOut ||
    booking?.CheckOutDateTime;

  const nights =
    Number(booking?.NoOfNights || booking?.Nights || roomData?.Nights) ||
    getNights(checkIn, checkOut);

  const rooms =
    Number(
      booking?.NoOfRooms ||
        booking?.Rooms ||
        booking?.RoomCount ||
        savedData?.guests?.rooms,
    ) || 1;

  const leadGuest =
    guestDetails?.find?.((guest) => guest?.LeadPassenger) ||
    guestDetails?.[0] ||
    {};

  const guestName =
    getFullName(leadGuest) ||
    booking?.GuestName ||
    booking?.LeadPassengerName ||
    "N/A";

  const invoiceNo =
    booking?.InvoiceNumber ||
    booking?.InvoiceNo ||
    booking?.InvoiceId ||
    booking?.InvoiceID ||
    booking?.HotelInvoiceNo ||
    `FL/INV/${booking?.BookingId || bookingId || "HOTEL"}`;

  const invoiceDate =
    booking?.InvoiceDate ||
    booking?.InvoiceCreatedOn ||
    booking?.BookingDate ||
    booking?.CreatedOn ||
    booking?.BookedOn ||
    new Date();

  const confirmationNo =
    booking?.ConfirmationNo ||
    booking?.TBOConfirmationNo ||
    booking?.HotelConfirmationNo ||
    booking?.ConfirmationNumber ||
    booking?.BookingRefNo ||
    booking?.SupplierConfirmationNo ||
    "N/A";

  const currency =
    booking?.Currency ||
    booking?.HotelCurrency ||
    roomData?.Currency ||
    savedData?.currency ||
    "INR";

  const rate =
    Number(
      booking?.Rate ||
        booking?.RoomRate ||
        booking?.BaseFare ||
        booking?.BasePrice ||
        roomData?.BasePrice ||
        roomData?.DayRates?.[0]?.[0]?.BasePrice,
    ) || 0;

  const tax =
    Number(
      booking?.Tax ||
        booking?.TotalTax ||
        booking?.TaxAmount ||
        roomData?.TotalTax ||
        roomData?.Tax,
    ) || 0;

  const serviceCharges =
    Number(
      booking?.ServiceCharge ||
        booking?.ServiceCharges ||
        booking?.TransactionFee ||
        booking?.TransactionFees,
    ) || 0;

  const gross =
    Number(
      booking?.GrossAmount ||
        booking?.Gross ||
        booking?.InvoiceAmount ||
        booking?.TotalAmount ||
        booking?.NetAmount ||
        roomData?.TotalFare,
    ) || 0;

  const commission =
    Number(
      booking?.Commission ||
        booking?.CommEarned ||
        booking?.CommissionEarned ||
        booking?.AgencyCommission,
    ) || 0;

  const tds = Number(booking?.TDS || booking?.Tds || booking?.TDSAmount) || 0;

  const cgst =
    Number(
      booking?.CGST ||
        booking?.CGSTAmount ||
        booking?.GSTDetails?.CGST ||
        booking?.GstDetails?.CGST,
    ) || 0;

  const sgst =
    Number(
      booking?.SGST ||
        booking?.SGSTAmount ||
        booking?.GSTDetails?.SGST ||
        booking?.GstDetails?.SGST,
    ) || 0;

  const igst =
    Number(
      booking?.IGST ||
        booking?.IGSTAmount ||
        booking?.GSTDetails?.IGST ||
        booking?.GstDetails?.IGST ||
        booking?.TotalGSTAmount ||
        booking?.GST,
    ) || 0;

  const gstTotal = cgst + sgst + igst;

  const netAmount =
    Number(
      booking?.NetAmount ||
        booking?.NetPayable ||
        booking?.NetPayableAmount ||
        booking?.PayableAmount ||
        booking?.InvoiceAmount ||
        savedData?.net ||
        gross,
    ) || 0;

  const netReceivable =
    Number(
      booking?.NetReceivable ||
        booking?.ReceivableAmount ||
        booking?.TotalReceivable,
    ) || Number(netAmount || gross || 0);

  const taxableValue =
    Number(
      booking?.TaxableValue ||
        booking?.GSTDetails?.TaxableValue ||
        booking?.GstDetails?.TaxableValue,
    ) || 0;

  const sacCode =
    booking?.SAC ||
    booking?.SacCode ||
    booking?.GSTDetails?.SAC ||
    booking?.GstDetails?.SAC ||
    "9985";

  const companyName = "FLYINGLYTE";
  const companyEmail = "info@flyinglyte.com";
  const companyMobile = "9667455591";
  const companyWebsite = "https://www.flyinglyte.com";
  const companyAddress =
    "316, Basement, Gagan Vihar, Near Preet Vihar Metro Station, Delhi-110051";
  const companyPan = "AALFF0579Q";

  const invoiceToName =
    booking?.CustomerName ||
    booking?.GuestName ||
    booking?.LeadPassengerName ||
    guestName ||
    "Guest";

  const invoiceToEmail =
    leadGuest?.Email ||
    leadGuest?.EmailId ||
    leadGuest?.email ||
    booking?.CustomerEmail ||
    booking?.GuestEmail ||
    booking?.Email ||
    "N/A";

  const invoiceToPhone =
    leadGuest?.Phoneno ||
    leadGuest?.PhoneNo ||
    leadGuest?.Phone ||
    leadGuest?.Mobile ||
    booking?.CustomerPhone ||
    booking?.CustomerMobile ||
    booking?.GuestPhone ||
    booking?.Phone ||
    "N/A";

  const invoiceToAddress =
    booking?.CustomerAddress ||
    booking?.GuestAddress ||
    booking?.Address ||
    booking?.HotelAddress ||
    hotel?.Address ||
    hotel?.address ||
    "N/A";

  const invoiceToCity =
    booking?.CustomerCity ||
    booking?.GuestCity ||
    booking?.CityName ||
    booking?.HotelCity ||
    hotel?.CityName ||
    hotel?.city ||
    "N/A";

  const invoiceToState =
    booking?.CustomerState ||
    booking?.GuestState ||
    booking?.State ||
    hotel?.State ||
    "";

  const invoiceToPin =
    booking?.CustomerPinCode ||
    booking?.CustomerPIN ||
    booking?.GuestPinCode ||
    booking?.PinCode ||
    "";

  const invoiceToPan =
    leadGuest?.PAN ||
    leadGuest?.Pan ||
    leadGuest?.PanNumber ||
    booking?.CustomerPAN ||
    booking?.GuestPAN ||
    booking?.PAN ||
    "N/A";

  const billedBy = booking?.BilledBy || booking?.BillingCompany || companyName;
  const issuedBy = booking?.IssuedBy || booking?.AgentCode || companyName;

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
    }%0D%0AInvoice No: ${invoiceNo}%0D%0AConfirmation No: ${confirmationNo}%0D%0A%0D%0ARegards,%0D%0A${issuedBy}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${body}`;
  };

  if (!booking || Object.keys(booking).length === 0) {
    return (
      <div className="min-h-screen bg-(--bg-main) flex flex-col items-center justify-center text-center px-4 font-(--font-body)">
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          Invoice data not found
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-xl bg-linear-to-r from-start to-end text-black font-bold"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-main) text-(--text-main) py-24 px-3 md:px-8 font-(--font-body)">
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
            className="px-5 py-2 rounded-xl border border-(--border-soft) text-(--gold-soft) hover:bg-white/5 transition font-bold"
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
          className="bg-(--bg-card) border border-(--border-soft) rounded-3xl overflow-hidden shadow-2xl shadow-black/30"
        >
          <div className="bg-linear-to-r from-(--bg-primary) via-(--bg-via) to-(--bg-secondary) px-5 py-5 border-b border-(--border-soft) flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="font-(--font-logo) text-3xl md:text-4xl tracking-wide">
                <span className="text-(--gold-main)">FLYING</span>
                <span className="text-(--gold-soft)">LYTE</span>
              </h1>

              <p className="text-(--text-muted) text-sm mt-1">Hotel Invoice</p>
            </div>

            <div className="text-sm md:text-right space-y-1">
              <p>
                <span className="text-(--text-muted)">Invoice No:</span>{" "}
                <span className="font-bold text-(--gold-soft)">
                  {invoiceNo}
                </span>
              </p>

              <p>
                <span className="text-(--text-muted)">Invoice Date:</span>{" "}
                <span className="font-bold text-white">
                  {formatDate(invoiceDate)}
                </span>
              </p>

              <p>
                <span className="text-(--text-muted)">Confirmation No:</span>{" "}
                <span className="font-bold text-white">{confirmationNo}</span>
              </p>
            </div>
          </div>

          <div className="p-5 md:p-7">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-var[(--font-heading) text-(--gold-main) font-(--font-heading)">
                Invoice
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-(--border-soft) pb-6">
              <div>
                <h3 className="text-xl font-bold text-(--gold-main) mb-3">
                  {companyName}
                </h3>

                <div className="text-sm text-(--text-muted) leading-relaxed">
                  <p>{companyAddress}</p>

                  <p>
                    <span className="font-bold text-white">Email:</span>{" "}
                    <a
                      href={`mailto:${companyEmail}`}
                      className="hover:text-(--gold-main)"
                    >
                      {companyEmail}
                    </a>
                  </p>

                  <p>
                    <span className="font-bold text-white">Mobile:</span>{" "}
                    <a
                      href={`tel:+91${companyMobile}`}
                      className="hover:text-(--gold-main)"
                    >
                      {companyMobile}
                    </a>
                  </p>

                  <p>
                    <span className="font-bold text-white">Website:</span>{" "}
                    <a
                      href={companyWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-(--gold-main)"
                    >
                      {companyWebsite}
                    </a>
                  </p>

                  <p className="text-white font-semibold">PAN: {companyPan}</p>
                </div>
              </div>

              <div className="md:text-right">
                <h3 className="text-xl font-bold text-(--gold-main) mb-3">
                  Invoice To
                </h3>

                <div className="text-sm text-(--text-muted) leading-relaxed">
                  <p className="text-white font-bold">{invoiceToName}</p>

                  {invoiceToAddress !== "N/A" && <p>{invoiceToAddress}</p>}
                  {invoiceToCity !== "N/A" && <p>{invoiceToCity}</p>}
                  {invoiceToState && <p>{invoiceToState}</p>}
                  {invoiceToPin && <p>PIN - {invoiceToPin}</p>}

                  <p>
                    <span className="font-bold text-white">Phone:</span>{" "}
                    {invoiceToPhone}
                  </p>

                  <p>
                    <span className="font-bold text-white">Email:</span>{" "}
                    {invoiceToEmail}
                  </p>

                  <p>
                    <span className="font-bold text-white">PAN:</span>{" "}
                    {invoiceToPan}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-(--border-soft)">
              <table className="w-full text-sm min-w-225">
                <thead className="bg-linear-to-r from-(--bg-primary) via-(--bg-via) to-(--bg-secondary) text-(--gold-soft)">
                  <tr>
                    <th className="p-3 text-left border border-(--border-soft)">
                      Hotel Name
                    </th>
                    <th className="p-3 text-left border border-(--border-soft)">
                      Room Type
                    </th>
                    <th className="p-3 text-left border border-(--border-soft)">
                      PAX Name
                    </th>
                    <th className="p-3 text-center border border-(--border-soft)">
                      Rooms
                    </th>
                    <th className="p-3 text-center border border-(--border-soft)">
                      Nights
                    </th>
                    <th className="p-3 text-right border border-(--border-soft)">
                      Rate
                    </th>
                    <th className="p-3 text-right border border-(--border-soft)">
                      Tax
                    </th>
                    <th className="p-3 text-right border border-(--border-soft)">
                      Service Charges
                    </th>
                    <th className="p-3 text-center border border-(--border-soft)">
                      Currency
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="text-white">
                    <td className="p-3 border border-(--border-soft)">
                      {hotelName}
                    </td>

                    <td className="p-3 border border-(--border-soft)">
                      {roomName}
                    </td>

                    <td className="p-3 border border-(--border-soft)">
                      {guestName}
                    </td>

                    <td className="p-3 text-center border border-(--border-soft)">
                      {rooms}
                    </td>

                    <td className="p-3 text-center border border-(--border-soft)">
                      {nights}
                    </td>

                    <td className="p-3 text-t border border(--border-soft)">
                      {formatAmount(rate || gross)}
                    </td>

                    <td className="p-3 text-right border border-(--border-soft)">
                      {formatAmount(tax)}
                    </td>

                    <td className="p-3 text-right border border-(--border-soft)">
                      {formatAmount(serviceCharges)}
                    </td>

                    <td className="p-3 text-center border border-(--border-soft)">
                      {currency}
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
              <div className="text-sm text-(--text-muted) space-y-2">
                <p>
                  <span className="text-white font-bold">Billed By:</span>{" "}
                  {billedBy}
                </p>

                <p>
                  <span className="text-white font-bold">Issued By:</span>{" "}
                  {issuedBy}
                </p>
              </div>

              <div className="bg-(--bg-secondary) border border-(--border-soft) rounded-2xl p-5 text-sm space-y-3">
                <AmountRow
                  label="Gross"
                  value={gross}
                  currency={currency}
                  highlight
                />

                <AmountRow
                  label="Less Commission Earned"
                  value={commission}
                  currency={currency}
                />

                <AmountRow label="Add TDS" value={tds} currency={currency} />
                <AmountRow
                  label="Add CGST @0%"
                  value={cgst}
                  currency={currency}
                />
                <AmountRow
                  label="Add SGST @0%"
                  value={sgst}
                  currency={currency}
                />
                <AmountRow
                  label="Add IGST @18%"
                  value={igst}
                  currency={currency}
                />

                <div className="border-t border-(--border-soft) pt-3">
                  <AmountRow
                    label="Net Amount"
                    value={netAmount}
                    currency={currency}
                    highlight
                  />

                  <div className="flex justify-between gap-4 text-lg font-bold text-(--gold-main) mt-2">
                    <span>Net Receivable</span>
                    <span>{formatMoney(netReceivable, currency)}</span>
                  </div>

                  <p className="text-xs text-(--text-muted) text-right mt-1">
                    Amount in {currency}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-(--gold-main) mb-3">
                GST Details
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-(--border-soft)">
                <table className="w-full text-sm min-w-187.5">
                  <thead className="bg-linear-to-r from-(--bg-primary) via-(--bg-via) to-(--bg-secondary) text-(--gold-soft)">
                    <tr>
                      <th className="p-3 text-left border border-(--border-soft)">
                        Service Description
                      </th>
                      <th className="p-3 text-left border border-(--border-soft)">
                        SAC
                      </th>
                      <th className="p-3 text-right border border-(--border-soft)">
                        Taxable Value
                      </th>
                      <th className="p-3 text-right border border-(--border-soft)">
                        CGST @ 0%
                      </th>
                      <th className="p-3 text-right border border-(--border-soft)">
                        SGST @ 0%
                      </th>
                      <th className="p-3 text-right border border-(--border-soft)">
                        IGST @ 18
                      </th>
                      <th className="p-3 text-right border border-(--border-soft)">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="text-white">
                      <td className="p-3 border border-(--border-soft)">
                        Transaction Fees
                      </td>

                      <td className="p-3 border border-(--border-soft)">
                        {sacCode}
                      </td>

                      <td className="p-3 text-right border border-(--border-soft)">
                        {formatAmount(taxableValue)}
                      </td>

                      <td className="p-3 text-right border border-(--border-soft)">
                        {formatAmount(cgst)}
                      </td>

                      <td className="p-3 text-right border border-(--border-soft)">
                        {formatAmount(sgst)}
                      </td>

                      <td className="p-3 text-right border border-(--border-soft)">
                        {formatAmount(igst)}
                      </td>

                      <td className="p-3 text-right border border-(--border-soft)">
                        {formatAmount(gstTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* <div className="mt-8 bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-5 text-sm text-[var(--text-muted)]">
              <p className="text-[var(--gold-soft)] font-bold mb-2">Note:</p>
              <p>
                This is a system generated invoice. Amounts are shown in{" "}
                {currency} and generated from hotel booking response data.
              </p>
            </div> */}

            <div className="no-print mt-6 flex flex-wrap justify-end gap-4">
              <button
                onClick={handleGeneratePdf}
                className="text-(--gold-main) underline underline-offset-4 font-bold"
              >
                Generate PDF
              </button>

              <button
                onClick={handleEmail}
                className="text-(--gold-main) underline underline-offset-4 font-bold"
              >
                Email
              </button>

              <button
                onClick={handlePrint}
                className="text-(--gold-main) underline underline-offset-4 font-bold"
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
      className="px-4 py-2 rounded-xl bg-linear-to-r from-start to-end text-black font-bold text-sm shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition"
    >
      {children}
    </button>
  );
};

const InfoBox = ({ label, value }) => {
  return (
    <div className="bg-(--bg-secondary) border border-(--border-soft) rounded-2xl p-4">
      <span className="font-bold text-(--gold-soft)">{label}:</span>{" "}
      <span className="text-white">{value || "N/A"}</span>
    </div>
  );
};

const AmountRow = ({ label, value, currency = "INR", highlight = false }) => {
  return (
    <div
      className={`flex justify-between gap-4 ${
        highlight ? "text-white font-bold" : "text-(--text-muted)"
      }`}
    >
      <span>{label}</span>
      <span>{formatMoney(value, currency)}</span>
    </div>
  );
};

const ResponseDataBox = ({ title = "Response Data", data }) => {
  return (
    <details className="no-print mt-8 bg-(--bg-card) border border-(--border-soft) rounded-3xl overflow-hidden shadow-xl shadow-black/20">
      <summary className="cursor-pointer px-5 py-4 text-(--gold-main) font-bold bg-linear-to-r from-(--bg-primary) via-(--bg-via) to-(--bg-secondary)">
        {title}
      </summary>

      <div className="border-t border-(--border-soft) p-4">
        <pre className="max-h-150 overflow-auto rounded-2xl bg-black/50 p-4 text-xs leading-relaxed text-green-300 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </details>
  );
};

export default HotelInvoice;
