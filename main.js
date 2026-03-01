console.log("JS loaded");

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

    const southAmericaLayer = L.geoJSON(data, {

  filter: function(feature) {
    return feature.properties.CONTINENT === "South America";
  },

  style: function() {
    return {
      color: "#0033cc",
      weight: 2,
      fillOpacity: 0.3
    };
  },

  onEachFeature: function(feature, layer) {
  layer.on("click", function() {
    console.log("clicked", feature.properties.NAME);
    document.getElementById("info").innerText = "CLICK WORKED";
  });
}
}

});
    southAmericaLayer.addTo(MyMap);

  });