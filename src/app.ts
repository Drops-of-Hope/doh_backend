import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Register API routes BEFORE starting the server
app.use("/api", routes);

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
