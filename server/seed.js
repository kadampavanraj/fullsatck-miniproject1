import mongoose from "mongoose";
import dotenv from "dotenv";
import Resource from "./models/Resource.js";
import Booking from "./models/Booking.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/campus_resource_booking";

let mongod = null;
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  console.log("Connected to standalone MongoDB service at", uri);
} catch {
  console.log("No standalone MongoDB detected. Using local persistent MongoDB at ./server/data/db...");
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const dbPath = path.resolve(__dirname, "data/db");
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
  mongod = await MongoMemoryServer.create({
    instance: {
      dbPath,
      storageEngine: "wiredTiger"
    }
  });
  await mongoose.connect(mongod.getUri());
  console.log("Connected to local persistent MongoDB at", mongod.getUri());
}
await Booking.deleteMany({});
await Resource.deleteMany({});
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
console.log(`Seeded ${resources.length} resources and 2 demo bookings.`);
await mongoose.disconnect();
if (mongod) await mongod.stop();
