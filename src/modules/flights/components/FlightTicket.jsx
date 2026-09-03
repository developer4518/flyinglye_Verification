import React from "react";

const safeJSONParse = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeBookingResponse = (res) => {
  return (
    res?.data?.Response?.Response ||
    res?.data?.Response ||
    res?.Response?.Response ||
    res?.Response ||
    res ||
    {}
  );
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatLayover = (arrival, departure) => {
  if (!arrival || !departure) return null;

  const arrivalDate = new Date(arrival);
  const departureDate = new Date(departure);

  if (
    Number.isNaN(arrivalDate.getTime()) ||
    Number.isNaN(departureDate.getTime())
  ) {
    return null;
  }

  const minutes = Math.floor(
    (departureDate.getTime() - arrivalDate.getTime()) / 60000,
  );

  if (minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
};

const getPaxType = (type) => {
  if (Number(type) === 1) return "Adult";
  if (Number(type) === 2) return "Child";
  if (Number(type) === 3) return "Infant";

  return "Passenger";
};

const getPassengerName = (passenger) =>
  `${passenger?.Title || ""} ${passenger?.FirstName || ""} ${
    passenger?.LastName || ""
  }`
    .replace(/\s+/g, " ")
    .trim();

const FlightTicket = ({ booking, pricing, storedData }) => {
  const normalizedBooking = normalizeBookingResponse(booking);

  const itinerary = normalizedBooking?.FlightItinerary || {};

  const passengers = toArray(itinerary?.Passenger);
  const segments = toArray(itinerary?.Segments);

  /*
   * PassengerDetails page ka saved bookingData.
   * Seat / meal / baggage selection yahan fallback ke liye use hoga.
   */
  const bookingData = safeJSONParse(
    localStorage.getItem("bookingData"),
    {},
  );

  const flightBookingData =
    storedData ||
    safeJSONParse(localStorage.getItem("flightBookingData"), {});

  const pricingData =
    pricing ||
    flightBookingData?.pricing ||
    {};

  const selectedSeats = bookingData?.selectedSeats || [];
  const selectedMeals = bookingData?.selectedMeals || [];
  const selectedBaggage = bookingData?.selectedBaggage || [];

  const pnr =
    itinerary?.PNR ||
    normalizedBooking?.PNR ||
    normalizedBooking?.Response?.PNR ||
    "N/A";

  const bookingId =
    itinerary?.BookingId ||
    normalizedBooking?.BookingId ||
    normalizedBooking?.Response?.BookingId ||
    "N/A";

  const hasTicket = passengers.some(
    (passenger) =>
      passenger?.Ticket?.TicketNumber ||
      passenger?.TicketNumber,
  );

  const status = hasTicket ? "Confirmed" : "Booking Confirmed";

  const issueDate =
    passengers.find((passenger) => passenger?.Ticket?.IssueDate)
      ?.Ticket?.IssueDate ||
    itinerary?.InvoiceCreatedOn ||
    itinerary?.CreatedOn ||
    null;

  const flightFare = Number(pricingData?.flightFare || 0);
  const seatPrice = Number(pricingData?.seatPrice || 0);
  const mealPrice = Number(pricingData?.mealPrice || 0);
  const baggagePrice = Number(pricingData?.baggagePrice || 0);
  const convenienceFee = Number(pricingData?.convenienceFee || 0);

  const feeAndSurcharge =
    seatPrice +
    mealPrice +
    baggagePrice +
    convenienceFee;

  const totalFare = Number(
    pricingData?.totalPrice ||
      flightFare + feeAndSurcharge,
  );

  const getSeat = (passengerIndex) => {
    const selected =
      selectedSeats.find(
        (item) => item?.PassengerIndex === passengerIndex,
      ) || selectedSeats?.[passengerIndex];

    return selected?.Code || "--";
  };

  const getMeal = (passengerIndex) => {
    const selected =
      selectedMeals.find(
        (item) => item?.PassengerIndex === passengerIndex,
      ) || selectedMeals?.[passengerIndex];

    return (
      selected?.AirlineDescription ||
      selected?.Description ||
      selected?.Code ||
      "--"
    );
  };

  const getBaggage = (passengerIndex, segment) => {
    const selected =
      selectedBaggage.find(
        (item) => item?.PassengerIndex === passengerIndex,
      ) || selectedBaggage?.[passengerIndex];

    if (selected?.Weight) {
      return `${selected.Weight} KG`;
    }

    if (selected?.Description) {
      return selected.Description;
    }

    return segment?.Baggage || "--";
  };

  return (
    <>
      <style>{`
        /*
         * IMPORTANT:
         * All styles are prefixed with flight-ticket-
         * so normal website CSS will not conflict.
         */

        .flight-ticket-print-root {
          display: none;
          font-family: Arial, Helvetica, sans-serif;
          color: #111;
          background: #fff;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html,
          body {
            background: white !important;
          }

          body * {
            visibility: hidden !important;
          }

          .flight-ticket-print-root,
          .flight-ticket-print-root * {
            visibility: visible !important;
          }

          .flight-ticket-print-root {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          .flight-ticket-page {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            border: 1px solid #cfd6df;
            padding: 5mm;
            box-sizing: border-box;
            background: white;
            font-size: 9px;
            line-height: 1.25;
          }

          .flight-ticket-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .flight-ticket-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: start;
            gap: 10px;
            margin-bottom: 8px;
          }

          .flight-ticket-company {
            font-size: 9px;
            line-height: 1.4;
          }

          .flight-ticket-company-name {
            font-weight: 700;
            font-size: 11px;
            margin-bottom: 2px;
          }

          .flight-ticket-title {
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            padding-top: 8px;
          }

          .flight-ticket-status-box {
            text-align: right;
          }

          .flight-ticket-status {
            display: inline-block;
            border: 1px solid #59a444;
            color: #4a8d39;
            border-radius: 5px;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 5px;
          }

          .flight-ticket-pnr {
            font-weight: 700;
            font-size: 11px;
          }

          .flight-ticket-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 7px;
          }

          .flight-ticket-table th,
          .flight-ticket-table td {
            border: 1px solid #ccd5df;
            padding: 5px 6px;
            text-align: left;
            vertical-align: top;
          }

          .flight-ticket-table th {
            font-weight: 700;
            background: #fafafa;
          }

          .flight-ticket-section {
            border: 1px solid #ccd5df;
            margin-top: 9px;
          }

          .flight-ticket-section-heading {
            padding: 5px 6px;
            font-weight: 700;
            border-bottom: 1px solid #ccd5df;
          }

          .flight-ticket-flight-header {
            display: grid;
            grid-template-columns: 190px 1fr 1fr;
            font-weight: 700;
            border-bottom: 1px solid #ccd5df;
            padding: 5px 6px;
          }

          .flight-ticket-segment {
            display: grid;
            grid-template-columns: 190px 1fr 36px 1fr;
            gap: 6px;
            align-items: center;
            padding: 8px;
          }

          .flight-ticket-airline-name {
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 3px;
          }

          .flight-ticket-airport-code {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 3px;
          }

          .flight-ticket-airport-name {
            font-size: 9px;
            margin-bottom: 3px;
          }

          .flight-ticket-time {
            font-weight: 700;
          }

          .flight-ticket-plane {
            text-align: center;
            font-size: 16px;
          }

          .flight-ticket-arrival {
            text-align: right;
          }

          .flight-ticket-layover {
            border-top: 1px solid #ccd5df;
            border-bottom: 1px solid #ccd5df;
            text-align: center;
            font-weight: 700;
            padding: 5px;
          }

          .flight-ticket-ancillary-heading {
            display: grid;
            grid-template-columns: 1fr 250px;
            border-bottom: 1px solid #ccd5df;
          }

          .flight-ticket-ancillary-heading > div {
            padding: 5px;
            text-align: center;
            font-weight: 700;
          }

          .flight-ticket-ancillary-heading > div:first-child {
            border-right: 1px solid #ccd5df;
          }

          .flight-ticket-ancillary-row {
            display: grid;
            grid-template-columns: 105px 1fr 150px;
            border-bottom: 1px solid #ccd5df;
          }

          .flight-ticket-ancillary-row:last-child {
            border-bottom: 0;
          }

          .flight-ticket-route {
            padding: 8px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            border-right: 1px solid #ccd5df;
          }

          .flight-ticket-services {
            padding: 7px;
          }

          .flight-ticket-passenger-name {
            font-weight: 700;
            margin-bottom: 6px;
          }

          .flight-ticket-service-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
          }

          .flight-ticket-service {
            border-right: 1px solid #e1e5ea;
            min-height: 36px;
            padding-right: 4px;
          }

          .flight-ticket-service:last-child {
            border-right: 0;
          }

          .flight-ticket-service-title {
            font-weight: 700;
            margin-bottom: 2px;
          }

          .flight-ticket-barcode {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 7px;
          }

          .flight-ticket-barcode-box {
            width: 105px;
            height: 28px;
            border: 1px solid #222;
            position: relative;
            overflow: hidden;
            background:
              repeating-linear-gradient(
                90deg,
                #000 0px,
                #000 2px,
                transparent 2px,
                transparent 4px,
                #000 4px,
                #000 5px,
                transparent 5px,
                transparent 8px
              );
          }

          .flight-ticket-bottom {
            display: grid;
            grid-template-columns: 1fr 235px;
            border: 1px solid #ccd5df;
            margin-top: 9px;
          }

          .flight-ticket-general {
            padding: 8px;
            border-right: 1px solid #ccd5df;
          }

          .flight-ticket-general-title {
            font-weight: 700;
            text-decoration: underline;
            font-style: italic;
            margin-bottom: 6px;
          }

          .flight-ticket-general ul {
            margin: 0;
            padding-left: 15px;
          }

          .flight-ticket-general li {
            margin-bottom: 4px;
          }

          .flight-ticket-payment-title {
            font-weight: 700;
            padding: 6px;
            border-bottom: 1px solid #ccd5df;
          }

          .flight-ticket-payment-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 7px;
            border-bottom: 1px solid #ccd5df;
          }

          .flight-ticket-payment-row:last-child {
            border-bottom: 0;
            font-weight: 700;
          }
        }
      `}</style>

      <div className="flight-ticket-print-root">
        <div className="flight-ticket-page">
          {/* ================= HEADER ================= */}

          <div className="flight-ticket-header flight-ticket-no-break">
            <div className="flight-ticket-company">
              <div className="flight-ticket-company-name">FLYING LYTE</div>

              <div>
                316 Basement Gagan Vihar Gagan Vihar New Delhi East Delhi
              </div>

              <div>Delhi</div>

              <div>Contact No: 9999055591</div>
            </div>

            <div className="flight-ticket-title">E-Ticket</div>

            <div className="flight-ticket-status-box">
              <div className="flight-ticket-status">{status}</div>

              <div className="flight-ticket-pnr">
                PNR: {pnr}
              </div>

              <div>
                Issued Date: {formatDateTime(issueDate)}
              </div>

              <div style={{ marginTop: 2 }}>
                Booking ID: {bookingId}
              </div>
            </div>
          </div>

          {/* ================= PASSENGERS ================= */}

          <table className="flight-ticket-table flight-ticket-no-break">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Passenger Type</th>
                <th>E-Ticket Number</th>
                <th>Frequent Flyer No.</th>
                <th>GST No.</th>
              </tr>
            </thead>

            <tbody>
              {passengers.map((passenger, index) => (
                <tr key={index}>
                  <td>
                    {passenger?.Title || ""}{" "}
                    {passenger?.FirstName || "--"}
                  </td>

                  <td>{passenger?.LastName || "--"}</td>

                  <td>{getPaxType(passenger?.PaxType)}</td>

                  <td>
                    {passenger?.Ticket?.TicketNumber ||
                      passenger?.TicketNumber ||
                      "--"}
                  </td>

                  <td>
                    {passenger?.FFAirlineCode ||
                      passenger?.FFNumber ||
                      "--"}
                  </td>

                  <td>
                    {passenger?.GSTCompanyAddress ||
                      passenger?.GSTNumber ||
                      "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ================= FLIGHT DETAILS ================= */}

          <div className="flight-ticket-section flight-ticket-no-break">
            <div className="flight-ticket-flight-header">
              <div>Flight Details</div>
              <div>Departure</div>
              <div style={{ textAlign: "right" }}>Arrival</div>
            </div>

            <div className="flight-ticket-section-heading">
              Departure Flight
            </div>

            {segments.map((segment, index) => {
              const nextSegment = segments[index + 1];

              const layover = nextSegment
                ? formatLayover(
                    segment?.Destination?.ArrTime,
                    nextSegment?.Origin?.DepTime,
                  )
                : null;

              return (
                <React.Fragment key={index}>
                  <div className="flight-ticket-segment">
                    <div>
                      <div className="flight-ticket-airline-name">
                        {segment?.Airline?.AirlineName || "Airline"}{" "}
                        {segment?.Airline?.AirlineCode || ""}{" "}
                        {segment?.Airline?.FlightNumber || ""}
                      </div>

                      <div>
                        Economy
                        {segment?.Airline?.FareClass
                          ? `, Class ${segment.Airline.FareClass}`
                          : ""}
                      </div>

                      <div>
                        Aircraft: {segment?.Craft || "--"}
                      </div>

                      <div>
                        Operating Carrier:{" "}
                        {segment?.Airline?.OperatingCarrier || "--"}
                      </div>

                      <div style={{ fontWeight: 700 }}>
                        Airline PNR: {pnr}
                      </div>
                    </div>

                    <div>
                      <div className="flight-ticket-airport-code">
                        {segment?.Origin?.Airport?.AirportCode || "--"}
                      </div>

                      <div className="flight-ticket-airport-name">
                        (
                        {segment?.Origin?.Airport?.AirportName ||
                          segment?.Origin?.Airport?.CityName ||
                          "--"}
                        )
                      </div>

                      {segment?.Origin?.Airport?.Terminal && (
                        <div>
                          Terminal:{" "}
                          {segment.Origin.Airport.Terminal}
                        </div>
                      )}

                      <div className="flight-ticket-time">
                        {formatDateTime(segment?.Origin?.DepTime)}
                      </div>
                    </div>

                    <div className="flight-ticket-plane">✈</div>

                    <div className="flight-ticket-arrival">
                      <div className="flight-ticket-airport-code">
                        {segment?.Destination?.Airport?.AirportCode ||
                          "--"}
                      </div>

                      <div className="flight-ticket-airport-name">
                        (
                        {segment?.Destination?.Airport?.AirportName ||
                          segment?.Destination?.Airport?.CityName ||
                          "--"}
                        )
                      </div>

                      {segment?.Destination?.Airport?.Terminal && (
                        <div>
                          Terminal:{" "}
                          {segment.Destination.Airport.Terminal}
                        </div>
                      )}

                      <div className="flight-ticket-time">
                        {formatDateTime(
                          segment?.Destination?.ArrTime,
                        )}
                      </div>
                    </div>
                  </div>

                  {layover && (
                    <div className="flight-ticket-layover">
                      ---------- Layover : {layover},{" "}
                      {segment?.Destination?.Airport?.CityName ||
                        segment?.Destination?.Airport?.AirportCode ||
                        ""}
                      {" ----------"}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ================= ANCILLARY ================= */}

          <div className="flight-ticket-section flight-ticket-no-break">
            <div className="flight-ticket-ancillary-heading">
              <div>Ancillary Details</div>
              <div>Barcode</div>
            </div>

            <div className="flight-ticket-section-heading">
              Departure Flight
            </div>

            {segments.map((segment, segmentIndex) =>
              passengers.map((passenger, passengerIndex) => (
                <div
                  className="flight-ticket-ancillary-row"
                  key={`${segmentIndex}-${passengerIndex}`}
                >
                  <div className="flight-ticket-route">
                    <div>
                      {segment?.Origin?.Airport?.AirportCode || "--"} -{" "}
                      {segment?.Destination?.Airport?.AirportCode ||
                        "--"}
                      <br />
                      {segment?.Airline?.AirlineCode || ""}{" "}
                      {segment?.Airline?.FlightNumber || ""}
                    </div>
                  </div>

                  <div className="flight-ticket-services">
                    <div className="flight-ticket-passenger-name">
                      {getPassengerName(passenger)}
                    </div>

                    <div className="flight-ticket-service-grid">
                      <div className="flight-ticket-service">
                        <div className="flight-ticket-service-title">
                          🧳 Baggage
                        </div>

                        <div>Cabin: --</div>

                        <div>
                          Check-In:{" "}
                          {getBaggage(
                            passengerIndex,
                            segment,
                          )}
                        </div>

                        <div>Excess: --</div>
                      </div>

                      <div className="flight-ticket-service">
                        <div className="flight-ticket-service-title">
                          💺 Seat
                        </div>

                        <div>{getSeat(passengerIndex)}</div>
                      </div>

                      <div className="flight-ticket-service">
                        <div className="flight-ticket-service-title">
                          🍴 Meal
                        </div>

                        <div>{getMeal(passengerIndex)}</div>
                      </div>

                      <div className="flight-ticket-service">
                        <div className="flight-ticket-service-title">
                          ⭐ Special Service
                        </div>

                        <div>--</div>
                      </div>
                    </div>
                  </div>

                  <div className="flight-ticket-barcode">
                    {passenger?.Ticket?.TicketNumber ||
                    passenger?.TicketNumber ? (
                      <div
                        className="flight-ticket-barcode-box"
                        title="Ticket barcode area"
                      />
                    ) : (
                      <span>--</span>
                    )}
                  </div>
                </div>
              )),
            )}
          </div>

          {/* ================= GENERAL + PAYMENT ================= */}

          <div className="flight-ticket-bottom flight-ticket-no-break">
            <div className="flight-ticket-general">
              <div className="flight-ticket-general-title">
                General Information :
              </div>

              <ul>
                <li>
                  It is mandatory to complete Check-In procedure prior
                  to departure. <strong>Have a safe and pleasant journey.</strong>
                </li>

                <li>
                  Please carry a valid government issued photo ID for
                  airport check-in.
                </li>

                <li>
                  For international travel, please ensure you have a
                  valid passport, applicable visa and transit visa
                  wherever required.
                </li>

                <li>
                  For a safer journey, we recommend travel insurance.
                </li>

                <li>
                  Travel is subject to the airline&apos;s Conditions of
                  Carriage.
                </li>

                <li>
                  Baggage dimensions and allowance may vary depending
                  on airline policies.
                </li>
              </ul>
            </div>

            <div>
              <div className="flight-ticket-payment-title">
                Payment Details
              </div>

              <div className="flight-ticket-payment-row">
                <span>Fare:</span>
                <span>₹ {formatMoney(flightFare)}</span>
              </div>

              <div className="flight-ticket-payment-row">
                <span>K3/GST:</span>
                <span>₹ 0.00</span>
              </div>

              <div className="flight-ticket-payment-row">
                <span>Fee &amp; Surcharge:</span>

                <span>
                  ₹ {formatMoney(feeAndSurcharge)}
                </span>
              </div>

              <div className="flight-ticket-payment-row">
                <span>Total Amount:</span>

                <span>₹ {formatMoney(totalFare)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </>
  );
};

export default FlightTicket;