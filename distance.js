const PRECISION = 6

// ‘Haversine’ formula
const calculateDistance = ({ lat, lng }, { lat: lat2, lng: lng2 }) => {
  const p = 0.017453292519943295    // Math.PI / 180
  const c = Math.cos
  const a = 0.5 - c((lat2 - lat) * p)/2 + 
          c(lat * p) * c(lat2 * p) * 
          (1 - c((lng2 - lng) * p))/2

  return +(12742000 * Math.asin(Math.sqrt(a))).toFixed(PRECISION) // 2 * R; R = 6371 000 m
}

// get length of the chosen road
const getRoadLength = (coordinates = []) => {
  // change to km
  return +(coordinates.slice(1).reduce((acc, curr, index) => {
    return acc + calculateDistance(coordinates[index], curr)
  }, 0)).toFixed(PRECISION)
}

// be sure to return a number
// const calculateDistance = (from, to) => {
//   return +Math.sqrt(Math.pow((from.lat - to.lat), 2) + Math.pow((from.lng - to.lng), 2)).toFixed(PRECISION)
// }

module.exports = {
  calculateDistance,
  getRoadLength,
  PRECISION
}