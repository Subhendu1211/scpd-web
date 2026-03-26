import jwt from "jsonwebtoken";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function testUpload() {
    const secret = process.env.JWT_SECRET;
    const token = jwt.sign({ id: 1, email: "admin@example.com", role: "superadmin" }, secret);

    const formData = new FormData();
    const fileBuffer = fs.readFileSync("check_media_schema.js");
    const blob = new Blob([fileBuffer], { type: "application/javascript" });
    formData.append("file", blob, "test.js");
    formData.append("category", "carousel");
    formData.append("altText", "Test Upload");

    try {
        const res = await fetch("http://localhost:4000/api/admin/media", {
            method: "POST",
            body: formData,
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();
        if (res.ok) {
            console.log("Upload Success:", data);
        } else {
            console.error("Upload Failed:");
            console.error("Status:", res.status);
            console.error("Data:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

testUpload();
