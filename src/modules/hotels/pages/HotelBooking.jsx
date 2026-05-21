"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const toTBODate = (date) => {
  if (!date) return "";
  return `${date}T00:00:00`;
};

const normalizeText = (value) => {
  if (!value) return "";

  try {
    if (typeof value === "string") return value.toLowerCase();
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
};

const getSafeValue = (...values) => {
  return values.find((v) => v !== undefined && v !== null && v !== "") || "";
};

const nationalityOptions = [
  { Code: "IN", Name: "India" },
  { Code: "AE", Name: "United Arab Emirates" },
  { Code: "US", Name: "United States" },
  { Code: "GB", Name: "United Kingdom" },
  { Code: "TH", Name: "Thailand" },
  { Code: "SG", Name: "Singapore" },
  { Code: "MY", Name: "Malaysia" },
  { Code: "ID", Name: "Indonesia" },
  { Code: "MV", Name: "Maldives" },
  { Code: "LK", Name: "Sri Lanka" },
  { Code: "NP", Name: "Nepal" },
  { Code: "BT", Name: "Bhutan" },
  { Code: "FR", Name: "France" },
  { Code: "DE", Name: "Germany" },
  { Code: "IT", Name: "Italy" },
  { Code: "ES", Name: "Spain" },
  { Code: "AU", Name: "Australia" },
  { Code: "CA", Name: "Canada" },
];

const HotelBooking = () => {
  const {
    setGuestDetails,
    prebookData,
    selectedHotel,
    selectedRoom,
    search: storeSearch,
  } = useHotelStore();

  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const payload = state?.payload || state;

  const hotel = payload.hotel || selectedHotel;
  const preBook = payload.preBook || prebookData;
  const checkIn = payload.checkIn || storeSearch?.checkIn;
  const checkOut = payload.checkOut || storeSearch?.checkOut;
  const guests = payload.guests || storeSearch?.guests;
  const room = payload.room || selectedRoom;

  const rawHotelResult =
    preBook?.raw?.HotelResult?.[0] ||
    preBook?.raw?.Response?.HotelResult?.[0] ||
    preBook?.HotelResult?.[0] ||
    null;

  const roomData =
    rawHotelResult?.Rooms?.[0] ||
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0] ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0] ||
    room ||
    null;

  const bookingCode = getSafeValue(
    preBook?.booking_code,
    preBook?.BookingCode,
    roomData?.BookingCode,
    rawHotelResult?.BookingCode,
  );

  const net = Number(
    getSafeValue(
      preBook?.net_amount,
      preBook?.NetAmount,
      roomData?.NetAmount,
      roomData?.TotalFare,
      0,
    ),
  );

  const total = Number(
    getSafeValue(
      preBook?.total_amount,
      preBook?.TotalAmount,
      preBook?.total,
      net,
      0,
    ),
  );

  const convenienceFee = Number(
    getSafeValue(
      preBook?.convenience_fee,
      preBook?.convenienceFee,
      preBook?.ConvenienceFee,
      0,
    ),
  );

  const hotelText = normalizeText({
    hotel,
    preBook,
    rawHotelResult,
    roomData,
  });

  const isInternationalHotel = useMemo(() => {
    const explicitValue = getSafeValue(
      payload?.isInternational,
      payload?.is_international,
      hotel?.isInternational,
      hotel?.is_international,
      preBook?.isInternational,
      preBook?.is_international,
      rawHotelResult?.IsInternational,
      roomData?.IsInternational,
    );

    if (typeof explicitValue === "boolean") return explicitValue;

    const countryCode = getSafeValue(
      payload?.countryCode,
      payload?.country_code,
      hotel?.country_code,
      hotel?.CountryCode,
      hotel?.countryCode,
      rawHotelResult?.CountryCode,
      rawHotelResult?.HotelCountryCode,
      roomData?.CountryCode,
    );

    if (countryCode && String(countryCode).toUpperCase() !== "IN") {
      return true;
    }

    const cityCountryText = normalizeText(
      getSafeValue(
        hotel?.country,
        hotel?.Country,
        hotel?.CountryName,
        hotel?.address,
        hotel?.Address,
        hotel?.city_name,
        hotel?.CityName,
        hotel?.destination,
        hotel?.Destination,
        rawHotelResult?.Country,
        rawHotelResult?.CountryName,
        rawHotelResult?.HotelAddress,
        rawHotelResult?.Address,
      ),
    );

    const internationalKeywords = [
      "dubai",
      "abu dhabi",
      "sharjah",
      "uae",
      "united arab emirates",
      "thailand",
      "bangkok",
      "phuket",
      "pattaya",
      "singapore",
      "malaysia",
      "bali",
      "indonesia",
      "maldives",
      "sri lanka",
      "nepal",
      "bhutan",
      "usa",
      "united states",
      "united kingdom",
      "london",
      "france",
      "paris",
      "germany",
      "italy",
      "spain",
      "australia",
      "canada",
    ];

    const indiaKeywords = [
      "india",
      "delhi",
      "mumbai",
      "goa",
      "jaipur",
      "manali",
      "kashmir",
      "srinagar",
      "shimla",
      "kerala",
      "udaipur",
      "bangalore",
      "hyderabad",
      "chennai",
      "kolkata",
    ];

    if (internationalKeywords.some((word) => cityCountryText.includes(word))) {
      return true;
    }

    if (indiaKeywords.some((word) => cityCountryText.includes(word))) {
      return false;
    }

    return (
      hotelText.includes("passport") || hotelText.includes("international")
    );
  }, [payload, hotel, preBook, rawHotelResult, roomData, hotelText]);

  const defaultGuestNationality = getSafeValue(
    payload?.guestNationality,
    payload?.GuestNationality,
    guests?.nationality,
    guests?.GuestNationality,
    "IN",
  );

  const totalGuests =
    typeof guests === "number"
      ? guests
      : Number(guests?.adults || 0) + Number(guests?.children || 0);

  const adultsCount =
    typeof guests === "number" ? guests : Number(guests?.adults || totalGuests);

  const childrenCount =
    typeof guests === "number" ? 0 : Number(guests?.children || 0);

  const childAges = Array.isArray(guests?.childAges) ? guests.childAges : [];

  const [guestNationality, setGuestNationality] = useState(
    defaultGuestNationality || "IN",
  );

  const [guestList, setGuestList] = useState(
    Array.from({ length: totalGuests }, (_, i) => {
      const isChild = i >= adultsCount;
      const childIndex = i - adultsCount;

      return {
        Title: isChild ? "Master" : "Mr",
        FirstName: "",
        MiddleName: "",
        LastName: "",
        Email: "",
        Phoneno: "",
        PaxType: isChild ? 2 : 1,
        LeadPassenger: i === 0,
        Age: isChild ? childAges?.[childIndex] || "" : "",
        PassportNo: "",
        PassportIssueDate: "",
        PassportExpDate: "",
        PAN: "",
      };
    }),
  );

  const [loading, setLoading] = useState(false);

  const updateGuest = (index, field, value) => {
    setGuestList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const validateGuests = () => {
    if (!bookingCode) {
      return "Booking code missing. Please select the room again.";
    }

    if (!net || Number.isNaN(net)) {
      return "Net amount missing. Please prebook the room again.";
    }

    if (!guestNationality) {
      return "Guest nationality is required";
    }

    for (let i = 0; i < guestList.length; i++) {
      const g = guestList[i];

      if (!g.FirstName.trim() || !g.LastName.trim()) {
        return `Guest ${i + 1}: First name and last name are required`;
      }

      if (!g.Age) {
        return `Guest ${i + 1}: Age is required`;
      }

      const age = Number(g.Age);

      if (Number.isNaN(age) || age <= 0) {
        return `Guest ${i + 1}: Enter valid age`;
      }

      if (g.PaxType === 1 && age < 12) {
        return `Guest ${i + 1}: Adult age must be 12 or above`;
      }

      if (g.PaxType === 2 && age >= 12) {
        return `Guest ${i + 1}: Child age must be below 12`;
      }

      if (g.LeadPassenger) {
        if (!g.Email.trim() || !g.Email.includes("@")) {
          return "Valid email required";
        }

        if (!/^[0-9]{10}$/.test(g.Phoneno)) {
          return "Valid 10-digit phone required";
        }
      }

      if (!isInternationalHotel) {
        if (!g.PAN.trim()) {
          return `Guest ${i + 1}: PAN is required`;
        }

        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(g.PAN.toUpperCase())) {
          return `Guest ${i + 1}: Enter valid PAN number`;
        }
      }

      if (isInternationalHotel) {
        if (!g.PassportNo.trim()) {
          return `Guest ${i + 1}: Passport number is required for international hotel`;
        }

        if (!g.PassportIssueDate) {
          return `Guest ${i + 1}: Passport issue date is required`;
        }

        if (!g.PassportExpDate) {
          return `Guest ${i + 1}: Passport expiry date is required`;
        }

        if (new Date(g.PassportExpDate) <= new Date(g.PassportIssueDate)) {
          return `Guest ${i + 1}: Passport expiry date must be after issue date`;
        }
      }
    }

    if (childrenCount > 0) {
      const enteredChildren = guestList.filter((g) => g.PaxType === 2);

      if (enteredChildren.length !== childrenCount) {
        return `Children count mismatch. Expected ${childrenCount}, got ${enteredChildren.length}`;
      }
    }

    return null;
  };

  const handleBookHotel = async () => {
    const error = validateGuests();
    if (error) return alert(error);

    try {
      setLoading(true);

      const cleanedGuests = guestList.map((g, i) => {
        const passenger = {
          Title: g.Title,
          FirstName: g.FirstName.trim(),
          MiddleName: g.MiddleName?.trim() || "",
          LastName: g.LastName.trim(),
          PaxType: Number(g.PaxType),
          LeadPassenger: i === 0,
          Age: Number(g.Age),
        };

        if (i === 0) {
          passenger.Email = g.Email.trim();
          passenger.Phoneno = g.Phoneno.trim();
        }

        if (!isInternationalHotel && g.PAN?.trim()) {
          passenger.PAN = g.PAN.trim().toUpperCase();
        }

        if (isInternationalHotel) {
          passenger.PassportNo = g.PassportNo.trim();
          passenger.PassportIssueDate = toTBODate(g.PassportIssueDate);
          passenger.PassportExpDate = toTBODate(g.PassportExpDate);

          if (g.PAN?.trim()) {
            passenger.PAN = g.PAN.trim().toUpperCase();
          }
        }

        return passenger;
      });

      const finalPayload = {
        BookingCode: bookingCode,
        IsVoucherBooking: true,
        GuestNationality: guestNationality,
        RequestedBookingMode: 5,
        NetAmount: net,
        HotelRoomsDetails: [
          {
            HotelPassenger: cleanedGuests,
          },
        ],
      };

      console.log("IS INTERNATIONAL HOTEL:", isInternationalHotel);
      console.log(
        "FINAL HOTEL PAYLOAD:",
        JSON.stringify(finalPayload, null, 2),
      );

      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        finalPayload,
      );

      console.log("BOOK RESPONSE:", res.data);

      localStorage.setItem(
        "hotelBookingData",
        JSON.stringify({
          guestList: cleanedGuests,
          bookingCode,
          hotel,
          checkIn,
          checkOut,
          isInternationalHotel,
          guestNationality,
          pricing: {
            net,
            convenienceFee,
            total,
          },
          bookingResponse: res.data,
        }),
      );

      setGuestDetails(cleanedGuests);

      navigate("/hotel-booking-success", {
        state: {
          booking: res.data,
          guestList: cleanedGuests,
          isInternationalHotel,
          guestNationality,
        },
      });
    } catch (err) {
      console.log("BOOK ERROR:", err?.response?.data || err);

      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.data?.Error?.ErrorMessage ||
        err?.response?.data?.data?.Response?.Error?.ErrorMessage ||
        "Booking failed";

      alert(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!preBook) {
    return (
      <div className="p-10 text-center text-white bg-[#0B0B0F] min-h-screen">
        <h2 className="text-xl text-red-400 mb-4">⚠️ Session Expired</h2>
        <button
          onClick={() => navigate("/")}
          className="px-5 py-2 bg-yellow-400 text-black rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-yellow-300 mb-2">
                  {isInternationalHotel
                    ? "International Hotel"
                    : "Domestic Hotel"}
                </p>

                <h2 className="text-2xl font-bold text-yellow-400">
                  {hotel?.hotel_name ||
                    hotel?.HotelName ||
                    rawHotelResult?.HotelName ||
                    "Hotel Booking"}
                </h2>

                <p className="text-gray-400 text-sm mt-2">
                  📅 {checkIn} → {checkOut}
                </p>

                <p className="text-gray-400 text-sm mt-1">
                  🛏 {roomData?.Name?.[0] || roomData?.Name || "Standard Room"}
                </p>

                <p className="text-gray-500 text-xs mt-2 break-all">
                  BookingCode: {bookingCode || "Missing"}
                </p>
              </div>

              <div className="w-full md:w-72">
                <label className="block text-xs text-gray-400 mb-1">
                  Guest Nationality
                </label>

                <select
                  className="input"
                  value={guestNationality}
                  onChange={(e) => setGuestNationality(e.target.value)}
                >
                  {nationalityOptions.map((item) => (
                    <option key={item.Code} value={item.Code}>
                      {item.Name} ({item.Code})
                    </option>
                  ))}
                </select>

                <p className="text-xs text-gray-500 mt-2">
                  For Indian travellers, keep this as India even for
                  international hotels.
                </p>
              </div>
            </div>
          </div>

          {guestList.map((guest, index) => (
            <div
              key={index}
              className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-yellow-300">
                  Guest {index + 1} {guest.LeadPassenger && "(Lead)"}
                </h3>

                <span className="text-xs px-3 py-1 rounded-full bg-black/40 border border-gray-700 text-gray-300">
                  {guest.PaxType === 1 ? "Adult" : "Child"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  className="input"
                  value={guest.Title}
                  onChange={(e) => updateGuest(index, "Title", e.target.value)}
                >
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Master">Master</option>
                </select>

                <input
                  placeholder="First Name"
                  className="input"
                  value={guest.FirstName}
                  onChange={(e) =>
                    updateGuest(index, "FirstName", e.target.value)
                  }
                />

                <input
                  placeholder="Middle Name Optional"
                  className="input"
                  value={guest.MiddleName}
                  onChange={(e) =>
                    updateGuest(index, "MiddleName", e.target.value)
                  }
                />

                <input
                  placeholder="Last Name"
                  className="input"
                  value={guest.LastName}
                  onChange={(e) =>
                    updateGuest(index, "LastName", e.target.value)
                  }
                />

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {guest.PaxType === 1 ? "Adult Age" : "Child Age"}
                  </label>

                  <input
                    type="number"
                    min={guest.PaxType === 1 ? 12 : 1}
                    max={guest.PaxType === 1 ? 120 : 11}
                    placeholder={
                      guest.PaxType === 1
                        ? "Enter adult age"
                        : "Enter child age"
                    }
                    className="input"
                    value={guest.Age}
                    onChange={(e) => updateGuest(index, "Age", e.target.value)}
                  />
                </div>

                {guest.LeadPassenger && (
                  <>
                    <input
                      placeholder="Email"
                      className="input"
                      value={guest.Email}
                      onChange={(e) =>
                        updateGuest(index, "Email", e.target.value)
                      }
                    />

                    <input
                      placeholder="Phone"
                      className="input"
                      value={guest.Phoneno}
                      onChange={(e) =>
                        updateGuest(index, "Phoneno", e.target.value)
                      }
                    />
                  </>
                )}

                {!isInternationalHotel && (
                  <input
                    placeholder="PAN Number"
                    className="input uppercase"
                    value={guest.PAN}
                    onChange={(e) =>
                      updateGuest(index, "PAN", e.target.value.toUpperCase())
                    }
                  />
                )}

                {isInternationalHotel && (
                  <>
                    <input
                      placeholder="Passport Number"
                      className="input"
                      value={guest.PassportNo}
                      onChange={(e) =>
                        updateGuest(index, "PassportNo", e.target.value)
                      }
                    />

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Passport Issue Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={guest.PassportIssueDate}
                        onChange={(e) =>
                          updateGuest(
                            index,
                            "PassportIssueDate",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Passport Expiry Date
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={guest.PassportExpDate}
                        onChange={(e) =>
                          updateGuest(index, "PassportExpDate", e.target.value)
                        }
                      />
                    </div>

                    <input
                      placeholder="PAN Number Optional"
                      className="input uppercase"
                      value={guest.PAN}
                      onChange={(e) =>
                        updateGuest(index, "PAN", e.target.value.toUpperCase())
                      }
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800 h-fit sticky top-24">
          <h3 className="text-yellow-300 mb-4 text-lg">Price Summary</h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Net</span>
              <span>₹ {Math.round(net)}</span>
            </div>

            <div className="flex justify-between">
              <span>Convenience Fees</span>
              <span>₹ {Math.round(convenienceFee)}</span>
            </div>

            <hr className="border-gray-700" />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-yellow-400">
                ₹ {Math.round(total || net + convenienceFee)}
              </span>
            </div>
          </div>

          <button
            onClick={handleBookHotel}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold bg-linear-to-r from-yellow-400 to-orange-400 text-black disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            {isInternationalHotel
              ? "Passport details will be sent in booking payload."
              : "PAN details will be sent in booking payload."}
          </p>
        </div>
      </div>

      <style>{`
        .input {
          background: #0b0b0f;
          border: 1px solid #2a2a2f;
          padding: 12px;
          border-radius: 10px;
          width: 100%;
          color: white;
          outline: none;
        }

        .input:focus {
          border-color: #facc15;
        }

        .input::placeholder {
          color: #777;
        }

        select.input option {
          background: #0b0b0f;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default HotelBooking;
