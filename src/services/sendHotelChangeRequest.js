// src/services/sendHotelChangeRequest.js
import { privateApi } from "./api";

export const sendHotelChangeRequest = async (BookingId, remarks = "") => {
  const { data } = await privateApi.post(
    "/api/hotels/hotel/send-change-request/",
    {
      BookingId,
      Remarks: remarks || "Customer requested hotel booking change",
    },
  );

  return data;
};
