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

const normalizeArray = (value) => {
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

const getGuestName = (guest) => {
  return `${guest?.Title ? `${guest.Title}. ` : ""}${
    guest?.FirstName || guest?.firstName || ""
  } ${guest?.LastName || guest?.lastName || ""}`.trim();
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
    booking?.BookingId ||
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

  const leadGuestName = getGuestName(leadGuest);

  const adults = guestDetails.filter(
    (g) => Number(g.PaxType) === 1 || Number(g.Age) >= 12,
  );

  const children = guestDetails.filter(
    (g) => Number(g.PaxType) === 2 || Number(g.Age) < 12,
  );

  const adultNames = adults.map(getGuestName).filter(Boolean).join(", ");
  const childNames = children.map(getGuestName).filter(Boolean).join(", ");

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

    return normalizeArray(norms);
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
      `Dear Guest,

Your hotel voucher is ready.

Hotel: ${hotelName}
Confirmation No: ${confirmationNo}
Check In: ${formatDate(checkIn)}
Check Out: ${formatDate(checkOut)}

Regards,
Flyinglyte`,
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleGeneratePdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-(--bg-main) py-26 px-3 font-(--font-body) text-(--text-main)">
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

          .voucher-top {
            background: linear-gradient(90deg, var(--bg-primary), var(--bg-via), var(--bg-secondary));
            color: var(--text-main);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(201, 162, 77, 0.25);
          }

          .voucher-title {
            font-family: var(--font-heading);
            font-size: 28px;
            line-height: 1.2;
            color: var(--gold-main);
            letter-spacing: 0.5px;
          }

          .voucher-actions {
            display: flex;
            align-items: center;
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
          }

          .voucher-actions button:hover {
            color: #ffffff;
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
          }

          .voucher-cell strong,
          .voucher-cell b {
            color: var(--text-main);
          }

          .voucher-grid-2 {
            display: grid;
            grid-template-columns: 1fr 1.35fr;
          }

          .voucher-grid-2 > div:first-child {
            border-right: 1px solid rgba(255, 255, 255, 0.08);
          }

          .date-grid {
            display: grid;
            grid-template-columns: 1.1fr 1.1fr 0.8fr;
            gap: 12px;
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
          }

          .voucher-table td {
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            vertical-align: top;
            color: var(--text-muted);
          }

          .voucher-table .room-name {
            color: #ffffff;
            font-weight: 800;
            font-size: 16px;
          }

          .terms-list {
            padding-left: 75px;
            padding-right: 20px;
            margin: 16px 0;
            line-height: 1.55;
          }

          .policy-list {
            padding-left: 70px;
            padding-right: 20px;
            margin: 16px 0;
            line-height: 1.55;
          }

          .room-description p {
            margin-bottom: 18px;
          }

          .room-description strong {
            font-weight: 800;
            color: #ffffff;
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

          @media (max-width: 768px) {
            .voucher-wrapper {
              border-radius: 18px;
            }

            .voucher-top {
              flex-direction: column;
              align-items: flex-start;
              gap: 10px;
            }

            .voucher-title {
              font-size: 24px;
            }

            .voucher-actions {
              flex-wrap: wrap;
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
            }

            .voucher-table {
              min-width: 850px;
            }

            .table-scroll {
              overflow-x: auto;
            }

            .terms-list,
            .policy-list {
              padding-left: 26px;
              padding-right: 8px;
            }
          }

          @media print {
            body {
              background: #ffffff !important;
            }

            .no-print {
              display: none !important;
            }

            .voucher-wrapper {
              max-width: 100% !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              background: #ffffff !important;
              border: 1px solid #9bb8ca !important;
            }

            .voucher-top {
              background: #0f4c81 !important;
              color: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 6px 8px !important;
            }

            .voucher-title {
              color: #ffffff !important;
              font-family: Arial, sans-serif !important;
              font-size: 22px !important;
            }

            .voucher-heading,
            .voucher-table th {
              background: #eeeeff !important;
              color: #064776 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .voucher-cell,
            .voucher-table td,
            .voucher-row,
            .voucher-wrapper * {
              color: #2d2d2d !important;
              border-color: #9bb8ca !important;
              font-family: Arial, sans-serif !important;
            }

            .voucher-gold {
              color: #064776 !important;
            }

            .red-text {
              color: red !important;
            }

            .gold-link {
              color: #064776 !important;
            }

            @page {
              size: A4;
              margin: 8mm;
            }
          }
        `}
      </style>

      <div className="voucher-wrapper">
        <div className="voucher-top">
          <div className="voucher-title">Hotel Voucher</div>

          <div className="voucher-actions no-print">
            <button onClick={handleEmail}>Email Voucher</button>
            <span className="text-(--text-muted)">|</span>
            <button onClick={handlePrint}>Print Voucher</button>
            <span className="text-(--text-muted)">|</span>
            <button onClick={handleGeneratePdf}>Generate PDF 🧾</button>
          </div>
        </div>

        <section className="voucher-row">
          <div className="voucher-heading">Confirmation No</div>
          <div className="voucher-cell font-semibold text-white">
            {confirmationNo}
          </div>
        </section>

        <section className="voucher-row voucher-grid-2">
          <div className="voucher-cell">
            <div className="voucher-gold">Hotel Address Details</div>
            <div className="text-white font-semibold mt-1">{hotelName}</div>
            <div>
              {hotelAddress}
              {hotelCity ? `, ${hotelCity}` : ""}
            </div>

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
          </div>

          <div className="voucher-cell">
            <div className="voucher-gold">Agency Address Details</div>
            <div className="text-white font-semibold mt-1">{agencyName}</div>
            <div>Delhi</div>
            <div>City : {agencyCity}</div>
            <div>
              Phone :{" "}
              <a href={`tel:${contactPhone}`} className="gold-link">
                {contactPhone}
              </a>
            </div>
            <div>
              Email :{" "}
              <a href={`mailto:${contactEmail}`} className="gold-link">
                {contactEmail}
              </a>
            </div>
          </div>
        </section>

        <section className="voucher-row voucher-cell">
          <div>
            <span className="voucher-gold">Lead Passenger Name:</span>{" "}
            <span className="text-white">{leadGuestName || "N.A."}</span>
          </div>

          <div className="date-grid mt-5">
            <div>
              <span className="voucher-gold">Check In Date:</span>{" "}
              <span className="text-white">{formatDate(checkIn)}</span>
            </div>

            <div>
              <span className="voucher-gold">Check Out Date:</span>{" "}
              <span className="text-white">{formatDate(checkOut)}</span>
            </div>

            <div>
              <span className="voucher-gold">No of Nights:</span>{" "}
              <span className="text-white">{nights}</span>
            </div>
          </div>
        </section>

        <section className="table-scroll">
          <table className="voucher-table">
            <thead>
              <tr>
                <th style={{ width: "64px" }}>S.No</th>
                <th>Room Type</th>
                <th style={{ width: "220px" }}>Guests Type</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="text-center align-middle">1</td>

                <td>
                  <div className="room-name">{roomName}</div>
                  <div>Incl : {inclusion}</div>

                  {roomPromotion && (
                    <div className="red-text mt-1">{roomPromotion}</div>
                  )}

                  <div className="room-description mt-7">
                    <p>
                      <strong>Room Description:</strong>
                    </p>

                    {roomDescription ? (
                      <p>{roomDescription}</p>
                    ) : (
                      <>
                        <p>150 sq feet</p>

                        <p>
                          <strong>Layout</strong> - Bedroom
                        </p>

                        <p>
                          <strong>Internet</strong> - Free WiFi
                        </p>

                        <p>
                          <strong>Entertainment</strong> - LED television with
                          satellite channels
                        </p>

                        <p>
                          <strong>Food and Drink</strong> - Refrigerator and
                          24-hour room service
                        </p>

                        <p>
                          <strong>Sleep</strong> - Bed sheets
                        </p>

                        <p>
                          <strong>Bathroom</strong> - Private bathroom, shower,
                          free toiletries, and towels
                        </p>

                        <p>
                          <strong>Practical</strong> - Desk and desk chair;
                          rollaway beds surcharge available on request
                        </p>

                        <p>
                          <strong>Comfort</strong> - Air conditioning and daily
                          housekeeping
                        </p>

                        <p>
                          <strong>Accessibility</strong> - Wheelchair accessible
                        </p>
                      </>
                    )}

                    {amenities.length > 0 && (
                      <p>
                        <strong>Amenities</strong> - {amenities.join(", ")}
                      </p>
                    )}
                  </div>
                </td>

                <td className="align-middle">
                  <div className="text-white font-semibold">
                    {adults.length || 1} Adult(s)
                    {children.length > 0 ? `, ${children.length} Child` : ""}
                  </div>

                  {adultNames && <div>Adults: {adultNames}</div>}
                  {childNames && <div>Children: {childNames}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="voucher-row">
          <div className="voucher-cell">
            <h2 className="voucher-gold text-lg mb-4">Package Details:</h2>

            <div className="voucher-gold text-sm">
              Special Service Request:
            </div>

            <div className="mt-2">
              {booking?.SpecialRequest || booking?.SSR || "N.A."}
            </div>
          </div>
        </section>

        <section className="voucher-row">
          <div className="voucher-cell">
            <h2 className="voucher-gold text-lg mb-2">Remarks</h2>

            <p>
              {booking?.Remark ||
                booking?.Remarks ||
                "Please note that while your booking had been confirmed and is guaranteed, the rooming list with your name may not be adjusted in the hotel's reservation system until closer to arrival."}
            </p>
          </div>
        </section>

        <section className="voucher-row">
          <div className="voucher-cell">
            <h2 className="voucher-gold text-lg mb-2">Agent Remarks</h2>
            <p>N.a.</p>
          </div>
        </section>

        <section className="voucher-row">
          <div className="voucher-cell">
            <h2 className="voucher-gold text-lg">
              Booking Terms & Conditions
            </h2>

            <ul className="terms-list list-disc">
              <li>
                You must present a photo ID at the time of check in. Hotel may
                ask for credit card or cash deposit for the extra services at
                the time of check in.
              </li>

              <li>
                All extra charges should be collected directly from clients
                prior to departure such as parking, phone calls, room service,
                city tax, etc.
              </li>

              <li>
                We don&apos;t accept any responsibility for additional expenses
                due to the changes or delays in air, road, rail, sea or indeed
                of any other causes, all such expenses will have to be borne by
                passengers.
              </li>

              <li>
                In case of wrong residency & nationality selected by user at
                the time of booking; the supplement charges may be applicable
                and need to be paid to the hotel by guest on check in/check out.
              </li>

              <li>
                Any special request for bed type, early check in, late check
                out, smoking rooms, etc are not guaranteed as subject to
                availability at the time of check in.
              </li>

              <li>
                Early check out will attract full cancellation charges unless
                otherwise specified.
              </li>

              <li>
                In case of a late check-in by the guest, it is essential to
                inform TBO in advance to avoid the booking being marked as a no
                show.
              </li>
            </ul>
          </div>
        </section>

        <section className="voucher-row">
          <div className="voucher-cell">
            <h2 className="voucher-gold text-lg">Hotel Policies</h2>

            {hotelNorms.length > 0 ? (
              <ul className="policy-list list-disc">
                {hotelNorms.map((norm, index) => (
                  <li key={index}>{norm}</li>
                ))}
              </ul>
            ) : (
              <ul className="policy-list list-disc">
                <li>{hotelCity || "India"} hotel policy applies.</li>

                <li>
                  <strong>{roomName}</strong>
                </li>

                <li>CheckIn Time-Begin: 12:00 PM</li>
                <li>CheckIn Time-End: anytime</li>
                <li>CheckOut Time: 12:00 PM</li>

                <li>
                  CheckIn Instructions:
                  <ul className="list-disc ml-8 mt-1">
                    <li>
                      Extra-person charges may apply and vary depending on
                      property policy.
                    </li>
                    <li>
                      Government-issued photo identification and a credit card,
                      debit card, or cash deposit may be required at check-in for
                      incidental charges.
                    </li>
                    <li>
                      Special requests are subject to availability upon check-in
                      and may incur additional charges.
                    </li>
                    <li>
                      This property accepts credit cards, debit cards, mobile
                      payments, and cash.
                    </li>
                    <li>
                      Mobile payment options include Google Pay, Paytm, PhonePe,
                      Amazon Pay, and Cash App.
                    </li>
                    <li>
                      Safety features at this property include a fire
                      extinguisher, a smoke detector, a security system, and a
                      first aid kit.
                    </li>
                  </ul>
                </li>

                <li>
                  Special Instructions: Front desk staff will greet guests on
                  arrival at the property.
                </li>

                <li>Minimum CheckIn Age : 18</li>

                <li>
                  Optional Fees:
                  <ul className="list-disc ml-8 mt-1">
                    <li>
                      Fee for cooked-to-order breakfast: approximately INR 250
                      to 350 for adults, and INR 200 to 300 for children.
                    </li>
                    <li>Pet fee: INR 1200 per pet, per day.</li>
                    <li>Rollaway bed fee: INR 600 per night.</li>
                  </ul>
                </li>

                <li>
                  Cards Accepted: Amazon Pay, Visa, Debit cards, Cash App, Cash,
                  Google Pay, Mastercard, PhonePe, Paytm.
                </li>

                <li>
                  Only dogs and cats are allowed, service animals not allowed,
                  pets allowed, professional property host/manager, no cribs
                  infant beds available.
                </li>

                <li>
                  <strong>
                    City tax and resort fee are to be paid directly at hotel if
                    applicable. Most hotels do not allow unmarried / unrelated
                    couples to check-in. This is at full discretion of the hotel
                    management. No refund would be applicable in case the hotel
                    denies check-in under such circumstances.
                  </strong>
                </li>

                <li>
                  Extra person charges may apply at check-in, as per the
                  property&apos;s policy.
                </li>
              </ul>
            )}
          </div>
        </section>

        <section className="voucher-cell">
          <h2 className="voucher-gold text-lg mb-2">Contact Details:</h2>

          <div>
            Phone :{" "}
            <a href={`tel:${contactPhone}`} className="gold-link">
              {contactPhone}
            </a>
          </div>

          <div>
            Email :{" "}
            <a href={`mailto:${contactEmail}`} className="gold-link">
              {contactEmail}
            </a>
          </div>
        </section>
      </div>

      <div className="no-print max-w-262.5 mx-auto mt-5 flex justify-end">
        <button onClick={() => navigate(-1)} className="back-btn">
          Back
        </button>
      </div>
    </div>
  );
};

export default HotelVoucher;