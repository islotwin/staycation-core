const express = require('express')
const roads = require('./getRoads.js')
const aStar = require('./algorithm.js')
const app = express()
const port = 8080

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/roads', (req, res) => res.send(roads))

app.get('/path', (req, res) => {
  const { flng, flat, tlng, tlat } = req.query
  const start = { lng: flng, lat: flat }
  const goal = { lng: tlng, lat: tlat }
  return res.send(aStar(start, goal))
})

app.listen(port, () => console.log(`App listening on port ${port}...`))