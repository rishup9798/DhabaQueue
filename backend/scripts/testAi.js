import "dotenv/config";
import { extractIntakeDetails } from "../src/whatsapp/aiAssistant.js";

const result = await extractIntakeDetails(
  "Hi, I'm Ramesh. I need a table for 4 people."
);

console.log(result);