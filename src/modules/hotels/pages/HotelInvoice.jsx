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

const getAgencyData = (booking, saved) => {
  return (
    booking?.AgencyDetails ||
    booking?.AgencyDetail ||
    booking?.AgentDetails ||
    booking?.AgentDetail ||
    booking?.InvoiceTo ||
    booking?.CustomerDetails ||
    saved?.agencyDetails ||
    saved?.agentDetails ||
    {}
  );
};

const getSupplierData = (booking) => {
  return (
    booking?.SupplierDetails ||
    booking?.SupplierDetail ||
    booking?.TboDetails ||
    booking?.TBOInvoiceDetails ||
    booking?.InvoiceFrom ||
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

  const agencyData = useMemo(
    () => getAgencyData(booking, savedData),
    [booking, savedData],
  );

  const supplierData = useMemo(() => getSupplierData(booking), [booking]);

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
    `MW/2627/${booking?.BookingId || bookingId || "INV"}`;

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
    ) || Math.round(netAmount || gross || 0);

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

  const supplierName =
    supplierData?.CompanyName ||
    supplierData?.Name ||
    supplierData?.SupplierName ||
    booking?.SupplierName ||
    "TBO Tek Limited";

  const supplierAddress =
    supplierData?.Address ||
    booking?.SupplierAddress ||
    "Regd Office: E-78, South Extn Part-I, New Delhi 110049";

  const supplierCorpAddress =
    supplierData?.CorporateAddress ||
    booking?.SupplierCorporateAddress ||
    "Corp Off: Plot No 728, Udyog Vihar, Phase-V, Gurgaon 122016";

  const supplierEmail =
    supplierData?.Email ||
    booking?.SupplierEmail ||
    "info@travelboutiqueonline.com";

  const supplierWebsite =
    supplierData?.Website ||
    booking?.SupplierWebsite ||
    "www.travelboutiqueonline.com";

  const supplierPhone =
    supplierData?.Phone ||
    supplierData?.Mobile ||
    booking?.SupplierPhone ||
    "0124-4998999";

  const supplierState =
    supplierData?.State || booking?.SupplierState || "Haryana";

  const supplierGstin =
    supplierData?.GSTIN ||
    supplierData?.GSTNumber ||
    booking?.SupplierGSTIN ||
    "06AACCT6259K1ZZ";

  const supplierCin =
    supplierData?.CIN ||
    supplierData?.CINNumber ||
    booking?.SupplierCIN ||
    "L74999DL2006PLC155233";

  const supplierPan =
    supplierData?.PAN ||
    supplierData?.PanNumber ||
    booking?.SupplierPAN ||
    "AACCT6259K";

  const agencyName =
    agencyData?.AgencyName ||
    agencyData?.CompanyName ||
    agencyData?.Name ||
    booking?.AgencyName ||
    booking?.IssuedBy ||
    "FLYINGLYTE1";

  const ownerName =
    agencyData?.OwnerName ||
    agencyData?.ContactPerson ||
    booking?.OwnerName ||
    booking?.CustomerName ||
    "";

  const agencyCity =
    agencyData?.City || agencyData?.city || booking?.AgencyCity || "Delhi";

  const agencyState =
    agencyData?.State || agencyData?.state || booking?.AgencyState || "Delhi";

  const agencyPin =
    agencyData?.PinCode ||
    agencyData?.PIN ||
    agencyData?.Pincode ||
    booking?.AgencyPinCode ||
    "110021";

  const agencyPhone =
    agencyData?.Phone ||
    agencyData?.Mobile ||
    agencyData?.PhoneNumber ||
    booking?.AgencyPhone ||
    booking?.AgencyMobile ||
    "9999055591";

  const agencyEmail =
    agencyData?.Email ||
    agencyData?.EmailId ||
    booking?.AgencyEmail ||
    "flyinglyte@outlook.com";

  const agencyPan =
    agencyData?.PAN ||
    agencyData?.PanNumber ||
    booking?.AgencyPAN ||
    "AALFF0579Q";

  const billedBy =
    booking?.BilledBy || booking?.BillingCompany || "Travelboutique Online";

  const issuedBy =
    booking?.IssuedBy || booking?.AgentCode || agencyName || "FLYINGLYTE1";

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
                  {supplierName}
                </h3>

                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p>{supplierAddress}</p>
                  <p>{supplierCorpAddress}</p>
                  <p>Email: {supplierEmail}</p>
                  <p>Web: {supplierWebsite}</p>
                  <p>Phone: {supplierPhone}</p>
                  <p>State: {supplierState}</p>
                  <p className="text-white font-semibold">
                    GSTIN: {supplierGstin}
                  </p>
                  <p className="text-white font-semibold">
                    CIN Number: {supplierCin}
                  </p>
                  <p className="text-white font-semibold">PAN: {supplierPan}</p>
                </div>
              </div>

              <div className="md:text-right">
                <h3 className="text-xl font-bold text-[var(--gold-main)] mb-3">
                  Invoice To
                </h3>

                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <p className="text-white font-bold">{agencyName}</p>

                  {ownerName && (
                    <p>
                      <span className="font-bold text-white">
                        Owner's Name:
                      </span>{" "}
                      {ownerName}
                    </p>
                  )}

                  <p>{agencyCity}</p>
                  <p>{agencyState}</p>
                  <p>PIN - {agencyPin}</p>

                  <p>
                    <span className="font-bold text-white">Phone:</span>{" "}
                    {agencyPhone}
                  </p>

                  <p>
                    <span className="font-bold text-white">Email:</span>{" "}
                    {agencyEmail}
                  </p>

                  <p>
                    <span className="font-bold text-white">PAN:</span>{" "}
                    {agencyPan}
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
                      {guestName}
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
                      {rooms}
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
                      {nights}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      {formatAmount(rate || gross)}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      {formatAmount(tax)}
                    </td>

                    <td className="p-3 text-right border border-[var(--border-soft)]">
                      {formatAmount(serviceCharges)}
                    </td>

                    <td className="p-3 text-center border border-[var(--border-soft)]">
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
              <div className="text-sm text-[var(--text-muted)] space-y-2">
                <p>
                  <span className="text-white font-bold">Billed By:</span>{" "}
                  {billedBy}
                </p>

                <p>
                  <span className="text-white font-bold">Issued By:</span>{" "}
                  {issuedBy}
                </p>
              </div>

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-5 text-sm space-y-3">
                <AmountRow label="Gross" value={gross} highlight />
                <AmountRow label="Less Commission Earned" value={commission} />
                <AmountRow label="Add TDS" value={tds} />
                <AmountRow label="Add CGST @0%" value={cgst} />
                <AmountRow label="Add SGST @0%" value={sgst} />
                <AmountRow label="Add IGST @18%" value={igst} />

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
                        {sacCode}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {formatAmount(taxableValue)}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {formatAmount(cgst)}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {formatAmount(sgst)}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {formatAmount(igst)}
                      </td>

                      <td className="p-3 text-right border border-[var(--border-soft)]">
                        {formatAmount(gstTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 bg-[var(--bg-secondary)] border border-[var(--border-soft)] rounded-2xl p-5 text-sm text-[var(--text-muted)]">
              <p className="text-[var(--gold-soft)] font-bold mb-2">Note:</p>
              <p>
                This is a system generated invoice. Amounts are shown in{" "}
                {currency} and generated from hotel booking response data.
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
      <span className="text-white">{value || "N/A"}</span>
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
