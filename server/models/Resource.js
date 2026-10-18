import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["Lab", "Hall", "Equipment", "Room"], required: true },
  location: { type: String, required: true, trim: true },
  capacity: { type: Number, min: 1, default: 1 },
  description: { type: String, default: "" },
  status: { type: String, enum: ["Available", "Maintenance"], default: "Available" }
}, { timestamps: true });

export default mongoose.model("Resource", resourceSchema);
