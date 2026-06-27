import { parseNaturalLanguage } from "./lib/ai";
import { config } from "dotenv";

config();

async function test() {
  const result = await parseNaturalLanguage("saya ada beli makanan anjing 202.040", { 
    accounts: [{name: 'BCA', id: '123'}], 
    categories: [] // Since user has no categories
  });
  console.log(result);
}

test();
