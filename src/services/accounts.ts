import logger from "../utils/logger";
const { getDatabase } = require("firebase-admin/database");


const FLW_URL = process.env.FLW_URL || "";
const FLW_SECRET = process.env.FLW_SECRET || "";
const paystackUrl = process.env.PAYSTACK_URL || "";
const paystackSecret = process.env.PAYSTACK_SECRET || "";
const options = {
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${FLW_SECRET}`,
  },
};
const paystackOptions = {
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${paystackSecret}`,
  },
};

// Reusable function to handle API responses
const handleResponse = async (response: Response, endpoint: string) => {
  const contentType = response.headers.get("content-type");
  const status = response.status;

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Error in ${endpoint}: HTTP ${status}`, errorText);
    return {
      success: false,
      status,
      message: `Request failed with status ${status}`,
      error: errorText,
    };
  }

  if (contentType?.includes("application/json")) {
    const jsonResponse = await response.json();
    console.log(JSON.stringify(jsonResponse, null, 2));
    // ✅ Check if API response contains an error message
    if (
      jsonResponse.status === "error" ||
      jsonResponse.success === "false" ||
      jsonResponse.error ||
      jsonResponse.code
    ) {
      logger.error(`API Error in ${endpoint}`, JSON.stringify(jsonResponse));
      return {
        success: false,
        status,
        message: jsonResponse.message || "API error",
        error: jsonResponse.error || jsonResponse,
      };
    }

    return { success: true, status, data: jsonResponse };
  }

  // Handle unexpected response types
  const text = await response.text();
  return {
    success: false,
    status,
    message: "Unexpected response format",
    error: text,
  };
};

// 🟢 Initiate Consent Request
const initiateConsentRequest = async (body: {
  bvn: string;
  firstname: string;
  lastname: string;
}) => {
  try {
    const response = await fetch(FLW_URL, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });

    return await handleResponse(response, "initiateConsentRequest");
  } catch (e: any) {
    logger.error("Exception in initiateConsentRequest", e);
    return {
      success: false,
      status: 500,
      message: "Internal error",
      error: e.message,
    };
  }
};

// 🟢 Retrieve BVN
const retrieveBvn = async (reference: string) => {
  try {
    const response = await fetch(`${FLW_URL}/${reference}`, {
      ...options,
      method: "GET",
    });

    return await handleResponse(response, "retrieveBvn");
  } catch (e: any) {
    logger.error("Exception in retrieveBvn", e);
    return {
      success: false,
      status: 500,
      message: "Internal error",
      error: e.message,
    };
  }
};

// 🟢 Generate OTP
const generateOtp = async (body: object) => {
  try {
    const response = await fetch("https://api.flutterwave.com/v3/otps", {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });

    return await handleResponse(response, "generateOtp");
  } catch (e: any) {
    logger.error("Exception in generateOtp", e);
    return {
      success: false,
      status: 500,
      message: "Internal error",
      error: e.message,
    };
  }
};
// 🟢 Generate Dedicated Virtual Accounts
const generateDVA = async (body: object) => {
  try {
    const response = await fetch(`${paystackUrl}/dedicated_account/assign`, {
      ...paystackOptions,
      method: "POST",
      body: JSON.stringify(body),
    });

    return await handleResponse(response, "assigning DVAs");
  } catch (e: any) {
    logger.error("Exception in assigning DVAs", e);
    return {
      success: false,
      status: 500,
      message: "Internal error",
      error: e.message,
    };
  }
};

export { initiateConsentRequest, retrieveBvn, generateOtp, generateDVA };
