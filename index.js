const express = require("express");
const app = express()
const path = require("path");
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
const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkjasbfoafnqwojfbqwijfm13rboj12ren1oinoqwndipw';


app.listen(4000)

const corsOptions = {
  origin: 'http://localhost:5173/',
  credentials: true,
};
app.use(cors(corsOptions));

app.use(cors({ origin: 'http://localhost:5173/', credentials:true }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173/');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
  });
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));
mongoose.connect('mongodb+srv://euge060406:ElonMusk0604@cluster0.srv4o5i.mongodb.net/?retryWrites=true&w=majority');



app.get("/",  (req, res) => {
    res.json("el servidor funciona")
})




app.post('/register', async (req,res) => {
    const {username,password} = req.body;
  try{
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt),
    });
    res.json(userDoc);
  } catch(e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post('/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  const passOk =  bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
      if (err) throw err;
      res.cookie('token', token, { secure: true, httpOnly: true }).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('Usuario o contraseña incorrecta');
  }
});

app.get('/profile', (req,res) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, secret, (err, info) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    } 
    res.json(info);
  });
});

app.post('/logout', (req,res) => { 
  res.cookie('token', '').json('ok');
});







app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
    
    const {title, summary, content,author,category} = req.body;
    const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author,
        category,
    })



    res.json(postDoc);
});


app.get("/post", async (req, res) => {
    res.json(await Post.find()
    .sort({createdAt: -1})
    .limit(50)
    );
})


app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id);
  res.json(postDoc);
})

console.log("Server running on port 4000");



/*      res.cookie('token', token).json({
  id:userDoc._id,
  username,*/