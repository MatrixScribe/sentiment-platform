import { reloadlyRequest } from "./reloadly.client.js";

export async function testReloadly() {
  const operators = await reloadlyRequest("GET", "/operators");
  console.log("Reloadly Operators:", operators.length);
}
