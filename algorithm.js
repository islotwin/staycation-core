const roads = require('./getRoads.js')

module.exports = (start = { lng: -78.94497078111351, lat: 42.92790541070884 }, goal = { lng: -79.13298961331189, lat: 42.96236429963978 }) => {
  console.log('started')
  // TODO, what if there are different points in the same distance from starting point ?
  const startId = getNearestNodes(start)[0].id
  const goalSet = getNearestNodes(goal)
  console.log('goalSet', goalSet)

  const cameFrom = {}
  const h = _h(getNodeCoordinates(getNode(goalSet[0].id)))

  let closedSet = []
  let openSet = [startId]

  const gScore = {}
  gScore[startId] = 0

  const fScore = {}
  fScore[startId] = h(startId)

  while(openSet.length) {
    const x = openSet.reduce((r, xx) => {
      if (r == null || fScore[r.id] == null)
        return xx
    
      if (fScore[xx.id] != null && fScore[xx.id] < fScore[r.id])
        return xx

      return r
    }, null)
    if(goalSet.find(g => g.id === x)) {
      console.log('found path')
      return reconstructPath(cameFrom, x)
    }

    openSet = openSet.filter(n => n !== x)
    closedSet = [...closedSet, x]

    for (let y of getNeighbours(x)) {
      if(closedSet.find(n => n === y)) {
        console.log('visited', y)
        continue
      }
      const tentativeGScore = gScore[x] + getDistanceToNode(y)
      let tentativeIsBetter = false
      if(!openSet.find(n => n === y)) {
        openSet = [...openSet, y]
        // console.log('openSet', openSet)
        // h_score[y] := heuristic_estimate_of_distance_to_goal_from(y) ????
        tentativeIsBetter = true
      }
      else if(tentativeGScore < gScore[y]) {
        tentativeIsBetter = true
      }
      if(tentativeIsBetter) {
        cameFrom[y] = x
        gScore[y] = tentativeGScore
        fScore[y] = gScore[y] + h(y)
      }
    }
  }
  console.log('return []')
  return []
}

// heuristics
const _h = goal => {
  return node => {
    const { coordinates } = getNode(node)
    const startDist = calculateDistance(goal, coordinates[0])
    const endDist = calculateDistance(goal, coordinates[coordinates.length - 1])
    return Math.min(startDist, endDist)
    // const n = getNode(node)
    // return calculateDistance(getNodeCoordinates(n), goal)
    // TODO, for now looks for shortest path between 2 locations
  }
}

// for returning final path
const reconstructPath = (cameFrom, node) => {
  if(cameFrom[node]) {
    const p = reconstructPath(cameFrom, cameFrom[node])
    return [...p, getNode(node)]
  }
  return []
}

// get neighbours ids of current node
const getNeighbours = node => {
  const { coordinates } = getNode(node)
  const { lng, lat } = coordinates[coordinates.length - 1] || {}
  // const { lng, lat } = getNodeCoordinates(getNode(node))

  return roads.filter(n => {
      const { lng: nlng, lat: nlat } = n.coordinates[0]
      // pytanie czy sa dwukierunkowe czy tak jak zapisana kolejnosc
      const { lng: nnlng, lat: nnlat } = n.coordinates[n.coordinates.length - 1]
      return (lng === nlng && lat === nlat) || (lng === nnlng && lat === nnlat)
      // return (lng === nlng && lat === nlat)
    })
    .map(n => n.id)
}

// get length of the chosen road
const getDistanceToNode = node => {
  // change to km
  const { coordinates } = getNode(node)
  return coordinates.slice(1).reduce((acc, x, index) => {
    return acc + calculateDistance(coordinates[index], x)
  }, 0)
}

const calculateDistance = (from, to) => {
  return Math.sqrt(Math.pow((from.lat-to.lat), 2) + Math.pow((from.lng-to.lng), 2)).toFixed(6)
}

const getNode = node => {
  return roads.find(n => n.id === node)
}

const getNearestNodes = location => {
  let min = []
  for (let { id, coordinates } of roads) {
    const { distance } = min[0] || {}
    const startDist = calculateDistance(location, coordinates[0])
    const endDist = calculateDistance(location, coordinates[coordinates.length - 1])
    const calcDist = Math.min(startDist, endDist)
    // const calcDist = calculateDistance(location, getNodeCoordinates({ coordinates }))
    if(distance == null || (calcDist < distance)) {
        min = [{ id, distance: calcDist }]
      }
    else if(calcDist === distance) {
      min = [...min, { id, distance: calcDist }]
    }
  }
  return min
}

const getNodeCoordinates = ({ id, coordinates }) => {
  return coordinates[coordinates.length - 1]
}