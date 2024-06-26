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

const flowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nodes: { type: Array, required: true },
  edges: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Flow = mongoose.model('Flow', flowSchema);

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
app.get("/", (req,res)=>{
  res.send("Server is up and running")
})
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

app.post("/save-flow", async (req, res) => {
  try {
    const { name, nodes, edges } = req.body;

    if (!name || !nodes || !edges) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newFlow = new Flow({
      name,
      nodes,
      edges
    });

    await newFlow.save();

    res.status(201).json({
      message: "Flow saved successfully",
      flowId: newFlow._id
    });
  } catch (error) {
    console.error("Error saving flow:", error);
    res.status(500).json({ error: "Failed to save flow" });
  }
});

app.get("/flows", async (req, res) => {
  try {
    const flows = await Flow.find({}, 'name createdAt');
    res.status(200).json(flows);
  } catch (error) {
    console.error("Error retrieving flows:", error);
    res.status(500).json({ error: "Failed to retrieve flows" });
  }
});

app.get("/flow/:id", async (req, res) => {
  try {
    const flow = await Flow.findById(req.params.id);
    if (!flow) {
      return res.status(404).json({ error: "Flow not found" });
    }
    res.status(200).json(flow);
  } catch (error) {
    console.error("Error retrieving flow:", error);
    res.status(500).json({ error: "Failed to retrieve flow" });
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