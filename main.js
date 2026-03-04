console.log("JS loaded");

let selectedYear = 1815;
let southAmericaLayer;

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

const capitalIcon = L.divIcon({
  className: "capital-icon",
  html: "★",
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

let sovData = [];
let capitalData = [];
let capitalLayer = L.layerGroup().addTo(MyMap);

// Load sovereignty data
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

    return fetch("SACaps.csv")
      .then(response => response.text())
      .then(text => {

        const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");

        capitalData = rows.map(row => {
          const cols = row.split(",");
          return {
            ID: cols[0].trim(),
            Begin: cols[1].trim(),
            End: cols[2].trim(),
            Capital: cols[3].trim(),
            Lat: parseFloat(cols[4]),
            Lon: parseFloat(cols[5])
          };
        });

        console.log("Capitals loaded:", capitalData.length);

        return fetch("world50.geojson");
      });


    console.log("Sovereignty loaded:", sovData.length);

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

        // compute position
        let labelLatLng = layer.getBounds().getCenter();

        // you can still override manually if desired
        if (name === "Chile") labelLatLng = [-33, -71];
        if (name === "Argentina") labelLatLng = [-38, -63];

        L.marker(labelLatLng, {
          icon: L.divIcon({
            className: "country-label",
            html: name,
            iconSize: [100, 40],      // give it real size
            iconAnchor: [50, 20]      // center anchor
          }),
          interactive: false
        }).addTo(MyMap);

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

MyMap.on("zoomend", updateCapitals);
updateCapitals();

function updateCapitals() {

  if (!southAmericaLayer) return;

  capitalLayer.clearLayers();

  const zoom = MyMap.getZoom();
  if (zoom < 5) return;

  capitalData.forEach(row => {

    const exists = sovData.some(s =>
      s.PolityID === row.ID &&
      parseInt(s.StartDate.substring(0, 4)) <= selectedYear &&
      parseInt(s.EndDate.substring(0, 4)) >= selectedYear
    );
    if (!exists) return;

    // STAR
    const star = L.marker([row.Lat, row.Lon], {
      icon: capitalIcon,
      interactive: false
    });

    star.addTo(capitalLayer);

    // NAME (only at higher zoom)
    if (zoom >= 6) {

      const label = L.marker([row.Lat, row.Lon], {
        icon: L.divIcon({
          className: "capital-label",
          html: row.Capital,
          iconSize: [120, 20],
          iconAnchor: [60, -10]
        }),
        interactive: false
      });

      label.addTo(capitalLayer);
    }

  });
}

function updateMapByYear() {

  southAmericaLayer.eachLayer(function (layer) {

    const name = layer.feature.properties.NAME;

    const match = sovData.find(row =>
      row.Name === name &&
      parseInt(row.StartDate.substring(0, 4)) <= selectedYear &&
      parseInt(row.EndDate.substring(0, 4)) >= selectedYear
    );

    if (match) {

      layer.setStyle({
        fillColor: match.Color,
        fillOpacity: 0.5
      });

    } else {

      layer.setStyle({
        fillColor: "#cccccc",
        fillOpacity: 0.2
      });
    }

  });

  updateCapitals();
}

const slider = document.getElementById("yearSlider");
const display = document.getElementById("yearDisplay");

slider.addEventListener("input", function () {

  selectedYear = parseInt(this.value);
  display.innerText = selectedYear;

  console.log("Slider moved:", selectedYear);

  updateMapByYear();
});