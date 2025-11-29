export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Parse body safely (Vercel can give string or object)
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ message: "Invalid JSON body" });
    }
  }

  const { username, serverLink, feedback } = body || {};

  if (!username || !feedback) {
    return res.status(400).json({ message: "Missing username or feedback" });
  }

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
      { name: "👤 Username ⬇️", value: `\`${username}\``, inline: false },
      {
        name: "🌐 Server Link ⬇️",
        value: serverLink ? `${serverLink}` : "_Not provided_",
        inline: false,
      },
      {
        name: "📝 Feedback ⬇️",
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
