const {
  RoadUtils
} = require('./RoadUtils.js')

const {
  getRoadLength,
  calculateDistance,
  PRECISION
} = require('./distance.js')

const SPREAD = 10

module.exports = async (
    start = { lng: -78.94497078111351, lat: 42.92790541070884 }, 
    goal = { lng: -79.13298961331189, lat: 42.96236429963978 },
    sightSeeingDistance = 0,
    shortest = true
    ) => {
      // console.log('Looking for path... [ start, goal ]', start, goal)
      if (shortest === 'false') {
        shortest = false
      }
      const roadUtils = await RoadUtils.getInstance()
      const roads = roadUtils.roads
      const getTravelTime = roadUtils.getTravelTime

      const goalSet = getNearestNodes(goal, roads, false)
      const goalCoordinates = getNearestCoordinates(goal, goalSet[0])
      const startSet = getStartSet(start, roads)

      const sightSeeingLength = roadUtils.getSightSeeingRoutes()
        .reduce((acc, { coordinates }) =>  acc + getRoadLength(coordinates))

      if(sightSeeingDistance > sightSeeingLength) {
        console.log("Not enough sightseeing roads!")
        return { path: [], sightSeeingDistance: 0, distance: 0, time: 0 };
      }

      // keep track of path
      const cameFrom = {}
      startSet.forEach(n => {
        cameFrom[n.id] = { reversed: n.reversed }
      })
      const _heuristics = heuristics(roadUtils, goalCoordinates, shortest)
      const _getNeighbours = getNeighbours(roads)

      // nodes already visited
      let closedSet = []
      // nodes to visit
      let openSet = [...startSet]

      const distanceToGo = {}
      const gScore = {}
      startSet.forEach(({ id, sightSeeing, coordinates, maxSpeed }) => {
        if(id.endsWith('R')) {
          const roadLength = +getRoadLength(coordinates)

          gScore[id] = shortest ? roadLength : getTravelTime(roadLength, maxSpeed)
          distanceToGo[id] = sightSeeing ? sightSeeingDistance - roadLength : sightSeeingDistance
        }
        else {
          gScore[id] = 0
          distanceToGo[id] = sightSeeingDistance
        }
      })

      const fScore = {}
      startSet.forEach(({ id, location }) => {
        fScore[id] = +(_heuristics(location, distanceToGo[id]) + gScore[id]).toFixed(6)
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
          if(distanceToGo[x.id] <= 0) {
            console.log('Path found [ start, goal ]', start, goal)
            const path = reconstructPath(roadUtils, cameFrom, x.id)
            // path.map(p => console.log('path', p.id, p.maxSpeed))
            return { 
              path, 
              sightSeeingDistance: path.reduce((acc, r) => {
                  if(r.sightSeeing) {
                    return acc + getRoadLength(r.coordinates)
                  }
                  return acc
                }, 0),
                distance: +path.reduce((acc, { coordinates }) => acc + getRoadLength(coordinates), 0).toFixed(PRECISION),
                time: +path.reduce((acc, { coordinates, maxSpeed }) => acc + getTravelTime(getRoadLength(coordinates), maxSpeed), 0).toFixed(PRECISION)
              }
          }
          openSet = openSet.filter(n => n.id !== x.id)
          continue
        }

        openSet = openSet.filter(n => n.id !== x.id)
        closedSet = [...closedSet, x]

        _getNeighbours(x).forEach(y => {
          if(closedSet.find(n => n.id === y.id)) {
            return
          }

          const yCoordinates = roadUtils.getNode(y.id).coordinates
          const roadLength = +(getRoadLength(yCoordinates))
          const cost = shortest ? roadLength : getTravelTime(roadLength, y.maxSpeed)

          const tentativeGScore = (gScore[x.id] + cost).toFixed(PRECISION)
          let tentativeIsBetter = false

          if(!openSet.find(n => n.id === y.id)) {
            openSet = [...openSet, y]
            tentativeIsBetter = true
          }
          else if(tentativeGScore < gScore[y.id]) {
            tentativeIsBetter = true
          }

          if(tentativeIsBetter) {
            distanceToGo[y.id] = y.sightSeeing ? distanceToGo[x.id] - roadLength : distanceToGo[x.id]
            cameFrom[y.id] = { from: x.id, reversed: y.reversed }
            gScore[y.id] = +tentativeGScore
            fScore[y.id] = +(gScore[y.id] + _heuristics(y.location, distanceToGo[y.id])).toFixed(PRECISION)
          }
        })
      }

      console.log('Path not found: [ start, goal ]', start, goal)
      return { path: [], sightSeeingDistance: 0, distance: 0, time: 0 };
}

