const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(
  cors({
    origin: "https://expolre-bd.vercel.app", // or "http://127.0.0.1:3000"
  })
);


app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cq1rtqv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const usersCollection = client.db("exploreBD").collection("users");
    console.log(" MongoDB connected successfully");

    

    // Register
    app.post("/register", async (req, res) => {
      const { firstName, lastName, email, password } = req.body;
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) return res.status(400).send({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await usersCollection.insertOne({
        firstName,
        lastName,
        email,
        password: hashedPassword,
      });

      const token = jwt.sign({ id: result.insertedId }, process.env.JWT_SECRET, { expiresIn: "1d" });

      res.status(201).send({ message: "User registered", token });
    });

    // Login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email });
      if (!user) return res.status(400).send({ message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).send({ message: "Invalid credentials" });

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.status(200).send({ message: "Login successful", token, user: { id: user._id, firstName: user.firstName, email: user.email } });
    });

    

    // Get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });  

    // Get single user
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid ID" });

      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).send({ message: "User not found" });

      res.send(user);
    });

     // Add new spot/user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Update user
    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid ID" });

      const { _id, password, ...updatedData } = req.body;
      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }

      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      if (result.matchedCount === 0) return res.status(404).send({ message: "User not found" });
      res.send({ message: "User updated successfully" });
    });

    // Delete user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ message: "Invalid ID" });

      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).send({ message: "User not found" });

      res.send({ message: "User deleted successfully" });
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

run().catch(console.dir);

// Default route
app.get("/", (req, res) => {
  res.send("Hello World! This is ExploreBD server.");
});

app.listen(port, () => {
  console.log(` Server is running on port: ${port}`);
});
