const roads = require('./getRoads.js')

const precision = 6

module.exports = (start = { lng: -78.94497078111351, lat: 42.92790541070884 }, goal = { lng: -79.13298961331189, lat: 42.96236429963978 }) => {
  // TODO, what if there are different points in the same distance from starting point ? 
  // get first from list
  const startNode = getNearestNodes(start)[0]
  const startId = startNode.id
  const goalSet = getNearestNodes(goal)

  const startCoordinates = getNearestCoordinates(start, startNode)
  const goalCoordinates = getNearestCoordinates(goal, goalSet[0])
  const startEndCoordinates = startNode.coordinates[0] === startCoordinates ? startNode.coordinates[startNode.coordinates.length - 1] : startNode.coordinates[0]

  // keep track of path
  const cameFrom = {}
  const h = _h(goalCoordinates)

  // nodes already visited
  let closedSet = []

  // reverse start point for finding more paths
  // {id, from, to} helps for tracking the direction of chosen path, [to] is assumed to be current location, [from] previous coordinates, [id] id of current road
  const reversedStart = { id: startId + 'R', from: startCoordinates, to: startEndCoordinates }

  // nodes to visit
  let openSet = [ { id: startId, from: startEndCoordinates, to: startCoordinates }, reversedStart ]

  const gScore = {}
  gScore[startId] = 0
  gScore[reversedStart.id] = +getDistanceToNode(reversedStart.id)

  const fScore = {}
  fScore[startId] = h(startCoordinates)
  fScore[reversedStart.id] = h(startEndCoordinates)

  while(openSet.length) {
    // choose node with smallest fScore (heuristics value)  
    const x = openSet.reduce((r, xx) => {
      if (r == null || fScore[r.id] == null)
        return xx
    
      if (fScore[xx.id] != null && fScore[xx.id] < fScore[r.id])
        return xx

      return r
    }, null)
    
    if(goalSet.find(g => g.id === x.id)) {
      return reconstructPath(cameFrom, x.id)
    }

    openSet = openSet.filter(n => n.id !== x.id)
    closedSet = [...closedSet, x]

    for (let y of getNeighbours(x)) {
      if(closedSet.find(n => n.id === y.id)) {
        continue
      }
      const tentativeGScore = (gScore[x.id] + getDistanceToNode(y.id)).toFixed(precision)
      let tentativeIsBetter = false

      if(!openSet.find(n => n.id === y.id)) {
        openSet = [...openSet, y]
        // h_score[y] := heuristic_estimate_of_distance_to_goal_from(y) ????
        tentativeIsBetter = true
      }
      else if(tentativeGScore < gScore[y.id]) {
        tentativeIsBetter = true
      }

      if(tentativeIsBetter) {
        cameFrom[y.id] = x.id
        gScore[y.id] = +tentativeGScore
        fScore[y.id] = +(gScore[y.id] + h(y.to)).toFixed(precision)
      }
    }
  }

  console.log('path not found: [ start, goal ]', start, goal)
  return []
}

// heuristics
const _h = goal => {
  // choose coordinates of the point explicitly 
  return (coordinates = {}) => {
    return calculateDistance(goal, coordinates)
    // TODO, for now looks for shortest path between 2 locations
  }
}

// for returning final path
const reconstructPath = (cameFrom, nodeId) => {
  if(cameFrom[nodeId]) {
    const p = reconstructPath(cameFrom, cameFrom[nodeId])
    return [...p, getNode(nodeId)]
  }
  if(nodeId != null && nodeId.endsWith('R')) {
    return [ getNode(nodeId) ]
  }
  return []
}

// get neighbours ids of current node
const getNeighbours = ({ id, from, to }) => {
  const { lng, lat } = to
  return roads.reduce((acc, curr) => {
      const first = curr.coordinates[0]
      const last = curr.coordinates[curr.coordinates.length - 1]
      if(lng === first.lng && lat === first.lat) {
        return [
          ...acc,
          {
            id: curr.id,
            from: first,
            to: last
          }]
      }
      if(lng === last.lng && lat === last.lat) {
        return [
          ...acc,
          {
            id: curr.id,
            from: last,
            to: first
          }]
      }
      return acc
  }, [])
}

// get length of the chosen road
const getDistanceToNode = node => {
  // change to km
  const { coordinates } = getNode(node)
  return +coordinates.slice(1).reduce((acc, curr, index) => {
    return acc + calculateDistance(coordinates[index], curr)
  }, 0).toFixed(precision)
}

// be sure to return a number
const calculateDistance = (from, to) => {
  return +Math.sqrt(Math.pow((from.lat - to.lat), 2) + Math.pow((from.lng - to.lng), 2)).toFixed(precision)
}

// get node from [roads] by given id
const getNode = nodeId => {
  const id = nodeId.endsWith('R') ? nodeId.slice(0, nodeId.length - 1) : nodeId
  return roads.find(n => n.id === id)
}

// return set of the nearest nodes to given location
const getNearestNodes = location => {
  return roads.reduce(( { min, distance }, { id, coordinates }) => {
    const startDist = calculateDistance(location, coordinates[0])
    const endDist = calculateDistance(location, coordinates[coordinates.length - 1])
    const calcDist = Math.min(startDist, endDist)
    if(distance == null || (calcDist < distance)) {
      return { 
        min: [{ id, coordinates }],
        distance: calcDist
      }
    }
    if(calcDist === distance) {
      return {
        min: [...min, { id, coordinates }],
        distance
      }
    }
    return {
      min,
      distance
    }
  }, { min: [], distance: null }).min
}

// return nearest coordinates of valid nodes on the map to given location
const getNearestCoordinates = (location, { coordinates = [] }) => {
    const startDist = calculateDistance(location, coordinates[0])
    const endDist = calculateDistance(location, coordinates[coordinates.length - 1])
    return startDist < endDist ? coordinates[0] : coordinates[coordinates.length - 1]
}