// heuristics
const heuristics = (roadUtils, goal, shortest) => {
  const sightSeeingRoutes = roadUtils.getSightSeeingRoutes()

  // choose coordinates of the point explicitly 
  return (coordinates = {}, distanceToGo = 0) => {
    if(distanceToGo <= 0) {
      const distance = calculateDistance(goal, coordinates)
      return shortest ? distance : roadUtils.estimateTravelTime(distance)
    }
    if (goal.lat === coordinates.lat && goal.lng === coordinates.lng) {
      return Infinity
    }
    const distance = getNearestSightSeeingRoutes(sightSeeingRoutes, goal, coordinates)[0].estimated

    return shortest ? distance : roadUtils.estimateTravelTime(distance)
  }
}

const getNearestSightSeeingRoutes = (
    sightSeeingRoutes,
    goal, 
    location, 
    r = +(calculateDistance(goal, location) / 2).toFixed(PRECISION), 
    foundRoutes = []
  ) => {
  const center = {
    lat: (goal.lat + location.lat) / 2,
    lng: (goal.lng + location.lng) / 2
  }
  const nearest = sightSeeingRoutes.reduce((acc, curr) => {
    if(acc.find(f => f.id === curr.id)) {
      return acc
    }
    const start = curr.coordinates[0]
    const end = curr.coordinates[curr.coordinates.length - 1]
    const startDist = +calculateDistance(center, start).toFixed(PRECISION)
    const endDist = +calculateDistance(center, end).toFixed(PRECISION)
    if(startDist <= r && endDist <= r) {
      const length = calculateDistance(start, end)
      return [
        ...acc, 
        {
          ...curr,
          estimated: Math.min(
              +(calculateDistance(location, start) + calculateDistance(goal, end) + length).toFixed(PRECISION),
              +(calculateDistance(location, end) + calculateDistance(goal, start) + length).toFixed(PRECISION)
            ),
          length
        }
      ]
    }
    return acc
  }, foundRoutes).sort((a, b) => a.estimated < b.estimated)
  if(nearest.length < SPREAD) {
    return getNearestSightSeeingRoutes(sightSeeingRoutes, goal, location, r*2, nearest)
  }
  return nearest.slice(0, SPREAD)
}

// for returning final path
const reconstructPath = (roadUtils, cameFrom, nodeId) => {
  const { from, reversed } = cameFrom[nodeId] || {}
  const node = roadUtils.getNode(nodeId)
  const coordinates = reversed ? node.coordinates.reverse() : node.coordinates
  if(from) {
    const p = reconstructPath(roadUtils, cameFrom, from)
    return [ ...p, { ...node, coordinates } ]
  }
  // if(nodeId.endsWith('R')) {
  if(node) {
    return [ { ...node, coordinates } ]
  }
  return []
}

// get neighbours of current node
const getNeighbours = roads => ({ id, location }) => {
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
            reversed: false,
            sightSeeing: curr.sightSeeing,
            maxSpeed: curr.maxSpeed
          }]
      }
      if(lng === last.lng && lat === last.lat && curr.twoWay) {
        return [
          ...acc,
          {
            id: curr.id,
            location: first,
            reversed: true,
            sightSeeing: curr.sightSeeing,
            maxSpeed: curr.maxSpeed
          }]
      }
      return acc
  }, [])
}

// return set of the nearest nodes to given location
// fromLocation says if we want to find nearest nodes routing from given location (vs going to given location)
const getNearestNodes = (location, roads, fromLocation = true) => {
  return roads.reduce(( { min, distance }, n) => {
    const { twoWay, coordinates } = n
    const startDist = twoWay || fromLocation ? calculateDistance(location, coordinates[0]) : Infinity
    const endDist = twoWay || !fromLocation ? calculateDistance(location, coordinates[coordinates.length - 1]) : Infinity
    const calcDist = Math.min(startDist, endDist)

    if(distance == null || (calcDist < distance)) {
      return { 
        min: [{ ...n }],
        distance: calcDist
      }
    }

    if(calcDist === distance) {
      return {
        min: [...min, { ...n }],
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

const getStartSet = (start, roads) => {
  return getNearestNodes(start, roads).reduce((acc, n) => {
      const startCoordinates = getNearestCoordinates(start, n)
      const reversed = n.coordinates[0] !== startCoordinates
      const node = {
            id: n.id,
            location: startCoordinates,
            reversed,
            sightSeeing: n.sightSeeing,
            maxSpeed: n.maxSpeed,
            coordinates: n.coordinates
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
          reversed: !reversed,
          sightSeeing: n.sightSeeing,
          maxSpeed: n.maxSpeed,
          coordinates: n.coordinates
        }]
    }, [])
}