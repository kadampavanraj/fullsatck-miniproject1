import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Resource from "./models/Resource.js";
import Booking from "./models/Booking.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../client/dist");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

const isAdmin = (req) => req.header("x-demo-role") === "admin";

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Campus Resource Booking API is running" }));

app.get("/api/resources", async (_req, res) => {
  try { res.json(await Resource.find().sort({ type: 1, name: 1 })); }
  catch { res.status(500).json({ message: "Could not load resources" }); }
});

app.post("/api/resources", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Admin role required in demo mode" });
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.patch("/api/resources/:id", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Admin role required in demo mode" });
  try {
    const resource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!resource) return res.status(404).json({ message: "Resource not found" });
    res.json(resource);
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.get("/api/bookings", async (req, res) => {
  try {
    const filter = {};
    if (req.query.email) filter.studentEmail = String(req.query.email).toLowerCase();
    res.json(await Booking.find(filter).populate("resource").sort({ date: -1, startTime: 1 }));
  } catch { res.status(500).json({ message: "Could not load bookings" }); }
});

app.post("/api/bookings", async (req, res) => {
  try {
    const { resource: resourceId, studentName, studentEmail, purpose, date, startTime, endTime } = req.body;
    if (!resourceId || !studentName?.trim() || !studentEmail?.trim() || !purpose?.trim() || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Please fill in all booking fields." });
    }
    if (startTime >= endTime) return res.status(400).json({ message: "End time must be after start time." });
    const resource = await Resource.findById(resourceId);
    if (!resource) return res.status(404).json({ message: "Resource not found." });
    if (resource.status !== "Available") return res.status(400).json({ message: "This resource is under maintenance." });

    const conflict = await Booking.findOne({
      resource: resourceId, date, status: { $in: ["Pending", "Approved"] },
      startTime: { $lt: endTime }, endTime: { $gt: startTime }
    });
    if (conflict) return res.status(409).json({ message: "That time slot overlaps an existing pending or approved booking." });

    const booking = await Booking.create({ ...req.body, studentEmail: studentEmail.toLowerCase() });
    res.status(201).json(await booking.populate("resource"));
  } catch (error) { res.status(400).json({ message: error.message || "Could not create booking" }); }
});

app.patch("/api/bookings/:id/status", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ message: "Admin role required in demo mode" });
  const { status } = req.body;
  if (!["Approved", "Rejected", "Pending"].includes(status)) return res.status(400).json({ message: "Invalid status" });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (status === "Approved") {
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id }, resource: booking.resource, date: booking.date,
        status: "Approved", startTime: { $lt: booking.endTime }, endTime: { $gt: booking.startTime }
      });
      if (conflict) return res.status(409).json({ message: "Another approved booking occupies this time." });
    }
    booking.status = status;
    await booking.save();
    res.json(await booking.populate("resource"));
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete("/api/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (!isAdmin(req) && booking.studentEmail !== String(req.query.email || "").toLowerCase()) {
      return res.status(403).json({ message: "You can only cancel your own booking in demo mode." });
    }
    await booking.deleteOne();
    res.json({ message: "Booking cancelled" });
  } catch { res.status(400).json({ message: "Invalid booking ID" }); }
});

// Serve frontend index.html for all non-API routes (SPA routing on single port)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const indexPath = path.join(clientDistPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend build not found. Please run 'npm run build' first.");
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_resource_booking";

async function seedInitialData() {
  try {
    const count = await Resource.countDocuments();
    if (count === 0) {
      console.log("Database is empty, seeding initial campus resources and demo bookings...");
      const resources = await Resource.insertMany([
        { name: "Computer Lab 1", type: "Lab", location: "Block A · Ground Floor", capacity: 30, description: "Desktop computers for coding and lab work." },
        { name: "Innovation Lab", type: "Lab", location: "Block B · 2nd Floor", capacity: 20, description: "Project workspace for student teams." },
        { name: "Seminar Hall", type: "Hall", location: "Main Building · 1st Floor", capacity: 100, description: "Presentations, workshops, and club events." },
        { name: "Projector Kit", type: "Equipment", location: "Library Help Desk", capacity: 1, description: "Portable projector with HDMI cable." },
        { name: "Robotics Kit", type: "Equipment", location: "Electronics Lab", capacity: 1, description: "Arduino starter kit with sensors." },
        { name: "Discussion Room 2", type: "Room", location: "Library · 2nd Floor", capacity: 8, description: "Quiet room for group discussions." }
      ]);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await Booking.create([
        { resource: resources[0]._id, studentName: "Aarav Patil", studentEmail: "aarav@example.com", purpose: "Mini project development", date: tomorrow, startTime: "10:00", endTime: "11:00", status: "Pending" },
        { resource: resources[2]._id, studentName: "Priya Sharma", studentEmail: "priya@example.com", purpose: "Coding club presentation", date: tomorrow, startTime: "14:00", endTime: "15:00", status: "Approved" }
      ]);
      console.log("Initial seed complete.");
    }
  } catch (err) {
    console.warn("Auto-seed skipped:", err.message);
  }
}

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    console.log("Connected to standalone MongoDB service at", MONGO_URI);
  } catch (error) {
    console.log(`No standalone MongoDB service detected (${error.message}).`);
    console.log("Starting local persistent MongoDB engine in ./server/data/db...");
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const dbPath = path.resolve(__dirname, "data/db");
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbPath,
          storageEngine: "wiredTiger"
        }
      });
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log("Connected to local persistent MongoDB at", uri);
      console.log("Local database stored in:", dbPath);
    } catch (embErr) {
      console.error("Local MongoDB connection failed:", embErr.message);
      process.exit(1);
    }
  }

  await seedInitialData();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Campus Resource Booking running on ONE link:`);
    console.log(`👉 Web UI:    http://localhost:${PORT}`);
    console.log(`👉 API Base:  http://localhost:${PORT}/api`);
    console.log(`======================================================\n`);
  });
}

startServer();


