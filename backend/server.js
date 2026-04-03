require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const { Resend } = require("resend");
const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5500;
const FRONTEND_URL = String(process.env.FRONTEND_URL || "http://192.168.0.101:5173").trim();
const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
const fromEmail = String(process.env.FROM_EMAIL || "").trim();

const twilioAccountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
const twilioAuthToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
const twilioPhone = String(process.env.TWILIO_PHONE || "").trim();

const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
const supabaseServiceRoleKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
).trim();

const resendEnabled = !!resendApiKey && !!fromEmail;
const smsEnabled =
  twilioAccountSid.startsWith("AC") &&
  !!twilioAuthToken &&
  twilioPhone.startsWith("+");

const supabaseEnabled = !!supabaseUrl && !!supabaseServiceRoleKey;

const resend = resendEnabled ? new Resend(resendApiKey) : null;
const smsClient = smsEnabled
  ? twilio(twilioAccountSid, twilioAuthToken)
  : null;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log("SUPABASE_URL:", supabaseUrl ? "loaded" : "missing");
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  supabaseServiceRoleKey ? "loaded" : "missing"
);
console.log("RESEND_API_KEY:", resendApiKey ? "loaded" : "missing");
console.log("FROM_EMAIL:", fromEmail || "missing");
console.log("TWILIO_ACCOUNT_SID:", twilioAccountSid ? "loaded" : "missing");
console.log("TWILIO_AUTH_TOKEN:", twilioAuthToken ? "loaded" : "missing");
console.log("TWILIO_PHONE:", twilioPhone || "missing");
console.log("FRONTEND_URL:", FRONTEND_URL || "missing");
console.log("smsEnabled:", smsEnabled);

if (!supabaseEnabled) {
  console.log(
    "Supabase is disabled. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env"
  );
}

if (!resendEnabled) {
  console.log("Email is disabled. Check RESEND_API_KEY and FROM_EMAIL in .env");
}

if (!smsEnabled) {
  console.log(
    "SMS is disabled. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE in .env"
  );
}

function getSafeFromEmail() {
  return fromEmail || "onboarding@resend.dev";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBirthdayParts(dateValue) {
  let birthStr = "";

  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    birthStr = `${year}-${month}-${day}`;
  } else {
    birthStr = String(dateValue || "").slice(0, 10);
  }

  const parts = birthStr.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  return { month, day, birthStr };
}

function getFrontendLink(personId) {
  return `${FRONTEND_URL}/?id=${encodeURIComponent(String(personId))}`;
}

