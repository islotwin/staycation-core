config = require('./config.json');

var http = require('http');
var geojsonTools = require('geojson-tools');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = config.url;

// Database Name
const dbName = 'SPDB';

// Create a new MongoClient
const client = new MongoClient(url);

const nearPoint = 2;

const lowPer = 0.33;
const midPer = 0.66;


function setRandomSightSeeingRoads(numberOfRoads, coll) {

    idsToChange = [];
    coll.aggregate([ { $sample: { size: numberOfRoads } } ] ).toArray(function(err, result) {
        if (err) throw err;
        for (i = 0; i < result.length; i++){
            idsToChange.push(result[i].properties.FacilityID);
        }
        console.log(idsToChange);
        
        query = { "properties.FacilityID" : {$in: idsToChange}};
        console.log(query);

        newValue = {$set: {sightSeeing: 1} };

        coll.updateMany(query, newValue, function(err, res) {
            if (err) throw err;
            console.log(res.result.nModified + " document(s) updated");
          });
      });
}

function setRandomSightSeeingNearPoints(numberOfRoadsPerPoint, numberOfPoints, coll) {

    idsOfRandomPoints = [];
    idsNearPoint = [];
    idsToChange = [];
    
    coll.aggregate([ { $sample: { size: numberOfPoints } } ] ).toArray(function(err, result) {
        if (err) throw err;
        for (i = 0; i < result.length; i++){
            idsOfRandomPoints.push(result[i].properties.FacilityID);
        }
        
        idsOfRandomPoints.forEach(function(listItem, i) {
            roads.findOne({ "properties.FacilityID": idsOfRandomPoints[i]}, function(err, result) {
                if (err) throw err;
                coords = result.geometry.coordinates[0];
                roads.find({ geometry:
                    { $geoWithin:
                    { $centerSphere: [ coords, nearPoint / 3963.2 ] } } }).toArray(function(err, result) {
                        result.forEach(function(listItem, i) {
                            idsNearPoint.push(result[i].properties.FacilityID);
                        });
                        roads.aggregate([ {$match:{ "properties.FacilityID" : {$in: idsNearPoint}} }, { $sample: { size: numberOfRoadsPerPoint } } ]).toArray(function(err, result) {
                            if (err) throw err;
                            for (i = 0; i < result.length; i++){
                                idsToChange.push(result[i].properties.FacilityID);
                            }

                            query = { "properties.FacilityID" : {$in: idsToChange}};
                    
                            newValue = {$set: {sightSeeing: 1} };
                    
                            coll.updateMany(query, newValue, function(err, res) {
                                if (err) throw err;
                                console.log(res.result.nModified + " document(s) updated");
                              });
                            idsNearPoint = [];
                            idsToChange = [];
                        });
                    });
            });
        });
    });
}




function clearSightSeeingRoads(coll) {
    newValue = {$set: {sightSeeing: 0} };

    coll.updateMany({}, newValue, function(err, res) {
        if (err) throw err;
        console.log(res.result.nModified + " document(s) updated");
      });
}

function resetSightSeeingRoads(numberOfRoads, coll) {
    clearSightSeeingRoads(coll);
    setRandomSightSeeingRoads(numberOfRoads, coll);
}


function setTwoWayRoads(probability) {
    roads.find({}).toArray(function(err, result) {
        for (i = 0; i < result.length; i++){
            id = result[i].properties.FacilityID
            query = { "properties.FacilityID" : id};
            
            if(Math.random() < probability) {
                newValue = {$set: {twoWay: 1} };
            } 
            else {
                newValue = {$set: {twoWay: 0} };
            }
            roads.updateOne(query, newValue, function(err, res) {
                if (err) throw err;
                // console.log(res.result.nModified + " document(s) updated");
            });
        }

    });
}


//id in ""
function getCrossingRoads(id) {
    return new Promise((resolve, reject) => {
        roads.findOne({ "properties.FacilityID": id}, function(err, result) {
            if (err) throw err;
            coords = result.geometry.coordinates;
    
            query = { geometry: { $geoIntersects: { $geometry: { type: "LineString", coordinates: coords } } } };
            roads.find(query).toArray(function(err, result) {
                if (err) throw err;
                crossingRoadsId = [];
                for (i = 0; i < result.length; i++){
                    if(result[i].properties.FacilityID != id) {
                        crossingRoadsId.push(result[i].properties.FacilityID);
                    }
                }
                resolve(crossingRoadsId)
              });
        });
    })
}

function getRoad(id) {
    return new Promise((resolve, reject) => {
        roads.findOne({ "properties.FacilityID": id}, function(err, result) {
            if (err) throw err;
            resolve(result);
        })
    });
}

function getSightSeeingRoads() {
    return new Promise((resolve, reject) => {
        roads.find({sightSeeing: 1}).toArray(function(err, result) {
            if (err) throw err;
            resolve(result);
        })
    });
}

//L, M, H
function setWithBoundaries(type, numberOfRoads) {
    
    distances = [];
    roads.find({}).toArray(function(err, result) {
        for (i = 0; i < result.length; i++){
            coords = result[i].geometry.coordinates
            a = geojsonTools.getDistance(coords, 5);
            distances.push(a);
        }
        distances.sort();
        upperBoundLow = distances[Math.floor(distances.length * lowPer)];
        upperBoundMid = distances[Math.floor(distances.length * midPer)];
        upperBoundHigh = distances[distances.length - 1];

        switch(type) {
            case 'L':
                lowerBound = 0;
                upperBound = upperBoundLow;
            break;
            case 'M':
                lowerBound = upperBoundLow;
                upperBound = upperBoundMid;
            break;
            default:
            case 'H':
                lowerBound = upperBoundMid;
                upperBound = upperBoundHigh;
            break;
        }

        avaiableRoadsIds = [];
        idsToChange = [];

        roads.find({}).toArray(function(err, result) {
            for (i = 0; i < result.length; i++){
                coords = result[i].geometry.coordinates
                dist = geojsonTools.getDistance(coords, 5);
                if(dist >= lowerBound && dist < upperBound) {
                    avaiableRoadsIds.push(result[i].properties.FacilityID);
                    
                }
            }

            roads.aggregate([ {$match:{ "properties.FacilityID" : {$in: avaiableRoadsIds}} }, { $sample: { size: numberOfRoads } } ]).toArray(function(err, result) {
                if (err) throw err;
                for (i = 0; i < result.length; i++){
                    idsToChange.push(result[i].properties.FacilityID);
                    coords = result[i].geometry.coordinates
                    dist = geojsonTools.getDistance(coords, 5);
                    console.log(dist);
                }

                query = { "properties.FacilityID" : {$in: idsToChange}};
        
                newValue = {$set: {sightSeeing: 1} };
        
                roads.updateMany(query, newValue, function(err, res) {
                    if (err) throw err;
                    console.log(res.result.nModified + " document(s) updated");
                });
            });

        });
    });
}


client.connect(async function(err) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    roads = db.collection('roads');

    const id = await getSightSeeingRoads();
    console.log(id);
    
});







