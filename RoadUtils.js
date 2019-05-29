const dbService = require('./mongoConnection.js')
  
class RoadUtils {
  constructor(roads) {
    this.roads = roads
  }

  static async getRoads() {
    const roads = await dbService.getAllRoads()
    return roads.map(mapper)
  }

  static async getInstance() {
    const roads = await RoadUtils.getRoads()
    return new RoadUtils(roads)
  }

  getSightSeeingRoutes() {
    return this.roads.filter(r => r.sightSeeing)
  }

// get node from [roads] by given id
  getNode(nodeId) {
    const id = nodeId.endsWith('R') ? nodeId.slice(0, nodeId.length - 1) : nodeId
    return this.roads.find(r => r.id === id)
  }

}

const mapper = ({ properties, geometry, twoWay, sightSeeing }) => {
  return {
    id: properties.FacilityID,
    coordinates: geometry.coordinates.map(([lng, lat]) => ({ lng, lat })),
    twoWay: !!twoWay || true,
    sightSeeing
  }
}

module.exports = {
  RoadUtils
}