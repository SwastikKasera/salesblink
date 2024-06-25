const express = require("express");
const mongoose = require("mongoose");
const Agenda = require("agenda");
const nodemailer = require("nodemailer");
require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());  // Enable CORS for all routes

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/email-marketing";

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB error", err);
  });

// Initialize Agenda and connecting to mongodb
const agenda = new Agenda({ db: { address: MONGODB_URI } });

// POST endpoint to schedule email sequence
app.post("/schedule-email", async (req, res) => {
  try {
    const { sequence } = req.body;

    if (!sequence || !Array.isArray(sequence)) {
      return res.status(400).json({ error: "Invalid sequence data" });
    }

    let emailList = [];
    let currentTime = Date.now();

    for (const block of sequence) {
      switch (block.type) {
        case 'emailList':
          emailList = block.emails;
          break;

        case 'sendEmail':
          for (const email of emailList) {
            await agenda.schedule(new Date(currentTime), "send email", {
              to: email,
              subject: block.subject,
              text: block.body,
            });
          }
          break;

        case 'wait':
          const waitTime = block.unit === 'minutes' ? 
            parseInt(block.duration) * 60 * 1000 : 
            parseInt(block.duration) * 1000;
          currentTime += waitTime;
          break;

        default:
          console.warn(`Unknown block type: ${block.type}`);
      }
    }

    res.status(200).json({
      message: "Email sequence scheduled successfully",
      scheduledEmails: emailList.length,
    });
  } catch (error) {
    console.error("Error scheduling email sequence:", error);
    res.status(500).json({ error: "Failed to schedule email sequence" });
  }
});

// Define the email sending task
agenda.define("send email", async (job) => {
  const { to, subject, text } = job.attrs.data;

  try {
    let transporter = nodemailer.createTransport({
      host: process.env.MAILGUN_SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAILGUN_USERNAME,
        pass: process.env.MAILGUN_PASS,
      },
    });

    let info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'Swastik Kasera <swastik.k@brimo.in>',
      to: to,
      subject: subject,
      text: text,
    });

    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
});

// Start Agenda
(async function () {
  try {
    await agenda.start();
    console.log("Agenda started");
  } catch (error) {
    console.error("Error starting Agenda:", error);
  }
})();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});