require("dotenv").config();
const fs = require('fs');
fetch(`https://public.api.hospitable.com/v2/properties`, {
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_HOSPITABLE_KEY}` }
}).then(res => res.json()).then(data => {
    const propId = data.data?.[0]?.id || "f756a025-e436-49b2-b841-6de689cd87f4";
    return fetch(`https://public.api.hospitable.com/v2/properties/${propId}/quote`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_HOSPITABLE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            checkin_date: "2026-06-10",
            checkout_date: "2026-06-12",
            guests: {
                adults: 2
            }
        })
    });
}).then(res => res.json()).then(data => fs.writeFileSync("out.json", JSON.stringify(data, null, 2))).catch(console.error);
