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
        PolityID: cols[0].trim(),
        Name: cols[1].trim(),
        StartDate: cols[2].trim(),
        EndDate: cols[3].trim(),
        DisplayName: cols[4].trim()
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

        layer.on("click", function () {

          const countryName = feature.properties.NAME;

          const matches = sovData.filter(row => row.Country === countryName);

          console.log("Clicked:", countryName);
          console.log("Matches:", matches);

          document.getElementById("info").innerText =
            matches.map(m => m.DisplayName + " (" + m.StartDate + "-" + m.EndDate + ")").join("\n");

        });
      }
    });
    southAmericaLayer.addTo(MyMap);
  });