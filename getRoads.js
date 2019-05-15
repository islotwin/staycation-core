const ROADS = require('./roads.js')

const getRoads = () => {
  return ROADS.features.map(({ type, geometry, properties }) => {
      return {
        id: properties.FacilityID,
        coordinates: geometry.coordinates.map(([lng, lat]) => ({ lng, lat }))
      }
    })
}

const getBidirectionalRoads = () => {
  const roads = getRoads()
  return [...roads, ...roads.filter(r => Math.random() < 0.9 ).map(({ id, coordinates }) => ({ id: id + 'R', coordinates: coordinates.reverse() }))]
}

module.exports = getRoads()