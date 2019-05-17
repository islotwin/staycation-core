const ROADS = require('./roads.js')

const getRoads = () => {
  return ROADS.features.map(({ type, geometry, properties }) => {
      return {
        id: properties.FacilityID,
        coordinates: geometry.coordinates.map(([lng, lat]) => ({ lng, lat })),
        twoWay: Math.random() < 0.8
      }
    })
}

module.exports = getRoads()