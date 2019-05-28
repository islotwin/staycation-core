const express = require('express')
const { RoadUtils } = require('./RoadUtils.js')
const aStar = require('./algorithm.js')
const dbService = require('./mongoConnection.js')
const app = express()
const port = 8080

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(express.json())

app.get('/roads', async (req, res, next) => {
  try {
    const roads = await RoadUtils.getRoads()
    res.json(roads);
  } catch (e) {
    //this will eventually be handled by your error handling middleware
    next(e) 
  }
})

app.get('/roads/path', async (req, res) => {
  const { flng, flat, tlng, tlat, dist = 0} = req.query
  const start = { lng: flng, lat: flat }
  const goal = { lng: tlng, lat: tlat }
  const path = await aStar(start, goal, dist)
  return res.send(path)
})

app.put('/roads/sightseeing', async (req, res) => {
  const { numberOfRoadsPerPoint, numberOfPoints } = req.body
  await dbService.setRandomSightSeeingNearPoints(numberOfRoadsPerPoint, numberOfPoints)
  res.send("done")
})

app.put('/roads/twoway', async (req, res) => {
  const { probability } = req.body
  await dbService.setTwoWayRoads(probability)
  res.send("done")
})

app.listen(port, () => console.log(`App listening on port ${port}...`))