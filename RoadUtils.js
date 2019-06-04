const dbService = require('./mongoConnection.js')
  
class RoadUtils {
  constructor(roads) {
    this.roads = roads
    this.maxSpeed = this.getMaxSpeed()
    console.log('this.maxSpeed', this.maxSpeed)
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

  getMaxSpeed() {
    return this.roads.reduce((acc, { maxSpeed }) => {
      return Math.max(acc, maxSpeed)
    }, 0)
  }

  estimateTravelTime(roadLength) {
    return this.getTravelTime(roadLength, this.maxSpeed)
  }

  getTravelTime(roadLength, speed) {
    return +(roadLength / speed).toFixed(6)
  }

}

const mapper = ({ properties, geometry, twoWay, sightSeeing, maxSpeed }) => {
  return {
    id: properties.FacilityID,
    coordinates: geometry.coordinates.map(([lng, lat]) => ({ lng, lat })),
    twoWay: !!twoWay,
    sightSeeing,
    maxSpeed: maxSpeed > 1 ? 2 : 1
  }
}

module.exports = {
  RoadUtils
}