// Essential Setup
const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// express server
app.get("/", (req, res) => {
	res.send("Tiger Spirit Martial Art Academy server is running......");
});

// MongoDB Database
const uri = `mongodb+srv://${process.env.DB_APP_ID}:${process.env.DB_APP_PASS}@cluster0.coz8j6b.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true
	}
});

const instructorCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("instructor");
const classCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("class");

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		await client.connect();

		

		// Send a ping to confirm a successful connection
		await client.db("admin").command({ ping: 1 });
		console.log(
			"Pinged your deployment. You successfully connected to MongoDB!"
		);
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.listen(port, () => {
	console.log(
		`Tiger Spirit Martial Art Academy server is running on port: ${port}`
	);
});