function buildEmailHtml(personName, message, frontendUrl) {
  const safeName = escapeHtml(personName || "Friend");
  const safeMessage = escapeHtml(message || "Happy Birthday!");
  const safeLink = escapeHtml(frontendUrl);

  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
      <h2 style="margin-top: 0;">Happy Birthday ${safeName} 🎉</h2>
      <p>${safeMessage}</p>
      <p>Open your birthday page:</p>
      <p>
        <a href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLink}</a>
      </p>
    </div>
  `;
}

function buildSmsText(personName, message, frontendUrl) {
  return `Happy Birthday ${personName}! ${
    message || "Happy Birthday!"
  } Open your page: ${frontendUrl}`;
}

async function sendEmail(to, subject, htmlContent) {
  try {
    if (!resendEnabled) {
      console.log("Email skipped: email service is not configured.");
      return { success: false, reason: "email-disabled" };
    }

    if (!to) {
      console.log("Email skipped: receiver email is missing.");
      return { success: false, reason: "missing-email" };
    }

    const { error, data } = await resend.emails.send({
      from: getSafeFromEmail(),
      to,
      subject,
      html: htmlContent
    });

    if (error) {
      throw new Error(error.message || "Email send failed");
    }

    console.log(`Email sent to ${to}`);
    return {
      success: true,
      id: data?.id || null
    };
  } catch (error) {
    console.error("Email error:", error.message);
    return { success: false, reason: error.message };
  }
}

async function sendSMS(phone, message) {
  try {
    if (!smsEnabled) {
      console.log("SMS skipped: Twilio is not configured correctly.");
      return { success: false, reason: "sms-disabled" };
    }

    if (!phone) {
      console.log("SMS skipped: receiver phone is missing.");
      return { success: false, reason: "missing-phone" };
    }

    const sms = await smsClient.messages.create({
      body: message,
      from: twilioPhone,
      to: phone
    });

    console.log(`SMS sent to ${phone}`);
    return {
      success: true,
      sid: sms.sid || null
    };
  } catch (error) {
    console.error("SMS error:", error.message);
    return { success: false, reason: error.message };
  }
}

async function fetchAllBirthdays() {
  const { data, error } = await supabase
    .from("birthdays")
    .select("id, name, phone, email, date, timezone, message, last_sent_year, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return Array.isArray(data) ? data : [];
}

async function fetchBirthdayById(id) {
  const { data, error } = await supabase
    .from("birthdays")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return null;
  }

  return data;
}

async function updateLastSentYear(id, year) {
  const { error } = await supabase
    .from("birthdays")
    .update({ last_sent_year: Number(year) })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

app.get("/api/birthdays", async (req, res) => {
  try {
    if (!supabaseEnabled) {
      return res.status(500).json({
        error: "Supabase is not configured"
      });
    }

    const rows = await fetchAllBirthdays();
    res.json(rows);
  } catch (error) {
    console.error("Fetch birthdays error:", error.message);
    res.status(500).json({
      error: "Failed to fetch birthdays",
      details: error.message
    });
  }
});

app.post("/api/test-alert/:id", async (req, res) => {
  try {
    if (!supabaseEnabled) {
      return res.status(500).json({
        error: "Supabase is not configured"
      });
    }

    const id = req.params.id;
    const person = await fetchBirthdayById(id);

    if (!person) {
      return res.status(404).json({ error: "Birthday not found" });
    }

    const frontendUrl = getFrontendLink(person.id);

    const emailResult = await sendEmail(
      person.email,
      `Happy Birthday ${person.name}`,
      buildEmailHtml(
        person.name,
        person.message || "Happy Birthday!",
        frontendUrl
      )
    );

    const smsResult = await sendSMS(
      person.phone,
      buildSmsText(
        person.name,
        person.message || "Happy Birthday!",
        frontendUrl
      )
    );

    res.json({
      success: true,
      message: "Test alert processed",
      emailEnabled: resendEnabled,
      smsEnabled,
      frontendUrl,
      emailResult,
      smsResult
    });
  } catch (error) {
    console.error("Test alert error:", error.message);
    res.status(500).json({
      error: "Failed to send test alert",
      details: error.message
    });
  }
});

cron.schedule("* * * * *", async () => {
  try {
    if (!supabaseEnabled) {
      return;
    }

    const now = new Date();

    const indiaDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    const indiaTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);

    const [year, month, day] = indiaDate.split("-");
    const [hour, minute] = indiaTime.split(":");

    if (!(Number(hour) === 0 && Number(minute) === 0)) {
      return;
    }

    console.log(
      `Cron matched for Asia/Kolkata time ${hour}:${minute} on ${year}-${month}-${day}`
    );

    const rows = await fetchAllBirthdays();

    for (const person of rows) {
      const { month: birthdayMonth, day: birthdayDay, birthStr } =
        getBirthdayParts(person.date);

      const isBirthday =
        Number(month) === birthdayMonth && Number(day) === birthdayDay;

      const notSentThisYear =
        Number(person.last_sent_year || 0) !== Number(year);

      console.log("Checking person:", {
        id: person.id,
        name: person.name,
        birthStr,
        today: `${year}-${month}-${day}`,
        isBirthday,
        last_sent_year: person.last_sent_year,
        notSentThisYear
      });

      if (!isBirthday) {
        console.log(`Skipped ${person.name}: not today's birthday`);
        continue;
      }

      if (!notSentThisYear) {
        console.log(`Skipped ${person.name}: already sent this year`);
        continue;
      }

      const frontendUrl = getFrontendLink(person.id);

      const emailResult = await sendEmail(
        person.email,
        `Happy Birthday ${person.name}`,
        buildEmailHtml(
          person.name,
          person.message || "Happy Birthday!",
          frontendUrl
        )
      );

      const smsResult = await sendSMS(
        person.phone,
        buildSmsText(
          person.name,
          person.message || "Happy Birthday!",
          frontendUrl
        )
      );

      console.log(`Birthday alert processed for ${person.name}`, {
        id: person.id,
        birthStr,
        frontendUrl,
        emailResult,
        smsResult
      });

      if (emailResult.success || smsResult.success) {
        await updateLastSentYear(person.id, year);
      }
    }
  } catch (error) {
    console.error("Cron error:", error.message);
  }
});

app.get("/", (req, res) => {
  res.send("Birthday backend running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});