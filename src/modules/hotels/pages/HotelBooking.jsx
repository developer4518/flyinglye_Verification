"use client";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { privateApi } from "../../../services/api";
import { useHotelStore } from "../../../store/hotelStore";

const HotelBooking = () => {
  const { setGuestDetails } = useHotelStore();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const payload = state?.payload || state;

  const { hotel, preBook, checkIn, checkOut, guests } = payload;

  const roomData = preBook?.raw?.HotelResult?.[0]?.Rooms?.[0];
  const validation = preBook?.validation || {};

  const bookingCode =
    preBook?.booking_code ||
    preBook?.BookingCode ||
    preBook?.room?.BookingCode ||
    preBook?.room?.booking_code ||
    preBook?.raw?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode ||
    preBook?.raw?.Response?.HotelResult?.[0]?.Rooms?.[0]?.BookingCode;

  const net = Number(preBook?.net_amount || preBook?.NetAmount || 0);
  // const total = Number(
  //   preBook?.total_amount || preBook?.TotalAmount || net || 0,
  // );

  const isPANRequired =
    Boolean(validation?.PANRequired) ||
    Boolean(validation?.IsPANRequired) ||
    Boolean(preBook?.PANRequired) ||
    Boolean(preBook?.raw?.PANRequired) ||
    Boolean(roomData?.PANRequired) ||
    Boolean(hotel?.isInternational) ||
    Boolean(hotel?.IsInternational) ||
    Boolean(hotel?.is_international);

  const normalizeAgeArray = (ages = [], children = 0) => {
    const list = Array.isArray(ages) ? ages : [];

    return Array.from({ length: Number(children) || 0 }, (_, index) => {
      const age = Number(list[index]);
      return age >= 1 && age <= 12 ? age : "";
    });
  };

  const normalizedRooms = useMemo(() => {
    const roomGuests =
      preBook?.roomGuests ||
      preBook?.RoomGuests ||
      preBook?.Guests?.roomGuests ||
      preBook?.Guests?.RoomGuests ||
      payload?.roomGuests ||
      payload?.RoomGuests ||
      payload?.guests?.roomGuests ||
      payload?.guests?.RoomGuests ||
      guests?.roomGuests ||
      guests?.RoomGuests ||
      [];

    if (Array.isArray(roomGuests) && roomGuests.length > 0) {
      return roomGuests.map((room) => {
        const children = Number(room.Children ?? room.children ?? 0);

        const ages =
          room.ChildrenAges ||
          room.ChildAges ||
          room.childAges ||
          room.childrenAges ||
          [];

        return {
          Adults: Number(room.Adults ?? room.adults ?? 1),
          Children: children,
          ChildrenAges: normalizeAgeArray(ages, children),
        };
      });
    }

    const paxRooms =
      preBook?.PaxRooms ||
      preBook?.Guests?.PaxRooms ||
      payload?.PaxRooms ||
      payload?.guests?.PaxRooms ||
      guests?.PaxRooms ||
      [];

    if (Array.isArray(paxRooms) && paxRooms.length > 0) {
      return paxRooms.map((room) => {
        const children = Number(room.Children ?? room.children ?? 0);

        return {
          Adults: Number(room.Adults ?? room.adults ?? 1),
          Children: children,
          ChildrenAges: normalizeAgeArray(
            room.ChildrenAges || room.ChildAges || room.childAges || [],
            children,
          ),
        };
      });
    }

    const children = Number(guests?.children || guests?.Children || 0);

    return [
      {
        Adults: Number(guests?.adults || guests?.Adults || 1),
        Children: children,
        ChildrenAges: normalizeAgeArray(
          payload?.childAges ||
            preBook?.childAges ||
            guests?.childAges ||
            guests?.ChildrenAges ||
            [],
          children,
        ),
      },
    ];
  }, [guests, preBook, payload]);

  const initialGuests = useMemo(() => {
    const list = [];

    normalizedRooms.forEach((room, roomIndex) => {
      for (let i = 0; i < room.Adults; i++) {
        list.push({
          RoomIndex: roomIndex,
          Title: i === 1 ? "Mrs" : "Mr",
          FirstName: "",
          MiddleName: "",
          LastName: "",
          Email: "",
          Phoneno: "",
          PaxType: 1,
          LeadPassenger: list.length === 0,
          Age: "",
        });
      }

      for (let i = 0; i < room.Children; i++) {
        list.push({
          RoomIndex: roomIndex,
          Title: "Mstr",
          FirstName: "",
          MiddleName: "",
          LastName: "",
          Email: "",
          Phoneno: "",
          PaxType: 2,
          LeadPassenger: false,
          Age: room.ChildrenAges?.[i] ? String(room.ChildrenAges[i]) : "",
        });
      }
    });

    return list;
  }, [normalizedRooms]);

  const [guestList, setGuestList] = useState(initialGuests);
  const [corporatePAN, setCorporatePAN] = useState("");
  const [loading, setLoading] = useState(false);

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

  const updateGuest = (index, field, value) => {
    const updated = [...guestList];
    updated[index][field] = value;
    setGuestList(updated);
  };

  const isValidPAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  const validateGuests = () => {
    if (!bookingCode) return "Booking code missing";
    if (!net || net <= 0) return "Net amount missing";

    if (isPANRequired && !isValidPAN(corporatePAN.trim().toUpperCase())) {
      return "Valid PAN number is required";
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

      if (g.PaxType === 2 && (age < 1 || age > 12)) {
        return `Guest ${i + 1}: Child age must be between 1 and 12`;
      }

      if (g.LeadPassenger) {
        if (!g.Email.includes("@")) return "Valid email required";

        if (!/^[0-9]{10}$/.test(g.Phoneno)) {
          return "Valid 10-digit phone required";
        }
      }

      if (
        validation?.PaxNameMinLength &&
        g.FirstName.trim().length < validation.PaxNameMinLength
      ) {
        return `Guest ${i + 1}: Name too short`;
      }

      if (
        validation?.PaxNameMaxLength &&
        g.FirstName.trim().length > validation.PaxNameMaxLength
      ) {
        return `Guest ${i + 1}: Name too long`;
      }
    }

    return null;
  };

  const buildRoomPayloads = (cleanedGuests) => {
    const rooms = normalizedRooms.map((_, roomIndex) => {
      const roomPassengers = cleanedGuests.filter(
        (guest) => guest.RoomIndex === roomIndex,
      );

      const adults = roomPassengers.filter((guest) => guest.PaxType === 1);
      const children = roomPassengers.filter((guest) => guest.PaxType === 2);

      return {
        HotelRoomDetail: {
          HotelPassenger: roomPassengers.map(
            ({ RoomIndex, ...guest }) => guest,
          ),
        },
        PaxRoom: {
          Adults: adults.length,
          Children: children.length,
          ChildrenAges: children.map((child) => Number(child.Age)),
        },
      };
    });

    return {
      HotelRoomsDetails: rooms.map((room) => room.HotelRoomDetail),
      PaxRooms: rooms.map((room) => room.PaxRoom),
    };
  };

  const handleBookHotel = async () => {
    const error = validateGuests();
    if (error) return alert(error);

    try {
      setLoading(true);

      const finalPAN = corporatePAN.trim().toUpperCase();

      const cleanedGuests = guestList.map((g, i) => {
        const passenger = {
          RoomIndex: g.RoomIndex,
          Title: g.PaxType === 2 ? "Mstr" : g.Title,
          FirstName: g.FirstName.trim(),
          MiddleName: "",
          LastName: g.LastName.trim(),
          PaxType: g.PaxType,
          Age: Number(g.Age),
          LeadPassenger: i === 0,
        };

        if (i === 0) {
          passenger.Email = g.Email.trim();
          passenger.Phoneno = g.Phoneno.trim();
        }

        if (isPANRequired) {
          passenger.PAN = finalPAN;
        }

        return passenger;
      });

      const { HotelRoomsDetails, PaxRooms } = buildRoomPayloads(cleanedGuests);

      const finalPayload = {
        BookingCode: bookingCode,
        GuestNationality:
          payload?.GuestNationality ||
          payload?.guestNationality ||
          preBook?.GuestNationality ||
          guests?.nationality ||
          "IN",
        IsVoucherBooking: true,
        NetAmount: net,
        PreBookNetAmount: net,
        HotelRoomsDetails,
        PaxRooms,
      };

      // International / PAN required hotel payload
      if (isPANRequired) {
        finalPayload.PANRequired = true;
        finalPayload.CorporateBooking = true;
        finalPayload.CorporatePAN = finalPAN;
      }

      console.log(
        isPANRequired
          ? "FINAL INTERNATIONAL HOTEL PAYLOAD:"
          : "FINAL DOMESTIC HOTEL PAYLOAD:",
        JSON.stringify(finalPayload, null, 2),
      );

      console.log("ROOM-WISE PAX ROOMS:", JSON.stringify(PaxRooms, null, 2));
      console.log(
        "ROOM-WISE HOTEL ROOMS:",
        JSON.stringify(HotelRoomsDetails, null, 2),
      );

      const searchedRooms =
        preBook?.roomGuests ||
        preBook?.RoomGuests ||
        preBook?.Guests?.roomGuests ||
        preBook?.Guests?.RoomGuests ||
        payload?.roomGuests ||
        payload?.RoomGuests ||
        payload?.guests?.roomGuests ||
        payload?.guests?.RoomGuests ||
        guests?.roomGuests ||
        guests?.RoomGuests ||
        [];

      console.log(
        "SEARCH/PREBOOK ROOM GUESTS:",
        JSON.stringify(searchedRooms, null, 2),
      );
      console.log("FINAL BOOKING PAXROOMS:", JSON.stringify(PaxRooms, null, 2));

      searchedRooms.forEach((room, index) => {
        const searchAges =
          room.ChildrenAges ||
          room.ChildAges ||
          room.childAges ||
          room.childrenAges ||
          [];

        const finalAges = PaxRooms[index]?.ChildrenAges || [];

        if (
          JSON.stringify(searchAges.map(Number)) !==
          JSON.stringify(finalAges.map(Number))
        ) {
          throw new Error(
            `Child age mismatch before booking. Room ${index + 1}: searched age ${searchAges.join(", ")} but booking age ${finalAges.join(", ")}`,
          );
        }
      });

      const res = await privateApi.post(
        "/api/hotels/hotels/book/",
        finalPayload,
      );

      console.log("BOOK RESPONSE:", res.data);

      const guestsForStorage = cleanedGuests.map(
        ({ RoomIndex, ...guest }) => guest,
      );

      localStorage.setItem(
        "hotelBookingData",
        JSON.stringify({
          guestList: guestsForStorage,
          bookingCode,
          hotel,
          checkIn,
          checkOut,
          net,
          // total,
          // convenienceFee,
          isPANRequired,
          bookingResponse: res.data,
        }),
      );

      setGuestDetails(guestsForStorage);

      navigate("/hotel-booking-success", {
        state: { booking: res.data },
      });
    } catch (err) {
      console.log("BOOK ERROR:", err?.response?.data);
      alert(
        err?.response?.data?.message ||
          err?.response?.data?.Error?.ErrorMessage ||
          "Booking failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white px-4 md:px-10 py-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
            <h2 className="text-2xl font-bold text-yellow-400">
              {hotel?.hotel_name || hotel?.HotelName || "Hotel Booking"}
            </h2>

            <p className="text-gray-400 text-sm mt-2">
              📅 {checkIn} → {checkOut}
            </p>

            <p className="text-gray-400 text-sm mt-1">
              🛏 {roomData?.Name?.[0] || "Standard Room"}
            </p>

            <p className="text-xs mt-3 text-gray-500">
              {isPANRequired
                ? "International / PAN required booking"
                : "Domestic booking"}
            </p>
          </div>

          {isPANRequired && (
            <div className="bg-[#15151C] p-6 rounded-2xl border border-gray-800">
              <h3 className="text-yellow-300 mb-4">PAN Details</h3>

              <input
                placeholder="Enter Corporate PAN"
                className="input uppercase"
                value={corporatePAN}
                maxLength={10}
                onChange={(e) => setCorporatePAN(e.target.value.toUpperCase())}
              />

              <p className="text-xs text-gray-500 mt-2">
                This PAN will be sent as CorporatePAN and passenger PAN.
              </p>
            </div>
          )}

          {guestList.map((guest, index) => (
            <div
              key={index}
              className="bg-[#15151C] p-6 rounded-2xl border border-gray-800"
            >
              <h3 className="text-yellow-300 mb-4">
                Room {guest.RoomIndex + 1} - Guest {index + 1}{" "}
                {guest.LeadPassenger && "(Lead)"}{" "}
                <span className="text-gray-500 text-sm">
                  {guest.PaxType === 1 ? "Adult" : "Child"}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  className="input"
                  value={guest.Title}
                  disabled={guest.PaxType === 2}
                  onChange={(e) => updateGuest(index, "Title", e.target.value)}
                >
                  {guest.PaxType === 1 ? (
                    <>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                    </>
                  ) : (
                    <option value="Mstr">Mstr</option>
                  )}
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
                    max={guest.PaxType === 1 ? 120 : 12}
                    placeholder={
                      guest.PaxType === 1
                        ? "Enter adult age"
                        : "Child age from search"
                    }
                    className="input"
                    value={guest.Age}
                    disabled={guest.PaxType === 2}
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

            <hr className="border-gray-700" />

            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-yellow-400">₹ {Math.round(net)}</span>
            </div>
          </div>

          <button
            onClick={handleBookHotel}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl font-semibold bg-linear-to-r from-yellow-400 to-orange-400 text-black disabled:opacity-60"
          >
            {loading ? "Processing..." : "Proceed to Payment"}
          </button>
        </div>
      </div>

      <style jsx>{`
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

        .input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default HotelBooking;
