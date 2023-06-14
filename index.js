// Essential Setup
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
const corsConfig = {
	origin: "",
	credentials: true,
	methods: ["GET", "POST", "PUT", "DELETE"]
};
app.use(cors());
app.options("", cors(corsConfig));
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

const userCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("user");
const instructorCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("instructor");
const classCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("class");
const selectedClassCollection = client
	.db("tigerSpiritMartialArtAcademyDB")
	.collection("selectedClass");

// create class index based on enrollment
classCollection.createIndex({ enroll: 1 });

// JSON WEB TOKEN
const JWT_SECRECT = process.env.JWT_SECRECT;
const verifingJWT = (req, res, next) => {
	const authorization = req.headers.authorization;

	if (!authorization) {
		return res
			.status(401)
			.send({ error: true, message: "unauthorized access" });
	}
	const token = authorization.split(" ")[1];
	jwt.verify(token, JWT_SECRECT, (err, decoded) => {
		if (err) {
			return res
				.status(403)
				.send({ error: true, message: "unauthorized access" });
		}
		req.decoded = decoded;
		next();
	});
};

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		// await client.connect();

		// JWT
		app.post("/jwt", (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, JWT_SECRECT, { expiresIn: "1h" });
			res.send({ token });
		});

		// get all users
		app.get("/users", async (req, res) => {
			const result = await userCollection.find().toArray();
			res.send(result);
		});

		// get single user
		app.get("/users/:uid", async (req, res) => {
			const userUid = req.params.uid;
			const query = { uid: userUid };
			const result = await userCollection.findOne(query);
			res.send(result);
		});

		// post user
		app.post("/users", async (req, res) => {
			const user = req.body;
			const isAnyUser = await userCollection.find().toArray();
			if (isAnyUser.length == 0) {
				user.role = "admin";
			}
			const result = await userCollection.insertOne(user);
			res.send(result);
		});

		

		// make user as admin
		app.put("/users/:userUid/makeAdmin", async (req, res) => {
			const userUid = req.params.userUid;
			const filter = { uid: userUid };
			const update = {
				$set: {
					role: "admin"
				}
			};
			const result = await userCollection.updateOne(filter, update);
			res.send(result);
		});

		// get all instructors
		app.get("/instructors", async (req, res) => {
			const result = await instructorCollection.find().toArray();
			res.send(result);
		});

		// get popular instructors
		app.get("/popularInstructors", async (req, res) => {
			const result = await instructorCollection.find().limit(6).toArray();
			res.send(result);
		});

		// get all classes based on instructor
		app.get("/classes/:instructorUid", async (req, res) => {
			const instructorUid = req.params.instructorUid;
			const filter = { "instructor.uid": instructorUid };
			const result = await classCollection.find(filter).toArray();
			res.send(result);
		});

		// get all approved classes
		app.get("/classes", async (req, res) => {
			const query = { approved: true };
			const result = await classCollection.find(query).toArray();
			res.send(result);
		});

		// get single class
		app.get("/classes/:classId", async (req, res) => {
			const classId = req.params.classId;
			console.log(classId);
			const filter = { _id: new ObjectId(classId) };
			const result = await classCollection.findOne(filter);
			res.send(result);
		});

		// post class
		app.post("/class", async (req, res) => {
			const classObj = req.body;
			const result = await classCollection.insertOne(classObj);
			res.send(result);
		});

		// get popular classes
		app.get("/popularClasses", async (req, res) => {
			const result = await classCollection.find().limit(10).toArray();
			res.send(result);
		});

		// post students classes
		app.post("/selectedClass/:selectedClass", async (req, res) => {
			const selectedClassId = req.params.selectedClass;
			const { classUpdatableData, selectedClassObj } = req.body;
			const filter = { _id: new ObjectId(selectedClassId) };
			const updateSeats = {
				$set: {
					availableSeats: classUpdatableData.availableSeats,
					enroll: classUpdatableData.enroll
				}
			};
			const isClassAlreadySelected =
				await selectedClassCollection.findOne({
					name: selectedClassObj.name,
					studentUid: selectedClassObj.studentUid
				});
			if (isClassAlreadySelected) {
				res.send({ status: "You are already selected this class" });
			} else {
				const updateSeatsResult = await classCollection.updateOne(
					filter,
					updateSeats
				);
				const addSelectedClassResult =
					await selectedClassCollection.insertOne(selectedClassObj);
				const result = {
					modifiedCount: updateSeatsResult.modifiedCount,
					insertedId: addSelectedClassResult.insertedId
				};
				res.send(result);
			}
		});

		// get students selected class
		app.get("/student/:uid/selectedClass", async (req, res) => {
			const studentUid = req.params.uid;
			const filter = { studentUid, isPaid: false };
			const result = await selectedClassCollection.find(filter).toArray();
			res.send(result);
		});

		// get students enrolled class
		app.get("/student/:uid/enrolledClass", async (req, res) => {
			const studentUid = req.params.uid;
			const filter = { studentUid, isPaid: true };
			const result = await selectedClassCollection.find(filter).toArray();
			res.send(result);
		});

		// update students selected class to enrolled class
		app.put("/student/:user/enrollment", async (req, res) => {
			const selectedClassId = req.query.enrollClass;
			const filter = { _id: new ObjectId(selectedClassId) };
			const query = { $set: { isPaid: true } };
			const result = await selectedClassCollection.updateOne(
				filter,
				query
			);
			res.send(result);
		});

		// delete students selected class to enrolled class
		app.delete("/student/:user/delete", async (req, res) => {
			const classId = req.query.class;
			const filter = { _id: new ObjectId(classId) };
			const result = await selectedClassCollection.deleteOne(filter);
			console.log(result);
			res.send(result);
		});

		// approved class
		app.put("/selectedClass/:classId/approved", async (req, res) => {
			const classId = req.params.classId;
			const filter = { _id: new ObjectId(classId) };
			const update = {
				$set: {
					status: "approved"
				}
			};
			const result = await classCollection.updateOne(filter, update);
			console.log(result);
			res.send(result);
		});

		// deny class
		app.put("/selectedClass/:classId/denied", async (req, res) => {
			const classId = req.params.classId;
			const filter = { _id: new ObjectId(classId) };
			const update = {
				$set: {
					status: "denied"
				}
			};
			const result = await classCollection.updateOne(filter, update);
			console.log(result);
			res.send(result);
		});

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
