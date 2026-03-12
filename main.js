console.log("JS loaded");

let selectedDate = 20260101;
let worldLayer = null;
let renderVersion = 0;

const slider = document.getElementById("yearSlider");
const display = document.getElementById("yearDisplay");
const dateInput = document.getElementById("dateInput");

// -------------------------
// Date helpers
// -------------------------

function formatDate(yyyymmdd) {
  const s = yyyymmdd.toString();
  const year = s.substring(0, 4);
  const month = s.substring(4, 6);
  const day = s.substring(6, 8);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${year} ${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
}

function monthIndexToDate(idx) {
  const startYear = 1600;
  const year = startYear + Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return year * 10000 + month * 100 + 1;
}

function dateToMonthIndex(yyyymmdd) {
  const startYear = 1600;
  const year = Math.floor(yyyymmdd / 10000);
  const month = Math.floor((yyyymmdd % 10000) / 100);
  return (year - startYear) * 12 + (month - 1);
}

function formatSliderDate(yyyymmdd) {
  const year = Math.floor(yyyymmdd / 10000);
  const month = Math.floor((yyyymmdd % 10000) / 100);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${year} ${monthNames[month - 1]}`;
}

// -------------------------
// Slider initialization
// -------------------------

slider.min = 0;
slider.max = (2026 - 1600) * 12 + 11;
slider.value = dateToMonthIndex(selectedDate);

display.innerText = formatSliderDate(selectedDate);
dateInput.value = selectedDate.toString();

// -------------------------
// Create the map
// -------------------------

const MyMap = L.map("mapbox").setView([-15, -60], 4);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
}).addTo(MyMap);

// permanent white background
const backgroundLayer = L.rectangle(
  [[-90, -180], [90, 180]],
  { color: null, fillColor: "#ffffff", fillOpacity: 1, interactive: false }
).addTo(MyMap);

let labelLayer = L.layerGroup().addTo(MyMap);
let capitalLayer = L.layerGroup().addTo(MyMap);

// -------------------------
// Icons
// -------------------------

const capitalIcon = L.divIcon({
  className: "capital-icon",
  html: "★",
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// -------------------------
// Data containers
// -------------------------

let geoData = [];
let sovData = [];
let capitalData = [];

// -------------------------
// CSV parsing helpers
// -------------------------

function parseGeoCSV(text) {
  const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");

  return rows.map(row => {
    const c = row.split(",");
    return {
      ID: c[0].trim(),
      Begin: parseInt(c[1], 10),
      End: parseInt(c[2], 10),
      File: c[3].trim()
    };
  });
}

function parseSovCSV(text) {
  const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");

  return rows.map(row => {
    const cols = row.split(",");
    return {
      PolityID: cols[0].trim(),
      Name: cols[1].trim(),
      StartDate: parseInt(cols[2], 10),
      EndDate: parseInt(cols[3], 10),
      Color: cols[4].trim()
    };
  });
}

function parseCapsCSV(text) {
  const rows = text.split("\n").slice(1).filter(r => r.trim() !== "");

  return rows.map(row => {
    const cols = row.split(",");
    return {
      ID: cols[0].trim(),
      Begin: parseInt(cols[1], 10),
      End: parseInt(cols[2], 10),
      Capital: cols[3].trim(),
      Lat: parseFloat(cols[4]),
      Lon: parseFloat(cols[5])
    };
  });
}

// -------------------------
// Controls
// -------------------------

slider.addEventListener("input", function () {
  selectedDate = monthIndexToDate(parseInt(this.value, 10));
  display.innerText = formatSliderDate(selectedDate);
  dateInput.value = selectedDate.toString();

  console.log("Slider moved:", selectedDate);
  updateMapByDate();
});

dateInput.addEventListener("change", function () {
  const raw = this.value.trim();
  const val = parseInt(raw, 10);

  if (isNaN(val) || raw.length !== 8) {
    alert("Enter date as YYYYMMDD");
    this.value = selectedDate.toString();
    return;
  }

  selectedDate = val;
  slider.value = dateToMonthIndex(selectedDate);
  display.innerText = formatSliderDate(selectedDate);

  console.log("Date entered:", selectedDate);
  updateMapByDate();
});

document.getElementById("stepBack").addEventListener("click", () => {
  const v = parseInt(slider.value, 10);

  if (v > parseInt(slider.min, 10)) {
    slider.value = v - 1;
    slider.dispatchEvent(new Event("input"));
  }
});

document.getElementById("stepForward").addEventListener("click", () => {
  const v = parseInt(slider.value, 10);

  if (v < parseInt(slider.max, 10)) {
    slider.value = v + 1;
    slider.dispatchEvent(new Event("input"));
  }
});

// -------------------------
// Capitals
// -------------------------

MyMap.on("zoomend", updateCapitals);

function updateCapitals() {
  capitalLayer.clearLayers();

  if (!worldLayer) return;

  const zoom = MyMap.getZoom();
  if (zoom < 5) return;

  const y = selectedDate;

  capitalData.forEach(row => {
    const exists =
      row.Begin <= y &&
      row.End >= y;

    if (!exists) return;

    const star = L.marker([row.Lat, row.Lon], {
      icon: capitalIcon,
      interactive: false
    });

    star.addTo(capitalLayer);

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

// -------------------------
// Main map update
// -------------------------

async function updateMapByDate() {
  const myVersion = ++renderVersion;

  labelLayer.clearLayers();
  capitalLayer.clearLayers();

  if (worldLayer) {
    MyMap.removeLayer(worldLayer);
    worldLayer = null;
  }

  const y = selectedDate;

  const activePolities = sovData.filter(p =>
    p.StartDate <= y &&
    p.EndDate >= y
  );

  const activeGeo = geoData.filter(g =>
    activePolities.some(p => p.PolityID === g.ID) &&
    g.Begin <= y &&
    g.End >= y
  );

  const filesNeeded = [...new Set(activeGeo.map(g => g.File))];

  const layers = await Promise.all(
    filesNeeded.map(f =>
      fetch(`Geojson/${f}.geojson`)
        .then(r => r.json())
        .then(data => {
          data.features.forEach(feat => {
            if (!feat.properties) feat.properties = {};
            feat.properties.TAFile = f;
          });
          return data;
        })
    )
  );

  if (myVersion !== renderVersion) return;

  worldLayer = L.geoJSON(layers, {
    style: function (feature) {
      const matchGeo = activeGeo.find(g => g.File === feature.properties.TAFile);
      const polity = matchGeo
        ? activePolities.find(p => p.PolityID === matchGeo.ID)
        : null;

      return {
        fillColor: polity?.Color || "#ccc",
        fillOpacity: 0.5,
        color: "#222",
        weight: 1.5
      };
    }
  }).addTo(MyMap);

  if (myVersion !== renderVersion) return;

  updateCapitals();
}


// -------------------------
// Initial data load
// -------------------------

Promise.all([
  fetch("worldgeo.csv").then(r => r.text()),
  fetch("worldsov.csv").then(r => r.text()),
  fetch("worldcaps.csv").then(r => r.text())
])
  .then(([geoText, sovText, capText]) => {
    geoData = parseGeoCSV(geoText);
    sovData = parseSovCSV(sovText);
    capitalData = parseCapsCSV(capText);

    console.log("TA geometry rows loaded:", geoData.length);
    console.log("Sovereignty loaded:", sovData.length);
    console.log("Capitals loaded:", capitalData.length);

    updateMapByDate();
  })
  .catch(err => {
    console.error("Initial load failed:", err);
  });