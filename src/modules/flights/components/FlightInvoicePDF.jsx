import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* ================= HELPERS ================= */

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

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getPaxType = (type) => {
  if (Number(type) === 1) return "ADT";
  if (Number(type) === 2) return "CHD";
  if (Number(type) === 3) return "INF";

  return "--";
};

const getPassengerName = (passenger) =>
  `${passenger?.Title || ""} ${passenger?.FirstName || ""} ${
    passenger?.LastName || ""
  }`
    .replace(/\s+/g, " ")
    .trim();

/* ================= COMPANY DETAILS ================= */

/*
 * Ye details sample invoice se li gayi hain.
 * Agar production details different hain to yahi update karna.
 */

const TBO_DETAILS = {
  name: "TBO Tek Limited",
  address:
    "Regd Office E-78 South Extn Part-I New Delhi 110049, Corp Off Plot No 728 Udyog Vihar Phase-V, Gurugram 122016",
  phone: "01244998999",
  cin: "L74999DL2006PLC155233",
  pan: "AACCT6259K",
  gstState: "Haryana",
  gstin: "06AACCT6259K1ZZ",
};

const FLYING_LYTE_DETAILS = {
  name: "FLYING LYTE",
  owner: "Anu Jain",
  address:
    "316 Basement Gagan Vihar Gagan Vihar New Delhi East Delhi, Delhi",
  phone: "9999055591",
  pan: "AALFF0579Q",
  gstin: "07AALFF0579Q1ZP",
};

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontSize: 6.5,
    fontFamily: "Helvetica",
    color: "#111",
    backgroundColor: "#fff",
  },

  bold: {
    fontFamily: "Helvetica-Bold",
  },

  headerRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#888",
    paddingVertical: 3,
  },

  headerLeft: {
    width: "33.33%",
  },

  headerCenter: {
    width: "33.33%",
    textAlign: "center",
  },

  headerRight: {
    width: "33.33%",
    textAlign: "right",
  },

  companyRow: {
    flexDirection: "row",
    marginTop: 4,
    marginBottom: 5,
  },

  companyLeft: {
    width: "42%",
    lineHeight: 1.25,
  },

  invoiceTitle: {
    width: "16%",
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },

  companyRight: {
    width: "42%",
    textAlign: "right",
    lineHeight: 1.25,
  },

  travelDate: {
    fontFamily: "Helvetica-Bold",
    marginVertical: 4,
  },

  table: {
    width: "100%",
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: "#777",
  },

  tableRow: {
    flexDirection: "row",
  },

  tableHeader: {
    backgroundColor: "#eee",
  },

  cell: {
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#777",
    padding: 2,
    justifyContent: "center",
  },

  remarksTotals: {
    flexDirection: "row",
    marginTop: 3,
  },

  remarks: {
    width: "64%",
    padding: 4,
  },

  totals: {
    width: "36%",
    backgroundColor: "#eef5fb",
    padding: 4,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 1,
  },

  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
    marginTop: 2,
    borderTopWidth: 0.5,
    borderColor: "#777",
    fontFamily: "Helvetica-Bold",
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },

  gstTable: {
    borderLeftWidth: 0.5,
    borderTopWidth: 0.5,
    borderColor: "#777",
  },

  footer: {
    marginTop: 12,
    lineHeight: 1.35,
  },

  termsTitle: {
    marginTop: 3,
    fontFamily: "Helvetica-Bold",
  },
});

/* ================= CELL ================= */

const Cell = ({
  children,
  width,
  bold = false,
  align = "left",
}) => (
  <View style={[styles.cell, { width }]}>
    <Text
      style={[
        bold ? styles.bold : null,
        { textAlign: align },
      ]}
    >
      {children}
    </Text>
  </View>
);

/* ================= COMPONENT ================= */

