console.log("Starting server with database")

const express = require("express")
const mongoose = require("mongoose")
const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://mongodb-service:27017/productdb"

// Log uncaught errors
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:", err)
  // Don't exit - just log the error
})

process.on("unhandledRejection", (reason) => {
  console.log("UNHANDLED REJECTION:", reason)
  // Don't exit - just log the error
})

// Basic middleware
app.use(express.json())
app.use(express.static("public"))

// Test route - no database needed
app.get("/api/test", (req, res) => {
  console.log("Test API called")
  res.json({ message: "API is working", time: new Date().toISOString() })
})

// Connect to MongoDB with retry logic
let isConnectedToMongo = false

function connectWithRetry() {
  console.log("Attempting to connect to MongoDB at", MONGODB_URI)

  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    })
    .then(() => {
      console.log("Connected to MongoDB")
      isConnectedToMongo = true
    })
    .catch((err) => {
      console.log("MongoDB connection error:", err)
      console.log("Will retry connection in 5 seconds")
      setTimeout(connectWithRetry, 5000)
    })
}

// Initial connection attempt
connectWithRetry()

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
})

const Product = mongoose.model("Product", productSchema)

// Products routes with fallback for database issues
app.get("/api/products", (req, res) => {
  console.log("GET /api/products called")

  if (!isConnectedToMongo) {
    console.log("MongoDB not connected, returning mock data")
    return res.json([
      {
        _id: "mock1",
        name: "Mock Product 1",
        price: 19.99,
        description: "This is a mock product (MongoDB not connected)",
      },
      {
        _id: "mock2",
        name: "Mock Product 2",
        price: 29.99,
        description: "Another mock product (MongoDB not connected)",
      },
    ])
  }

  Product.find()
    .sort({ createdAt: -1 })
    .then((products) => {
      console.log("Products found:", products.length)
      res.json(products)
    })
    .catch((err) => {
      console.log("Error finding products:", err)
      res.status(500).json({
        error: err.message,
        note: "Returning mock data due to database error",
        mockData: [
          { _id: "error1", name: "Error Product 1", price: 19.99, description: "Mock product due to DB error" },
          { _id: "error2", name: "Error Product 2", price: 29.99, description: "Another mock product due to DB error" },
        ],
      })
    })
})

app.post("/api/products", (req, res) => {
  console.log("POST /api/products called", req.body)

  if (!isConnectedToMongo) {
    console.log("MongoDB not connected, returning mock response")
    return res.status(201).json({
      ...req.body,
      _id: "mock-" + Date.now(),
      note: "This is a mock response (MongoDB not connected)",
    })
  }

  const product = new Product(req.body)
  product
    .save()
    .then((savedProduct) => {
      console.log("Product saved:", savedProduct)
      res.status(201).json(savedProduct)
    })
    .catch((err) => {
      console.log("Error saving product:", err)
      res.status(400).json({
        error: err.message,
        mockResponse: {
          ...req.body,
          _id: "error-" + Date.now(),
          note: "Mock response due to database error",
        },
      })
    })
})

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server with database running on port ${PORT}`)
})

