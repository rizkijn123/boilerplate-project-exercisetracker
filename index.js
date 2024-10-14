const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const md5 = require("md5");
const bodyParser = require("body-parser");
const Datastore = require('nedb');

// Inisialisasi database NeDB
const userDb = new Datastore({ filename: 'users.db', autoload: true });
const exerciseDb = new Datastore({ filename: 'exercises.db', autoload: true });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', (req, res) => {
  const username = req.body.username;
  const id = md5(username);

  const user = {
    username: username,
    _id: id
  };

  userDb.insert(user, (err, newDoc) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(newDoc);
  });
});

app.get('/api/users', (req, res) => {
  userDb.find({}, (err, docs) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.json(docs);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  userDb.findOne({ _id: userId }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not found" });
    }

    const exercise = {
      userId: userId,
      description: description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    };

    exerciseDb.insert(exercise, (err, newExercise) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      res.json({
        username: user.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: new Date(newExercise.date).toDateString(),
        _id: user._id
      });
    });
  });
});

app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  userDb.findOne({ _id: userId }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not found" });
    }

    let query = { userId: userId };

    // Filter berdasarkan tanggal (from dan to)
    if (from || to) {
      let dateobj = {}

      // Pastikan format dari 'from' dan 'to' dalam bentuk valid 'yyyy-mm-dd'
      if (from) {
        dateobj["$gte"] = new Date(from);
      }
      if (to) {
        dateobj["$lte"] = new Date(to);
      }
    }

    // Menemukan latihan dengan batasan limit (limit diubah menjadi angka)
    exerciseDb.find(query).limit(+limit ?? 500).exec((err, exercises) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Membuat log sesuai dengan format yang diminta
      const log = exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      }));

      // Mengembalikan respons dengan struktur JSON yang sesuai
      res.json({
        username: user.username,
        count: log.length,
        _id: user._id,
        log: log
      });
    });
  });
});








const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});