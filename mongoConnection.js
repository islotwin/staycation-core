config = require('./config.json');

var http = require('http');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = config.url;

// Database Name
const dbName = 'SPDB';

// Create a new MongoClient
const client = new MongoClient(url);


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
            console.log(result);
            console.log(crossingRoadsId);
            return crossingRoadsId;
          });
    });
}


client.connect(function(err) {
    assert.equal(null, err);
    console.log("Connected successfully to server");
    const db = client.db(dbName);
    roads = db.collection('roads');
    // resetSightSeeingRoads(100, roads);
    // setTwoWayRoads(0.8);

});








