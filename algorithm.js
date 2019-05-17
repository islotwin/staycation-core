const roads = require('./getRoads.js')

const precision = 6

module.exports = (start = { lng: -78.94497078111351, lat: 42.92790541070884 }, goal = { lng: -79.13298961331189, lat: 42.96236429963978 }) => {
  console.log('Looking for path... [ start, goal ]', start, goal)
  const goalSet = getNearestNodes(goal, false)
  const goalCoordinates = getNearestCoordinates(goal, goalSet[0])
  const startSet = getStartSet(start)

  // keep track of path
  const cameFrom = {}
  startSet.forEach(n => {
    cameFrom[n.id] = { reversed: n.reversed }
  })
  const h = heuristics(goalCoordinates)

  // nodes already visited
  let closedSet = []
  // nodes to visit
  let openSet = [...startSet]

  const gScore = {}
  startSet.forEach(({ id }) => {
    gScore[id] = id.endsWith('R') ? +getRoadLength(id) : 0
  });

  const fScore = {}
  startSet.forEach(({ id, location }) => {
    fScore[id] = +(h(location) + gScore[id]).toFixed(6)
  })

  while(openSet.length) {
    // choose node with smallest fScore (heuristics value)  
    const x = openSet.reduce((r, xx) => {
      if (r == null || fScore[r.id] == null)
        return xx
    
      if (fScore[xx.id] != null && fScore[xx.id] < fScore[r.id])
        return xx

      return r
    }, null)
    
    if(goalSet.find(g => g.id === x.id || g.id === x.id.slice(0, x.id.length - 1))) {
      console.log('Path found [ start, goal ]', start, goal)
      return reconstructPath(cameFrom, x.id)
    }

    openSet = openSet.filter(n => n.id !== x.id)
    closedSet = [...closedSet, x]

    for (let y of getNeighbours(x)) {
      if(closedSet.find(n => n.id === y.id)) {
        continue
      }

      const tentativeGScore = (gScore[x.id] + getRoadLength(y.id)).toFixed(precision)
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
        cameFrom[y.id] = { from: x.id, reversed: y.reversed }
        gScore[y.id] = +tentativeGScore
        fScore[y.id] = +(gScore[y.id] + h(y.location)).toFixed(precision)
      }
    }
  }

  console.log('Path not found: [ start, goal ]', start, goal)
  return []
}

// heuristics
const heuristics = goal => {
  // choose coordinates of the point explicitly 
  return (coordinates = {}) => {
    return calculateDistance(goal, coordinates)
    // TODO, for now looks for shortest path between 2 locations
  }
}

// for returning final path
// TODO connecting nodes into actual path - some are reversed
const reconstructPath = (cameFrom, nodeId) => {
  const { from, reversed } = cameFrom[nodeId] || {}
  const node = getNode(nodeId)
  const coordinates = reversed ? node.coordinates.reverse() : node.coordinates
  if(from) {
    const p = reconstructPath(cameFrom, from)
    return [ ...p, { ...node, coordinates } ]
  }
  // if(nodeId.endsWith('R')) {
  if(node) {
    return [ { ...node, coordinates } ]
  }
  return []
}

// get neighbours of current node
const getNeighbours = ({ id, location }) => {
  const { lng, lat } = location
  return roads.reduce((acc, curr) => {
      if(id.startsWith(curr.id) || curr.id.startsWith(id)) {
        return acc
      }
      const first = curr.coordinates[0]
      const last = curr.coordinates[curr.coordinates.length - 1]
      if(lng === first.lng && lat === first.lat) {
        return [
          ...acc,
          {
            id: curr.id,
            location: last,
            reversed: false
          }]
      }
      if(lng === last.lng && lat === last.lat && curr.twoWay) {
        return [
          ...acc,
          {
            id: curr.id,
            location: first,
            reversed: true
          }]
      }
      return acc
  }, [])
}

// get length of the chosen road
const getRoadLength = nodeId => {
  // change to km
  const { coordinates } = getNode(nodeId)
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
// fromLocation says if we want to find nearest nodes routing from given location (vs going to given location)
const getNearestNodes = (location, fromLocation = true) => {
  return roads.reduce(( { min, distance }, { id, coordinates, twoWay }) => {
    const startDist = twoWay || fromLocation ? calculateDistance(location, coordinates[0]) : Infinity
    const endDist = twoWay || !fromLocation ? calculateDistance(location, coordinates[coordinates.length - 1]) : Infinity
    const calcDist = Math.min(startDist, endDist)

    if(distance == null || (calcDist < distance)) {
      return { 
        min: [{ id, coordinates, twoWay }],
        distance: calcDist
      }
    }

    if(calcDist === distance) {
      return {
        min: [...min, { id, coordinates, twoWay }],
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
const getNearestCoordinates = (location, { coordinates = [], twoWay }) => {
    const startDist = calculateDistance(location, coordinates[0])
    const endDist = twoWay ? calculateDistance(location, coordinates[coordinates.length - 1]) : Infinity
    return startDist < endDist ? coordinates[0] : coordinates[coordinates.length - 1]
}

const getStartSet = start => {
  return getNearestNodes(start).reduce((acc, n) => {
      const startCoordinates = getNearestCoordinates(start, n)
      const reversed = n.coordinates[0] !== startCoordinates
      const node = {
            id: n.id,
            location: startCoordinates,
            reversed
          }

      if(!n.twoWay) {
        return [ ...acc, node ]
      }

      // reverse start point for finding more paths
      const startEndCoordinates = !reversed ? n.coordinates[n.coordinates.length - 1] : n.coordinates[0]
      return [
        ...acc, 
        node,
        {
          id: n.id + 'R',
          location: startEndCoordinates,
          reversed: !reversed
        }]
    }, [])
}