import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: "#111",
    backgroundColor: "#fff",
  },

  borderBox: {
    borderWidth: 0.7,
    borderColor: "#cfd6df",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  company: {
    width: "33%",
    lineHeight: 1.35,
  },

  companyName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 2,
  },

  title: {
    width: "34%",
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 19,
    paddingTop: 6,
  },

  statusBox: {
    width: "33%",
    textAlign: "right",
    lineHeight: 1.4,
  },

  confirmed: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },

  bold: {
    fontFamily: "Helvetica-Bold",
  },

  table: {
    borderLeftWidth: 0.7,
    borderTopWidth: 0.7,
    borderColor: "#cfd6df",
    marginTop: 5,
  },

  row: {
    flexDirection: "row",
  },

  cell: {
    borderRightWidth: 0.7,
    borderBottomWidth: 0.7,
    borderColor: "#cfd6df",
    padding: 3,
  },

  tableHeader: {
    backgroundColor: "#f5f5f5",
    fontFamily: "Helvetica-Bold",
  },

  section: {
    borderWidth: 0.7,
    borderColor: "#cfd6df",
    marginTop: 8,
  },

  sectionHeading: {
    fontFamily: "Helvetica-Bold",
    padding: 4,
    borderBottomWidth: 0.7,
    borderColor: "#cfd6df",
  },

  segment: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 0.7,
    borderColor: "#cfd6df",
  },

  segmentAirline: {
    width: "31%",
  },

  segmentPoint: {
    width: "27%",
  },

  segmentMiddle: {
    width: "15%",
    textAlign: "center",
    paddingTop: 8,
  },

  arrival: {
    width: "27%",
    textAlign: "right",
  },

  airportCode: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },

  airlineName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginBottom: 2,
  },

  ancillaryRow: {
    flexDirection: "row",
    borderBottomWidth: 0.7,
    borderColor: "#cfd6df",
  },

  route: {
    width: "18%",
    padding: 5,
    borderRightWidth: 0.7,
    borderColor: "#cfd6df",
    fontFamily: "Helvetica-Bold",
  },

  services: {
    width: "62%",
    padding: 5,
    borderRightWidth: 0.7,
    borderColor: "#cfd6df",
  },

  barcode: {
    width: "20%",
    padding: 5,
    textAlign: "center",
  },

  serviceGrid: {
    flexDirection: "row",
    marginTop: 4,
  },

  serviceItem: {
    width: "33.33%",
  },

  bottom: {
    flexDirection: "row",
    marginTop: 8,
    borderWidth: 0.7,
    borderColor: "#cfd6df",
  },

  general: {
    width: "65%",
    padding: 6,
    borderRightWidth: 0.7,
    borderColor: "#cfd6df",
    lineHeight: 1.4,
  },

  payment: {
    width: "35%",
  },

  paymentTitle: {
    fontFamily: "Helvetica-Bold",
    padding: 5,
    borderBottomWidth: 0.7,
    borderColor: "#cfd6df",
  },

  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 4,
    borderBottomWidth: 0.5,
    borderColor: "#ddd",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 4,
    fontFamily: "Helvetica-Bold",
  },
});

const Cell = ({ width, children, bold = false }) => (
  <View style={[styles.cell, { width }]}>
    <Text style={bold ? styles.bold : null}>{children}</Text>
  </View>
);

