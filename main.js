console.log("JS loaded");

// Create the map
const MyMap = L.map('mapbox').setView([-15, -60], 4);

// Add tile layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
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

    const rows = text.split("\n").slice(1);

    sovData = rows.map(row => {
      const cols = row.split(",");
      return {
        PolityID: cols[0].trim(),
        Name: cols[1].trim(),
        StartDate: cols[2].trim(),
        EndDate: cols[3].trim(),
        Color: cols[4].trim()
      };
    });

    console.log("Sovereignty loaded:", sovData.length);

    // Now load GeoJSON AFTER sovereignty is ready
    return fetch("world.geojson");
  })
  .then(response => response.json())
  .then(data => {

    const southAmericaLayer = L.geoJSON(data, {
      filter: function (feature) {
        return feature.properties.CONTINENT === "South America";
      },

      style: function (feature) {

        const countryName = feature.properties.NAME;
        const matches = sovData.filter(row => row.Name === countryName);
        const fill = matches.length > 0 ? matches[0].Color : "#cccccc";

        return {
          fillColor: fill,
          fillOpacity: 0.5,
          color: "#222",
          weight: 1.5
        };
      },

      onEachFeature: function (feature, layer) {
        const name = feature.properties.NAME;

        let labelLatLng = layer.getBounds().getCenter();

        if (name === "Chile") labelLatLng = [-30, -71];
        if (name === "Argentina") labelLatLng = [-38, -64];

        const tooltip = L.tooltip({
          permanent: true,
          direction: "center",
          className: "country-label"
        })
          .setContent(name)
          .setLatLng(labelLatLng);

        layer.bindTooltip(tooltip);

        layer.on("click", function () {

          const matches = sovData.filter(row => row.Name === name);

          document.getElementById("info").innerText =
            matches.map(m =>
              m.Name + " — " + m.PolityID + " (" +
              formatDate(m.StartDate) + " — " +
              formatDate(m.EndDate) + ")"
            ).join("\n");

        });
      }
    });

    southAmericaLayer.addTo(MyMap);
  });