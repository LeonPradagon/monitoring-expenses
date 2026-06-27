const url = "https://api.telegram.org/bot8703843688:AAGsm473vK7WMiXR5b8A7GYGLJs0GTezXT8/setWebhook";
fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: "https://monitoring-expenses.vercel.app/api/bot/webhook" })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
