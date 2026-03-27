const express = require('express')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const aws = require('aws-sdk')
const multer = require('multer')
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose.connect("mongodb://localhost:27017/devopscse")
    .then(() => console.log("connection success"))
    .catch(() => console.log("connection failed"))

const loginSchema = new mongoose.Schema({
    user: String,
    pass: String
}, { versionKey: false })

const loginmodel = new mongoose.model("csecrypt", loginSchema, "csecrypt")

app.post("/register", async (req, res) => {
    const { user, pass } = req.body
    try {
        const hashedPass = await bcrypt.hash(pass, 10)
        const newuser = new loginmodel({ user, pass: hashedPass })
        await newuser.save()
        res.status(201).send("user register successfully")
    } catch (err) {
        console.error(err)
        res.status(500).send("error")
    }
})

app.post("/login", async (req, res) => {
    const { user, pass } = req.body
    try {
        const userOne = await loginmodel.findOne({ user })
        if (!userOne) return res.status(404).send("Invalid user")
        const passMatch = await bcrypt.compare(pass, userOne.pass)
        if (passMatch) res.send("Login success")
        else res.status(401).send("Invalid password")
    } catch (err) {
        console.error(err)
        res.status(500).send("error")
    }
})

const s3 = new aws.S3({
    accessKeyId:process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY 
})


const upload = multer({ storage: multer.memoryStorage() })

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const { user } = req.body
        if (!user) return res.status(400).send("Username required")
        if (!req.file) return res.status(400).send("File required")

        const userExists = await loginmodel.findOne({ user })
        if (!userExists) return res.status(404).send("User not registered")

        const params = {
            Bucket: "cse-key1",
            Key: `${user}/${req.file.originalname}`, 
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        }

        s3.upload(params, (err, data) => {
            if (err) {
                console.error("S3 upload error:", err)
                return res.status(500).send("Upload failed")
            }
            res.json({
                message: "File uploaded successfully"
            })
        })
    } catch (err) {
        console.error(err)
        res.status(500).send("error")
    }
})

app.listen(4000, () => {
    console.log("server running successfully")
}) 