console.log("Starting server.js")

const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const path = require("path")

// Log all uncaught errors
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:", err)
})

process.on("unhandledRejection", (reason, promise) => {
  console.log("UNHANDLED REJECTION:", reason)
})

const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongodb-service:27017/productdb"

console.log("Environment variables:")
console.log("PORT:", PORT)
console.log("MONGODB_URI:", MONGODB_URI)

// Middleware
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "public")))

// Add error handling middleware
app.use((err, req, res, next) => {
  console.log("Express error:", err)
  res.status(500).json({ error: err.message })
})

// Debug route to test API
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" })
})

// Connect to MongoDB
console.log("Connecting to MongoDB...")
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    retryWrites: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.log("MongoDB connection error:", err)
  })

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
})

const Product = mongoose.model("Product", productSchema)

// Routes
app.get("/api/products", (req, res) => {
  console.log("GET /api/products request received")
  Product.find()
    .sort({ createdAt: -1 })
    .then((products) => {
      console.log("Products found:", products.length)
      res.json(products)
    })
    .catch((err) => {
      console.log("Error finding products:", err)
      res.status(500).json({ error: err.message })
    })
})

app.post("/api/products", (req, res) => {
  console.log("POST /api/products request received", req.body)
  const product = new Product(req.body)
  product
    .save()
    .then((savedProduct) => {
      console.log("Product saved:", savedProduct)
      res.status(201).json(savedProduct)
    })
    .catch((err) => {
      console.log("Error saving product:", err)
      res.status(400).json({ error: err.message })
    })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})



