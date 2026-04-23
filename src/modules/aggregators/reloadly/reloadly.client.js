// src/modules/aggregators/reloadly/reloadly.client.js
import axios from "axios";
import {
  getReloadlyOperatorsToken,
  getReloadlyTopupsToken,
} from "./reloadly.auth.js";

export async function reloadlyOperatorsRequest(method, url) {
  const token = await getReloadlyOperatorsToken();

  try {
    const response = await axios({
      method,
      url: `https://operators.reloadly.com${url}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (err) {
    console.error(
      "Reloadly Operators API Error:",
      err.response?.data || err.message
    );
    throw new Error("Reloadly Operators API request failed");
  }
}

export async function reloadlyTopupsRequest(method, url, data = null) {
  const token = await getReloadlyTopupsToken();

  try {
    const response = await axios({
      method,
      url: `https://topups.reloadly.com${url}`,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (err) {
    console.error(
      "Reloadly Topups API Error:",
      err.response?.data || err.message
    );
    throw new Error("Reloadly Topups API request failed");
  }
}
