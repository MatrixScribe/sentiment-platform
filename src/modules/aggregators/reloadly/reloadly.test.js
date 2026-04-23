// src/modules/aggregators/reloadly/reloadly.test.js
import { reloadlyOperatorsRequest } from "./reloadly.client.js";

export async function testReloadly() {
  try {
    const operators = await reloadlyOperatorsRequest("GET", "/operators");
    console.log("Reloadly Operators:", operators.length);
  } catch (err) {
    console.error(
      "Reloadly Test Error:",
      err.response?.data || err.message
    );
  }
}
