import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5500";

const floatingItems = [
  { id: 1, symbol: "💖", left: "8%", size: 24, delay: "0s", duration: "9s" },
  { id: 2, symbol: "🤗", left: "18%", size: 28, delay: "1s", duration: "11s" },
  { id: 3, symbol: "✨", left: "28%", size: 20, delay: "2s", duration: "10s" },
  { id: 4, symbol: "💕", left: "38%", size: 26, delay: "0.5s", duration: "8.5s" },
  { id: 5, symbol: "✦", left: "48%", size: 18, delay: "1.5s", duration: "12s" },
  { id: 6, symbol: "🤗", left: "58%", size: 30, delay: "3s", duration: "9.5s" },
  { id: 7, symbol: "💘", left: "68%", size: 24, delay: "2.5s", duration: "10.5s" },
  { id: 8, symbol: "✶", left: "78%", size: 20, delay: "0.8s", duration: "11.5s" },
  { id: 9, symbol: "💞", left: "88%", size: 26, delay: "1.8s", duration: "9.2s" }
];

export default function App() {
  const [birthdays, setBirthdays] = useState([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("idle");
  const [resultText, setResultText] = useState("");

  useEffect(() => {
    loadBirthdays();
  }, []);

  function getIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function formatDate(dateValue) {
    if (!dateValue) return "-";

    if (typeof dateValue === "string") {
      return dateValue.slice(0, 10);
    }

    if (dateValue instanceof Date) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, "0");
      const day = String(dateValue.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    return String(dateValue).slice(0, 10);
  }

  async function loadBirthdays() {
    try {
      setStatus("loading");
      setResultText("");

      const response = await fetch(`${API}/api/birthdays`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Backend error:", data);
        setBirthdays([]);
        setSelected("");
        setStatus("backend-error");
        return;
      }

      if (!Array.isArray(data)) {
        console.error("Expected array, got:", data);
        setBirthdays([]);
        setSelected("");
        setStatus("backend-error");
        return;
      }

      setBirthdays(data);

      const idFromUrl = getIdFromUrl();
      const matched = data.find((b) => String(b.id) === String(idFromUrl));

      if (matched) {
        setSelected(String(matched.id));
      } else {
        setSelected(data[0]?.id ? String(data[0].id) : "");
      }

      setStatus("loaded");
    } catch (error) {
      console.error("Fetch error:", error);
      setBirthdays([]);
      setSelected("");
      setStatus("backend-error");
    }
  }

  async function testAlert() {
    try {
      if (!selected) {
        throw new Error("No user selected");
      }

      setStatus("sending");
      setResultText("");

      const response = await fetch(`${API}/api/test-alert/${selected}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Backend error:", data);
        throw new Error(data.details || data.error || "Test alert failed");
      }

      console.log("Alert result:", data);

      const emailSuccess = !!data?.emailResult?.success;
      const smsSuccess = !!data?.smsResult?.success;
      const emailReason = data?.emailResult?.reason || "";
      const smsReason = data?.smsResult?.reason || "";

      if (emailSuccess && smsSuccess) {
        setStatus("both-sent");
        setResultText("Email and SMS sent successfully.");
      } else if (emailSuccess && !smsSuccess) {
        setStatus("email-only");
        setResultText(`Email sent. SMS failed${smsReason ? `: ${smsReason}` : "."}`);
      } else if (!emailSuccess && smsSuccess) {
        setStatus("sms-only");
        setResultText(`SMS sent. Email failed${emailReason ? `: ${emailReason}` : "."}`);
      } else {
        setStatus("delivery-failed");
        setResultText(
          `Email failed${emailReason ? `: ${emailReason}` : ""} | SMS failed${smsReason ? `: ${smsReason}` : ""}`
        );
      }
    } catch (error) {
      console.error("Test alert error:", error.message);
      setStatus("test-error");
      setResultText(error.message || "Test alert failed.");
    }
  }

  const current = useMemo(() => {
    if (!Array.isArray(birthdays)) return null;
    return birthdays.find((b) => String(b.id) === String(selected)) || birthdays[0] || null;
  }, [birthdays, selected]);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
        }

        body {
          overflow-x: hidden;
        }

        @keyframes floatUp {
          0% {
            transform: translateY(40px) scale(0.8) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translateY(-35vh) scale(1) rotate(8deg);
            opacity: 0.95;
          }
          100% {
            transform: translateY(-75vh) scale(1.15) rotate(-8deg);
            opacity: 0;
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.25);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 18px 55px rgba(106, 27, 154, 0.16);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 22px 65px rgba(216, 27, 96, 0.22);
          }
        }

        @keyframes titleBeat {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }

        .floating-bg {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .floating-item {
          position: absolute;
          bottom: -60px;
          animation-name: floatUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          filter: drop-shadow(0 4px 10px rgba(216, 27, 96, 0.22));
          user-select: none;
        }

        .sparkle-dot {
          position: absolute;
          color: rgba(255, 255, 255, 0.9);
          animation: twinkle 2.2s ease-in-out infinite;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.85);
          pointer-events: none;
        }

        .birthday-card {
          animation: pulseGlow 4s ease-in-out infinite;
        }

        .birthday-title {
          animation: titleBeat 2.2s ease-in-out infinite;
        }

        .test-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 28px rgba(216, 27, 96, 0.26);
        }

        .test-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .test-btn {
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .test-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .birthday-card {
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
            border-radius: 20px !important;
            margin: 0 !important;
          }

          .birthday-title {
            font-size: 24px !important;
            line-height: 1.3 !important;
          }
        }

        @media (max-width: 640px) {
          .birthday-card {
            padding: 14px !important;
            border-radius: 18px !important;
          }

          .birthday-title {
            font-size: 22px !important;
          }

          .floating-item {
            opacity: 0.8;
          }
        }

        @media (max-width: 480px) {
          .birthday-card {
            padding: 12px !important;
            border-radius: 16px !important;
          }

          .birthday-title {
            font-size: 20px !important;
            margin-bottom: 4px !important;
          }

          .birthday-info-block {
            padding: 12px !important;
            font-size: 13px !important;
            gap: 7px !important;
          }

          .birthday-select {
            padding: 11px 12px !important;
            font-size: 14px !important;
            border-radius: 12px !important;
          }

          .birthday-label {
            font-size: 12px !important;
          }

          .birthday-actions {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }

          .birthday-actions button {
            width: 100% !important;
            font-size: 14px !important;
            padding: 12px 14px !important;
          }

          .birthday-status {
            font-size: 12px !important;
            line-height: 1.5 !important;
          }

          .birthday-result {
            font-size: 12px !important;
            padding: 10px 12px !important;
            line-height: 1.5 !important;
          }

          .message-box {
            margin-top: 4px !important;
            font-size: 13px !important;
            line-height: 1.6 !important;
          }

          .sparkle-dot:nth-child(n+1) {
            opacity: 0.75;
          }
        }

        @media (max-width: 360px) {
          .birthday-card {
            padding: 10px !important;
          }

          .birthday-title {
            font-size: 18px !important;
          }

          .birthday-info-block {
            font-size: 12px !important;
          }

          .birthday-actions button {
            font-size: 13px !important;
            padding: 11px 12px !important;
          }
        }
      `}</style>

      <div style={styles.page}>
        <div className="floating-bg">
          {floatingItems.map((item) => (
            <span
              key={item.id}
              className="floating-item"
              style={{
                left: item.left,
                fontSize: item.size,
                animationDelay: item.delay,
                animationDuration: item.duration
              }}
            >
              {item.symbol}
            </span>
          ))}

          <span className="sparkle-dot" style={{ top: "10%", left: "12%", fontSize: 16, animationDelay: "0s" }}>✦</span>
          <span className="sparkle-dot" style={{ top: "18%", left: "84%", fontSize: 14, animationDelay: "0.8s" }}>✶</span>
          <span className="sparkle-dot" style={{ top: "32%", left: "22%", fontSize: 18, animationDelay: "1.2s" }}>✦</span>
          <span className="sparkle-dot" style={{ top: "42%", left: "74%", fontSize: 16, animationDelay: "0.3s" }}>✷</span>
          <span className="sparkle-dot" style={{ top: "62%", left: "10%", fontSize: 15, animationDelay: "1.7s" }}>✦</span>
          <span className="sparkle-dot" style={{ top: "72%", left: "88%", fontSize: 17, animationDelay: "0.6s" }}>✶</span>
          <span className="sparkle-dot" style={{ top: "82%", left: "40%", fontSize: 15, animationDelay: "1s" }}>✷</span>
        </div>

        <div style={styles.card} className="birthday-card">
          <h1 style={styles.title} className="birthday-title">
            Birthday Alarm 💖🤗✨
          </h1>

          <div style={styles.row}>
            <label style={styles.label} className="birthday-label">Person</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={styles.select}
              className="birthday-select"
              disabled={!birthdays.length || status === "sending"}
            >
              {birthdays.length === 0 ? (
                <option value="">No data</option>
              ) : (
                birthdays.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={styles.info} className="birthday-info-block">
            <div><b>Name:</b> {current?.name || "-"}</div>
            <div><b>Phone:</b> {current?.phone || "-"}</div>
            <div><b>Email:</b> {current?.email || "-"}</div>
            <div><b>Date:</b> {formatDate(current?.date)}</div>
            <div><b>Timezone:</b> {current?.timezone || "-"}</div>
            <div>
              <b>Message:</b>
              <div style={styles.messageText} className="message-box">{current?.message || "-"}</div>
            </div>
          </div>

          <div style={styles.actions} className="birthday-actions">
            <button
              style={styles.primary}
              className="test-btn"
              onClick={testAlert}
              disabled={!selected || status === "sending"}
            >
              {status === "sending" ? "Sending..." : "Test Alert 💌"}
            </button>

            <button
              style={styles.secondary}
              onClick={loadBirthdays}
              disabled={status === "sending"}
            >
              Refresh
            </button>
          </div>

          <div style={styles.status} className="birthday-status">
            {status === "idle" && "Loading..."}
            {status === "loading" && "Loading data..."}
            {status === "loaded" && "Data loaded successfully."}
            {status === "backend-error" && "Backend error. Check Node server and backend API."}
            {status === "sending" && "Sending test alert..."}
            {status === "both-sent" && "Test email and SMS sent successfully."}
            {status === "email-only" && "Test email sent, but SMS failed."}
            {status === "sms-only" && "Test SMS sent, but email failed."}
            {status === "delivery-failed" && "Email and SMS both failed."}
            {status === "test-error" && "Test alert failed. Check backend terminal."}
          </div>

          {resultText ? <div style={styles.resultBox} className="birthday-result">{resultText}</div> : null}
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(1000px 600px at 10% 10%, rgba(244, 44, 111, 0.94) 0%, transparent 60%), radial-gradient(900px 700px at 90% 15%, rgba(61, 6, 133, 0.82) 0%, transparent 60%), linear-gradient(180deg, #fff0f8 0%, #f7e8ff 55%, #fff8fb 100%)",
    padding: "16px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    position: "relative",
    overflow: "hidden"
  },
  card: {
    width: "100%",
    maxWidth: "640px",
    background: "rgba(225, 190, 231, 0.9)",
    border: "1px solid rgba(106, 27, 154, 0.18)",
    borderRadius: "24px",
    padding: "18px",
    boxShadow: "0 18px 55px rgba(106, 27, 154, 0.16)",
    backdropFilter: "blur(10px)",
    position: "relative",
    zIndex: 1
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 34px)",
    color: "#4A148C",
    textAlign: "center",
    textShadow: "0 4px 18px rgba(216, 27, 96, 0.18)"
  },
  row: {
    marginTop: 18,
    display: "grid",
    gap: 8
  },
  label: {
    fontSize: 13,
    color: "#5E357A",
    fontWeight: 600
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(106, 27, 154, 0.18)",
    fontSize: 15,
    background: "#F8F1FB",
    color: "#4A148C",
    outline: "none"
  },
  info: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    background: "linear-gradient(180deg, rgba(248, 241, 251, 0.98) 0%, rgba(243, 229, 245, 0.95) 100%)",
    border: "1px solid rgba(106, 27, 154, 0.14)",
    display: "grid",
    gap: 8,
    fontSize: 14,
    color: "#4E3A61",
    lineHeight: 1.5,
    overflowWrap: "break-word"
  },
  messageText: {
    whiteSpace: "pre-line",
    marginTop: 6,
    color: "#6A1B9A",
    lineHeight: 1.7
  },
  actions: {
    display: "flex",
    gap: 10,
    marginTop: 18,
    flexWrap: "wrap",
    justifyContent: "center"
  },
  primary: {
    padding: "12px 18px",
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #8E24AA 0%, #D81B60 100%)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 15,
    boxShadow: "0 10px 24px rgba(142, 36, 170, 0.22)"
  },
  secondary: {
    padding: "12px 18px",
    borderRadius: 16,
    border: "1px solid rgba(106, 27, 154, 0.18)",
    background: "#F8F1FB",
    color: "#4A148C",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 15
  },
  status: {
    marginTop: 14,
    fontSize: 13,
    color: "#5E357A",
    minHeight: 20,
    textAlign: "center",
    fontWeight: 600,
    lineHeight: 1.5
  },
  resultBox: {
    marginTop: 12,
    padding: "12px 14px",
    borderRadius: 14,
    background: "rgba(248, 241, 251, 0.95)",
    border: "1px solid rgba(106, 27, 154, 0.14)",
    color: "#4E3A61",
    fontSize: 13,
    lineHeight: 1.5,
    textAlign: "center",
    overflowWrap: "break-word"
  }
};