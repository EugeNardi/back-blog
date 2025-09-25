// app.js
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");

// CONFIG: usa variables de entorno en Vercel (ver instrucciones abajo)
const MONGO_URI = process.env.MONGODB_URI || "your-mongodb-uri-here";
const JWT_SECRET = process.env.JWT_SECRET || "changeme_in_production";

const PORT = process.env.PORT || 4000;

// -----------------------
// Conectar a MongoDB
// -----------------------
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err && err.message ? err.message : err);
  });

// -----------------------
// CORS
// -----------------------
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://noticias-x.netlify.app";
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  credentials: true,
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // preflight

// -----------------------
// Middlewares
// -----------------------
app.use(express.json());
app.use(cookieParser());

// -----------------------
// Uploads: asegurar carpeta y storage
// -----------------------
const uploadDir = path.join(__dirname, "uploads");
try {
  fs.mkdirSync(uploadDir, { recursive: true }); // crea si no existe
} catch (err) {
  console.error("No se pudo crear uploads dir:", err);
}
// multer diskStorage para nombres únicos (evita renameSync problemático)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    const filename = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, filename);
  },
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB límite (ajusta si necesitás)
});

// Servir archivos estáticos (cuando se ejecuta en un servidor tradicional)
app.use("/uploads", express.static(uploadDir));

// -----------------------
// Rutas
// -----------------------
app.get("/", (req, res) => res.json({ ok: true, msg: "Servidor funcionando" }));

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, 10),
    });
    res.json(userDoc);
  } catch (e) {
    console.error("Error register:", e && e.message ? e.message : e);
    res.status(400).json({ error: "Error en registro", details: e });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.findOne({ username });
    if (!userDoc) return res.status(400).json({ error: "Usuario no encontrado" });
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (!passOk) return res.status(400).json({ error: "Usuario o contraseña incorrecta" });

    jwt.sign({ username, id: userDoc._id }, JWT_SECRET, {}, (err, token) => {
      if (err) {
        console.error("JWT sign error:", err);
        return res.status(500).json({ error: "Error generando token" });
      }
      res
        .cookie("token", token, {
          secure: process.env.NODE_ENV === "production", // true en prod
          httpOnly: true,
          sameSite: "none",
        })
        .json({ id: userDoc._id, username });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Error en login" });
  }
});

app.get("/profile", (req, res) => {
  try {
    const { token } = req.cookies;
    if (!token) return res.status(401).json({ error: "Token no proporcionado" });
    jwt.verify(token, JWT_SECRET, (err, info) => {
      if (err) return res.status(401).json({ error: "Token inválido" });
      res.json(info);
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Error leyendo perfil" });
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", { sameSite: "none", secure: process.env.NODE_ENV === "production" }).json("ok");
});

// -----------------------
// Crear Post (con upload seguro)
// -----------------------
app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  console.log("📥 /post recibido - body:", req.body);
  console.log("📎 file:", req.file ? { filename: req.file.filename, path: req.file.path, size: req.file.size } : null);

  try {
    const { title, summary, content, author, category } = req.body;

    // si multer guardó el archivo lo referenciamos como ruta pública
    let cover = null;
    if (req.file) {
      cover = "/uploads/" + req.file.filename; // ruta que sirve este mismo servidor
    }

    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover,
      author,
      category,
    });

    res.json(postDoc);
  } catch (err) {
    console.error("❌ Error creando post:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Error al crear la noticia", details: err && err.message ? err.message : err });
  }
});

app.get("/post", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(posts);
  } catch (err) {
    console.error("Error get /post:", err);
    res.status(500).json({ error: "Error al obtener posts" });
  }
});

app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const postDoc = await Post.findById(id);
    if (!postDoc) return res.status(404).json({ error: "Post no encontrado" });
    res.json(postDoc);
  } catch (err) {
    console.error("Error get /post/:id:", err);
    res.status(500).json({ error: "Error al obtener post" });
  }
});

// -----------------------
// Error handler genérico
// -----------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(500).json({ error: "Internal Server Error", details: err && err.message ? err.message : err });
});

// -----------------------
// Export / Start
// -----------------------
module.exports = app;
if (require.main === module) {
  app.listen(PORT, () => console.log(`✅ Server en puerto ${PORT}`));
}

/*
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
  origin: 'https://noticias-x.netlify.app',
  credentials: true,
};
app.use(cors(corsOptions));

app.use(cors({ origin: 'https://noticias-x.netlify.app', credentials:true }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://noticias-x.netlify.app');
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