console.log("JS loaded");

// Create the map
const MyMap = L.map('mapbox').setView([-15, -60], 4);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(MyMap);

// Load sovereignty data
let sovData = [];

fetch("SALite.csv")
  .then(response => response.text())
  .then(text => {

    const rows = text.split("\n").slice(1); // skip header

    sovData = rows.map(row => {
      const cols = row.split(",");
      return {
        Country: cols[0],
        PolityID: cols[1],
        StartDate: cols[2],
        EndDate: cols[3],
        DisplayName: cols[4]
      };
    });

    console.log("Sovereignty loaded:", sovData.length);

  });

// Load GeoJSON
fetch("world.geojson")
  .then(response => response.json())
  .then(data => {

    const southAmericaLayer = L.geoJSON(data, {

      filter: function (feature) {
        return feature.properties.CONTINENT === "South America";
      },

      style: function () {
        return {
          color: "#0033cc",
          weight: 2,
          fillOpacity: 0.3
        };
      },

      onEachFeature: function (feature, layer) {
        layer.bindTooltip(feature.properties.NAME, {
          sticky: true
        });
      }

    });

    southAmericaLayer.addTo(MyMap);

  });