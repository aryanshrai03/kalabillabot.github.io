export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, serverLink, feedback } = req.body;

  const embed = {
    title: "💌 New Feedback Received",
    description: "✨ **Someone submitted new feedback!**",
    color: 0x5865f2,
    fields: [
      { name: "👤 User", value: `\`${username}\``, inline: false },
      {
        name: "🌐 Server Link",
        value: serverLink ? `[Join Server](${serverLink})` : "_Not provided_",
        inline: false
      },
      {
        name: "📝 Feedback",
        value: `> ${feedback.replace(/\n/g, "\n> ")}`,
        inline: false
      }
    ],
    footer: { text: "📩 From Web Feedback Form" },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(process.env.WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "📬 **New Feedback!**", embeds: [embed] })
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ message: "Error sending webhook" });
  }
}
