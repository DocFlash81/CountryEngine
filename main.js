console.log("JS loaded");

let selectedYear = 2026;
let southAmericaLayer;

// Create the map
const MyMap = L.map('mapbox').setView([-15, -60], 4);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(MyMap);

// need a labelLayer
let labelLayer = L.layerGroup().addTo(MyMap);

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

// Star for capitals
const capitalIcon = L.divIcon({
  className: "capital-icon",
  html: "★",
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// load geojson dataset
let geoData = [];
fetch("SAgeo.csv")
  .then(r => r.text())
  .then(text => {

    const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");
    geoData = rows.map(row => {
      const c = row.split(",");
      return {
        ID: c[0].trim(),
        Begin: parseInt(c[1]),
        End: parseInt(c[2]),
        File: c[3].trim()
      };
    });

    console.log("TA geometry rows loaded:", geoData.length);
  });


let sovData = [];
let capitalData = [];
let capitalLayer = L.layerGroup().addTo(MyMap);

// Load sovereignty data and capitals data
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

        Promise.all([
          fetch("SAgeo.csv").then(r => r.text()),
          fetch("SALite.csv").then(r => r.text())
        ]).then(() => {
          updateMapByYear();
        });
      });
  })

MyMap.on("zoomend", updateCapitals);
updateCapitals();

// put capitals on map
function updateCapitals() {

  if (!southAmericaLayer) return;

  capitalLayer.clearLayers();

  const zoom = MyMap.getZoom();
  if (zoom < 5) return;

  const y = selectedYear * 10000;   // ✅ MOVE HERE

  capitalData.forEach(row => {

    const exists =
      parseInt(row.Begin) <= y &&
      parseInt(row.End) >= y;

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

// updateMapByYear updates the map given the slider year
async function updateMapByYear() {

  labelLayer.clearLayers();

  if (southAmericaLayer) {
    MyMap.removeLayer(southAmericaLayer);
  }
  const y = selectedYear * 10000;

  // STEP 1 — active polities
  const activePolities = sovData.filter(p =>
    parseInt(p.StartDate) <= y &&
    parseInt(p.EndDate) >= y
  );

  console.log("ACTIVE POLITIES:", activePolities.map(p => p.PolityID));
  
  // STEP 2 — active geometry rows for those polities
  const activeGeo = geoData.filter(g =>
    activePolities.some(p => p.PolityID === g.ID) &&
    g.Begin <= y &&
    g.End >= y
  );

  // STEP 3 — unique files needed
  const filesNeeded = [...new Set(activeGeo.map(g => g.File))];

  // STEP 4 — load them
  const layers = await Promise.all(
    filesNeeded.map(f =>
      fetch(`Geojson/${f}.geojson`)
        .then(r => r.json())
        .then(data => {
          data.features.forEach(feat => {
            feat.properties.TAFile = f;
          });
          return data;
        })
    )
  );

  // STEP 5 — build map layer
  southAmericaLayer = L.geoJSON(layers.flat(), {

    style: function (feature) {

      // determine which polity owns this geometry
      const matchGeo = activeGeo.find(g => g.File === feature.properties.TAFile);

      if (!matchGeo) {
        return { fillColor: "#ccc", fillOpacity: 0.2, color: "#222", weight: 1 };
      }

      const polity = activePolities.find(p => p.PolityID === matchGeo.ID);

      console.log("COLOR DEBUG:", feature.properties.TAFile, matchGeo?.ID);

      return {
        fillColor: polity?.Color || "#ccc",
        fillOpacity: 0.5,
        color: "#222",
        weight: 1.5
      };
    }
  }).addTo(labelLayer);

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