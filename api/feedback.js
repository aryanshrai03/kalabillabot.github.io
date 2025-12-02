export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse body safely
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ message: "Invalid JSON body" });
    }
  }

  const { username, serverLink, feedback, token } = body || {};

  if (!username || !feedback) {
    return res.status(400).json({ message: "Missing username or feedback" });
  }

  if (!token) {
    return res.status(400).json({ message: "Missing reCAPTCHA token" });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("RECAPTCHA_SECRET_KEY not set");
    return res.status(500).json({ message: "Server misconfigured (no RECAPTCHA secret)" });
  }

  // ✅ Verify reCAPTCHA with Google
  try {
    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      console.error("reCAPTCHA failed:", verifyData);
      return res.status(400).json({ message: "Captcha verification failed" });
    }
  } catch (err) {
    console.error("Error verifying reCAPTCHA:", err);
    return res.status(500).json({ message: "Captcha verification error" });
  }

  // ✅ If we reach here, captcha is valid → send to Discord
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("WEBHOOK_URL env var is not set");
    return res.status(500).json({ message: "Server misconfigured (no WEBHOOK_URL)" });
  }

  const embed = {
    title: "💌 New Feedback Received",
    description: "✨ **Someone submitted new feedback!**",
    color: 0x5865f2,
    fields: [
      { name: "👤 User", value: `\`${username}\``, inline: false },
      {
        name: "🌐 Server Link",
        value: serverLink ? `[Join Server](${serverLink})` : "_Not provided_",
        inline: false,
      },
      {
        name: "📝 Feedback",
        value: `> ${feedback.replace(/\n/g, "\n> ")}`,
        inline: false,
      },
    ],
    footer: { text: "📩 From Web Feedback Form" },
    timestamp: new Date().toISOString(),
  };

  try {
    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "📬 **New Feedback!**",
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      console.error("Discord webhook error:", discordRes.status, text);
      return res.status(500).json({
        message: `Discord webhook failed (${discordRes.status})`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ message: "Error sending webhook" });
  }
}
