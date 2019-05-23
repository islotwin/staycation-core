const express = require('express')
const roads = require('./getRoads.js')
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
    const roads = await dbService.getAllRoads()
    const mapped = roads.map(({ properties, geometry, twoWay, sightSeeing }) => ({
      id: properties.FacilityID,
      coordinates: geometry.coordinates.map(([lng, lat]) => ({ lng, lat })),
      twoWay,
      sightSeeing
    }))
    res.json(mapped);
  } catch (e) {
    //this will eventually be handled by your error handling middleware
    next(e) 
  }
})

app.get('/roads/path', (req, res) => {
  const { flng, flat, tlng, tlat } = req.query
  const start = { lng: flng, lat: flat }
  const goal = { lng: tlng, lat: tlat }
  return res.send(aStar(start, goal))
})

app.post('/roads/reset', (req, res) => {
  const { numberOfRoadsPerPoint, numberOfPoints } = req.body
  dbService.setRandomSightSeeingNearPoints(numberOfRoadsPerPoint, numberOfPoints)
  res.send("done")
})

app.listen(port, () => console.log(`App listening on port ${port}...`))