const token = "8703843688:AAFH0hAP8hqo2IjFuTWP1DCYrBbIrG0z3Gw";
const url = `https://api.telegram.org/bot${token}/setWebhook`;

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://monitoring-expenses.vercel.app/api/bot/webhook" })
})
.then(res => res.json())
.then(data => {
  console.log("Set Webhook Result:", data);
  return fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
})
.then(res => res.json())
.then(data => console.log("Webhook Info:", data))
.catch(console.error);
