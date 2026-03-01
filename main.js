console.log("JS loaded");

// Create the map
const MyMap = L.map('mapbox').setView([-15, -60], 4);

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(MyMap);

// Helper function for date presentation
function formatDate(yyyymmdd) {
  const year = yyyymmdd.substring(0, 4);
  const month = yyyymmdd.substring(4, 6);
  const day = yyyymmdd.substring(6, 8);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${year} ${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
}

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
        EndDate: cols[3].trim()
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

        // Hover tooltip
        layer.bindTooltip(feature.properties.NAME, {
          sticky: true
        });

        // Click behavior
        layer.on("click", function () {

          const countryName = feature.properties.NAME;

          const matches = sovData
            .filter(row => row.Name === countryName)
            .sort((a, b) => a.StartDate.localeCompare(b.StartDate));
            
          document.getElementById("info").innerText =
            matches.map(m => m.Name + " - " + m.PolityID + " (" +
              formatDate(m.StartDate) + " - " + formatDate(m.EndDate) + ")").join("\n");

        });
      }
    });
    southAmericaLayer.addTo(MyMap);
  });