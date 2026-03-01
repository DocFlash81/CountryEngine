console.log("Country Engine starting...");

// Create the map
const MyMap = L.map('mapbox').setView([-15, -60], 4);

// Add tile layer (the base map)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(MyMap);
// Load GeoJSON
fetch("world.geojson")
  .then(response => response.json())
  .then(data => {

    const worldLayer = L.geoJSON(data);
    worldLayer.addTo(MyMap);

  });