const FlightTicketPDF = ({
  booking,
  pricing,
  bookingData = {},
}) => {
  const normalized = normalizeBookingResponse(booking);

  const itinerary = normalized?.FlightItinerary || {};

  const passengers = toArray(itinerary?.Passenger);
  const segments = toArray(itinerary?.Segments);

  const pnr =
    itinerary?.PNR ||
    normalized?.PNR ||
    "N/A";

  const bookingId =
    itinerary?.BookingId ||
    normalized?.BookingId ||
    "N/A";

  const issueDate =
    passengers.find((p) => p?.Ticket?.IssueDate)
      ?.Ticket?.IssueDate ||
    itinerary?.InvoiceCreatedOn ||
    itinerary?.CreatedOn;

  const selectedSeats =
    bookingData?.selectedSeats || [];

  const selectedMeals =
    bookingData?.selectedMeals || [];

  const selectedBaggage =
    bookingData?.selectedBaggage || [];

  const getSelected = (list, index) =>
    list.find(
      (item) => item?.PassengerIndex === index,
    ) || list?.[index];

  const flightFare = Number(
    pricing?.flightFare || 0,
  );

  const seatPrice = Number(
    pricing?.seatPrice || 0,
  );

  const mealPrice = Number(
    pricing?.mealPrice || 0,
  );

  const baggagePrice = Number(
    pricing?.baggagePrice || 0,
  );

  const convenienceFee = Number(
    pricing?.convenienceFee || 0,
  );

  const feeAndSurcharge =
    seatPrice +
    mealPrice +
    baggagePrice +
    convenienceFee;

  const totalFare = Number(
    pricing?.totalPrice ||
      flightFare + feeAndSurcharge,
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.company}>
            <Text style={styles.companyName}>
              FLYING LYTE
            </Text>

            <Text>
              316 Basement Gagan Vihar,
              New Delhi East Delhi
            </Text>

            <Text>Delhi</Text>
            <Text>Contact No: 9999055591</Text>
          </View>

          <Text style={styles.title}>
            E-Ticket
          </Text>

          <View style={styles.statusBox}>
            <Text style={styles.confirmed}>
              Confirmed
            </Text>

            <Text style={styles.bold}>
              PNR: {pnr}
            </Text>

            <Text>
              Issued Date:{" "}
              {formatDateTime(issueDate)}
            </Text>

            <Text>
              Booking ID: {bookingId}
            </Text>
          </View>
        </View>

        {/* PASSENGERS */}

        <View style={styles.table}>
          <View
            style={[
              styles.row,
              styles.tableHeader,
            ]}
          >
            <Cell width="16%" bold>
              First Name
            </Cell>

            <Cell width="15%" bold>
              Last Name
            </Cell>

            <Cell width="14%" bold>
              Passenger Type
            </Cell>

            <Cell width="22%" bold>
              E-Ticket Number
            </Cell>

            <Cell width="15%" bold>
              Frequent Flyer
            </Cell>

            <Cell width="18%" bold>
              GST No.
            </Cell>
          </View>

          {passengers.map((passenger, index) => (
            <View style={styles.row} key={index}>
              <Cell width="16%">
                {passenger?.Title || ""}{" "}
                {passenger?.FirstName || "--"}
              </Cell>

              <Cell width="15%">
                {passenger?.LastName || "--"}
              </Cell>

              <Cell width="14%">
                {getPaxType(passenger?.PaxType)}
              </Cell>

              <Cell width="22%">
                {passenger?.Ticket?.TicketNumber ||
                  passenger?.TicketNumber ||
                  "--"}
              </Cell>

              <Cell width="15%">
                {passenger?.FFNumber || "--"}
              </Cell>

              <Cell width="18%">
                {passenger?.GSTNumber || "--"}
              </Cell>
            </View>
          ))}
        </View>

        {/* FLIGHT DETAILS */}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>
            Flight Details
          </Text>

          {segments.map((segment, index) => (
            <View style={styles.segment} key={index}>
              <View style={styles.segmentAirline}>
                <Text style={styles.airlineName}>
                  {segment?.Airline?.AirlineName ||
                    "Airline"}{" "}
                  {segment?.Airline?.AirlineCode ||
                    ""}{" "}
                  {segment?.Airline?.FlightNumber ||
                    ""}
                </Text>

                <Text>
                  Economy
                  {segment?.Airline?.FareClass
                    ? `, Class ${segment.Airline.FareClass}`
                    : ""}
                </Text>

                <Text>
                  Aircraft:{" "}
                  {segment?.Craft || "--"}
                </Text>

                <Text style={styles.bold}>
                  Airline PNR: {pnr}
                </Text>
              </View>

              <View style={styles.segmentPoint}>
                <Text style={styles.airportCode}>
                  {segment?.Origin?.Airport
                    ?.AirportCode || "--"}
                </Text>

                <Text>
                  {segment?.Origin?.Airport
                    ?.AirportName ||
                    segment?.Origin?.Airport
                      ?.CityName ||
                    "--"}
                </Text>

                <Text>
                  {formatDateTime(
                    segment?.Origin?.DepTime,
                  )}
                </Text>
              </View>

              <View style={styles.segmentMiddle}>
                <Text>--------&gt;</Text>
              </View>

              <View style={styles.arrival}>
                <Text style={styles.airportCode}>
                  {segment?.Destination?.Airport
                    ?.AirportCode || "--"}
                </Text>

                <Text>
                  {segment?.Destination?.Airport
                    ?.AirportName ||
                    segment?.Destination?.Airport
                      ?.CityName ||
                    "--"}
                </Text>

                <Text>
                  {formatDateTime(
                    segment?.Destination?.ArrTime,
                  )}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ANCILLARY DETAILS */}

        <View style={styles.section}>
          <Text style={styles.sectionHeading}>
            Ancillary Details
          </Text>

          {segments.map((segment, segmentIndex) =>
            passengers.map(
              (passenger, passengerIndex) => {
                const seat = getSelected(
                  selectedSeats,
                  passengerIndex,
                );

                const meal = getSelected(
                  selectedMeals,
                  passengerIndex,
                );

                const baggage = getSelected(
                  selectedBaggage,
                  passengerIndex,
                );

                return (
                  <View
                    style={styles.ancillaryRow}
                    key={`${segmentIndex}-${passengerIndex}`}
                  >
                    <View style={styles.route}>
                      <Text>
                        {segment?.Origin?.Airport
                          ?.AirportCode || "--"}
                        {" - "}
                        {segment?.Destination
                          ?.Airport?.AirportCode ||
                          "--"}
                      </Text>

                      <Text>
                        {segment?.Airline
                          ?.AirlineCode || ""}{" "}
                        {segment?.Airline
                          ?.FlightNumber || ""}
                      </Text>
                    </View>

                    <View style={styles.services}>
                      <Text style={styles.bold}>
                        {getPassengerName(
                          passenger,
                        )}
                      </Text>

                      <View style={styles.serviceGrid}>
                        <View style={styles.serviceItem}>
                          <Text style={styles.bold}>
                            Baggage
                          </Text>

                          <Text>
                            {baggage?.Description ||
                              baggage?.Weight ||
                              segment?.Baggage ||
                              "--"}
                          </Text>
                        </View>

                        <View style={styles.serviceItem}>
                          <Text style={styles.bold}>
                            Seat
                          </Text>

                          <Text>
                            {seat?.Code || "--"}
                          </Text>
                        </View>

                        <View style={styles.serviceItem}>
                          <Text style={styles.bold}>
                            Meal
                          </Text>

                          <Text>
                            {meal?.AirlineDescription ||
                              meal?.Description ||
                              meal?.Code ||
                              "--"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.barcode}>
                      <Text style={styles.bold}>
                        Ticket
                      </Text>

                      <Text>
                        {passenger?.Ticket
                          ?.TicketNumber ||
                          "--"}
                      </Text>
                    </View>
                  </View>
                );
              },
            ),
          )}
        </View>

        {/* GENERAL + PAYMENT */}

        <View style={styles.bottom}>
          <View style={styles.general}>
            <Text style={styles.bold}>
              General Information:
            </Text>

            <Text>
              - Complete check-in before departure.
            </Text>

            <Text>
              - Carry a valid government issued
              photo ID.
            </Text>

            <Text>
              - International passengers must carry
              valid passport and visa documents.
            </Text>

            <Text>
              - Travel is subject to airline
              conditions of carriage.
            </Text>

            <Text>
              - Baggage allowance is subject to
              airline policy.
            </Text>
          </View>

          <View style={styles.payment}>
            <Text style={styles.paymentTitle}>
              Payment Details
            </Text>

            <View style={styles.paymentRow}>
              <Text>Fare:</Text>
              <Text>
                Rs. {formatMoney(flightFare)}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text>K3/GST:</Text>
              <Text>Rs. 0.00</Text>
            </View>

            <View style={styles.paymentRow}>
              <Text>Fee & Surcharge:</Text>
              <Text>
                Rs. {formatMoney(feeAndSurcharge)}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text>Total Amount:</Text>
              <Text>
                Rs. {formatMoney(totalFare)}
              </Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default FlightTicketPDF;