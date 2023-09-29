const express = require("express");

const app = express()

app.listen(4000)

app.get("/",  (req, res) => {
    res.json("el servidor funciona")
})

console.log("Server running on port 4000");