const FlightInvoicePDF = ({
  booking,
  pricing,
  bookingData = {},
}) => {
  const normalizedBooking =
    normalizeBookingResponse(booking);

  const itinerary =
    normalizedBooking?.FlightItinerary || {};

  const passengers = toArray(
    itinerary?.Passenger,
  );

  const segments = toArray(
    itinerary?.Segments,
  );

  const firstSegment = segments[0] || {};

  const pnr =
    itinerary?.PNR ||
    normalizedBooking?.PNR ||
    "N/A";

  const bookingId =
    itinerary?.BookingId ||
    normalizedBooking?.BookingId ||
    "N/A";

  const firstTicket =
    passengers?.[0]?.Ticket || {};

  /*
   * Provider invoice number available ho to wo use hoga.
   * Fallback me BookingId use kar rahe hain.
   */
  const invoiceNo =
    itinerary?.InvoiceNo ||
    firstTicket?.InvoiceNumber ||
    firstTicket?.InvoiceNo ||
    `FL/${bookingId}`;

  const invoiceDate =
    firstTicket?.IssueDate ||
    itinerary?.InvoiceCreatedOn ||
    new Date();

  const travelDate =
    firstSegment?.Origin?.DepTime;

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

  const totalFare = Number(
    pricing?.totalPrice ||
      flightFare +
        seatPrice +
        mealPrice +
        baggagePrice +
        convenienceFee,
  );

  const selectedSeats =
    bookingData?.selectedSeats || [];

  const selectedMeals =
    bookingData?.selectedMeals || [];

  const selectedBaggage =
    bookingData?.selectedBaggage || [];

  const getSelectedPrice = (
    list,
    index,
  ) => {
    const selected =
      list.find(
        (item) =>
          item?.PassengerIndex === index,
      ) || list?.[index];

    return Number(selected?.Price || 0);
  };

  const sectors = segments
    .map(
      (segment) =>
        `${
          segment?.Origin?.Airport
            ?.AirportCode || "--"
        }-${
          segment?.Destination?.Airport
            ?.AirportCode || "--"
        }`,
    )
    .join(" / ");

  const flightNumbers = segments
    .map(
      (segment) =>
        `${
          segment?.Airline?.AirlineCode ||
          ""
        }${
          segment?.Airline?.FlightNumber ||
          ""
        }`,
    )
    .join(" / ");

  return (
    <Document>
      <Page
        size="A4"
        orientation="portrait"
        style={styles.page}
      >
        {/* HEADER */}

        <View style={styles.headerRow}>
          <Text style={styles.headerLeft}>
            Invoice No: {invoiceNo}
          </Text>

          <Text style={styles.headerCenter}>
            Invoice Date:{" "}
            {formatDate(invoiceDate)}
          </Text>

          <Text style={styles.headerRight}>
            PNR: {pnr}
          </Text>
        </View>

        {/* COMPANY */}

        <View style={styles.companyRow}>
          <View style={styles.companyLeft}>
            <Text style={styles.bold}>
              {TBO_DETAILS.name}
            </Text>

            <Text>
              {TBO_DETAILS.address}
            </Text>

            <Text>
              Phone: {TBO_DETAILS.phone}
            </Text>

            <Text>
              CIN: {TBO_DETAILS.cin}
            </Text>

            <Text>
              PAN: {TBO_DETAILS.pan}
            </Text>

            <Text>
              GST State:{" "}
              {TBO_DETAILS.gstState}
            </Text>

            <Text>
              GSTIN: {TBO_DETAILS.gstin}
            </Text>
          </View>

          <Text style={styles.invoiceTitle}>
            Invoice
          </Text>

          <View style={styles.companyRight}>
            <Text style={styles.bold}>
              {FLYING_LYTE_DETAILS.name}
            </Text>

            <Text>
              Owner&apos;s Name:{" "}
              {FLYING_LYTE_DETAILS.owner}
            </Text>

            <Text>
              {FLYING_LYTE_DETAILS.address}
            </Text>

            <Text>
              Phone:{" "}
              {FLYING_LYTE_DETAILS.phone}
            </Text>

            <Text>
              PAN: {FLYING_LYTE_DETAILS.pan}
            </Text>

            <Text>
              GSTIN:{" "}
              {FLYING_LYTE_DETAILS.gstin}
            </Text>
          </View>
        </View>

        <Text style={styles.travelDate}>
          Travel Date: {formatDate(travelDate)}
        </Text>

        {/* MAIN PASSENGER TABLE */}

        <View style={styles.table}>
          <View
            style={[
              styles.tableRow,
              styles.tableHeader,
            ]}
          >
            <Cell width="3%" bold>
              Sr.
            </Cell>

            <Cell width="9%" bold>
              Ticket No
            </Cell>

            <Cell width="7%" bold>
              Sectors
            </Cell>

            <Cell width="7%" bold>
              Flight
            </Cell>

            <Cell width="15%" bold>
              PAX Name
            </Cell>

            <Cell width="4%" bold>
              Type
            </Cell>

            <Cell width="4%" bold>
              Class
            </Cell>

            <Cell width="7%" bold>
              Fare
            </Cell>

            <Cell width="7%" bold>
              OT Tax
            </Cell>

            <Cell width="6%" bold>
              K3/GST
            </Cell>

            <Cell width="5%" bold>
              YQ
            </Cell>

            <Cell width="5%" bold>
              YR
            </Cell>

            <Cell width="5%" bold>
              Baggage
            </Cell>

            <Cell width="5%" bold>
              Meal
            </Cell>

            <Cell width="5%" bold>
              Seat
            </Cell>

            <Cell width="6%" bold>
              S.Charges
            </Cell>
          </View>

          {passengers.map(
            (passenger, index) => {
              const paxFare =
                passenger?.Fare || {};

              const baseFare = Number(
                paxFare?.BaseFare ||
                  flightFare /
                    Math.max(
                      passengers.length,
                      1,
                    ),
              );

              const tax = Number(
                paxFare?.Tax || 0,
              );

              const yqTax = Number(
                paxFare?.YQTax || 0,
              );

              return (
                <View
                  style={styles.tableRow}
                  key={index}
                >
                  <Cell width="3%">
                    {index + 1}
                  </Cell>

                  <Cell width="9%">
                    {passenger?.Ticket
                      ?.TicketNumber ||
                      passenger?.TicketNumber ||
                      "--"}
                  </Cell>

                  <Cell width="7%">
                    {sectors}
                  </Cell>

                  <Cell width="7%">
                    {flightNumbers}
                  </Cell>

                  <Cell width="15%">
                    {getPassengerName(
                      passenger,
                    )}
                  </Cell>

                  <Cell width="4%">
                    {getPaxType(
                      passenger?.PaxType,
                    )}
                  </Cell>

                  <Cell width="4%">
                    {firstSegment?.Airline
                      ?.FareClass ||
                      "--"}
                  </Cell>

                  <Cell
                    width="7%"
                    align="right"
                  >
                    {money(baseFare)}
                  </Cell>

                  <Cell
                    width="7%"
                    align="right"
                  >
                    {money(tax)}
                  </Cell>

                  <Cell
                    width="6%"
                    align="right"
                  >
                    0.00
                  </Cell>

                  <Cell
                    width="5%"
                    align="right"
                  >
                    {money(yqTax)}
                  </Cell>

                  <Cell
                    width="5%"
                    align="right"
                  >
                    0.00
                  </Cell>

                  <Cell
                    width="5%"
                    align="right"
                  >
                    {money(
                      getSelectedPrice(
                        selectedBaggage,
                        index,
                      ),
                    )}
                  </Cell>

                  <Cell
                    width="5%"
                    align="right"
                  >
                    {money(
                      getSelectedPrice(
                        selectedMeals,
                        index,
                      ),
                    )}
                  </Cell>

                  <Cell
                    width="5%"
                    align="right"
                  >
                    {money(
                      getSelectedPrice(
                        selectedSeats,
                        index,
                      ),
                    )}
                  </Cell>

                  <Cell
                    width="6%"
                    align="right"
                  >
                    {money(
                      passengers.length
                        ? convenienceFee /
                            passengers.length
                        : convenienceFee,
                    )}
                  </Cell>
                </View>
              );
            },
          )}
        </View>

        {/* REMARKS + TOTAL */}

        <View style={styles.remarksTotals}>
          <View style={styles.remarks}>
            <Text style={styles.bold}>
              Remarks:
            </Text>

            <Text>
              All penalties and cancellations
              are subject to airline fare rules.
            </Text>
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.bold}>
                Gross:
              </Text>

              <Text>
                {money(
                  flightFare +
                    seatPrice +
                    mealPrice +
                    baggagePrice,
                )}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text>
                Less Commission Earned
              </Text>

              <Text>0.00</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>Add Tra Fee</Text>

              <Text>
                {money(convenienceFee)}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <Text>Add TDS Deducted</Text>

              <Text>0.00</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>
                Add CGST @0.00%
              </Text>

              <Text>0.00</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>
                Add SGST @0.00%
              </Text>

              <Text>0.00</Text>
            </View>

            <View style={styles.totalRow}>
              <Text>
                Add IGST @0.00%
              </Text>

              <Text>0.00</Text>
            </View>

            <View style={styles.netRow}>
              <Text>Net Amount</Text>

              <Text>
                {money(totalFare)}
              </Text>
            </View>

            <Text style={{ marginTop: 2 }}>
              (Amount in Rs.)
            </Text>
          </View>
        </View>

        {/* GST DETAILS */}

        <Text style={styles.sectionTitle}>
          GST Details:
        </Text>

        <View style={styles.gstTable}>
          <View
            style={[
              styles.tableRow,
              styles.tableHeader,
            ]}
          >
            <Cell width="20%" bold>
              Service Description
            </Cell>

            <Cell width="10%" bold>
              SAC
            </Cell>

            <Cell width="14%" bold>
              Taxable Value
            </Cell>

            <Cell width="14%" bold>
              CGST @ 0.00%
            </Cell>

            <Cell width="14%" bold>
              SGST @ 0.00%
            </Cell>

            <Cell width="14%" bold>
              IGST
            </Cell>

            <Cell width="14%" bold>
              Total GST
            </Cell>
          </View>

          <View style={styles.tableRow}>
            <Cell width="20%">
              Transaction Fees
            </Cell>

            <Cell width="10%">
              998559
            </Cell>

            <Cell width="14%">
              0.00
            </Cell>

            <Cell width="14%">
              0.00
            </Cell>

            <Cell width="14%">
              0.00
            </Cell>

            <Cell width="14%">
              0.00
            </Cell>

            <Cell width="14%">
              0.00
            </Cell>
          </View>
        </View>

        {/* PASSENGER GST */}

        <Text style={styles.sectionTitle}>
          Passenger GST Details:
        </Text>

        <View style={styles.gstTable}>
          <View
            style={[
              styles.tableRow,
              styles.tableHeader,
            ]}
          >
            <Cell width="17%" bold>
              Lead Pax Name
            </Cell>

            <Cell width="12%" bold>
              GST Number
            </Cell>

            <Cell width="14%" bold>
              Contact Number
            </Cell>

            <Cell width="22%" bold>
              GST Company Address
            </Cell>

            <Cell width="17%" bold>
              GST Company Email
            </Cell>

            <Cell width="18%" bold>
              GST Company Name
            </Cell>
          </View>

          <View style={styles.tableRow}>
            <Cell width="17%">
              {getPassengerName(
                passengers[0],
              ) || "--"}
            </Cell>

            <Cell width="12%">
              {passengers[0]?.GSTNumber ||
                "-"}
            </Cell>

            <Cell width="14%">
              {passengers[0]?.ContactNo ||
                "-"}
            </Cell>

            <Cell width="22%">
              {passengers[0]
                ?.GSTCompanyAddress || "-"}
            </Cell>

            <Cell width="17%">
              {passengers[0]
                ?.GSTCompanyEmail || "-"}
            </Cell>

            <Cell width="18%">
              {passengers[0]
                ?.GSTCompanyName || "-"}
            </Cell>
          </View>
        </View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Text>
            Invoice Status : Issued
          </Text>

          <Text>
            Billed by : Travel Boutique Online
          </Text>

          <Text>
            Ticketed by : FLYING LYTE
          </Text>

          <Text style={styles.termsTitle}>
            Terms & Conditions :
          </Text>

          <Text>
            * This is computer generated
            invoice signature not required.
          </Text>

          <Text>
            * All disputes are subject to New
            Delhi Jurisdiction.
          </Text>

          <Text>
            * Refunds and cancellations are
            subject to airline approval.
          </Text>

          <Text>
            * Kindly check all details
            carefully to avoid unnecessary
            complications.
          </Text>

          <Text>
            * Airline penalties apply as per
            applicable fare rules.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default FlightInvoicePDF;