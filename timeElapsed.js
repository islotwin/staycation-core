module.exports = () => {
  const start = process.hrtime()
  return () => process.hrtime(start)
}