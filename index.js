const express = require("express");
const app = express()
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');


app.listen(4000)

app.get("/",  (req, res) => {
    res.json("el servidor funciona")
})

console.log("Server running on port 4000");