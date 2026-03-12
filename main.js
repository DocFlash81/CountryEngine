console.log( "JS loaded" );

let selectedDate      = 20260101;
let worldLayer = null;

const slider    = document.getElementById( "yearSlider" );
const display   = document.getElementById( "yearDisplay" );
const dateInput = document.getElementById( "dateInput" );

// -------------------------
// Date helpers
// -------------------------

function formatDate( yyyymmdd ) {
  const s = yyyymmdd.toString();
  const year  = s.substring( 0, 4 );
  const month = s.substring( 4, 6 );
  const day   = s.substring( 6, 8 );

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${year} ${monthNames[ parseInt( month, 10 ) - 1 ]} ${parseInt( day, 10 )}`;
}

function monthIndexToDate( idx ) {
  const startYear = 1700;
  const year  = startYear + Math.floor( idx / 12 );
  const month = ( idx % 12 ) + 1;
  return year * 10000 + month * 100 + 1;
}

function dateToMonthIndex( yyyymmdd ) {
  const startYear = 1800;
  const year  = Math.floor( yyyymmdd / 10000 );
  const month = Math.floor( ( yyyymmdd % 10000 ) / 100 );
  return ( year - startYear ) * 12 + ( month - 1 );
}

function formatSliderDate( yyyymmdd ) {
  const year  = Math.floor( yyyymmdd / 10000 );
  const month = Math.floor( ( yyyymmdd % 10000 ) / 100 );

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  return `${year} ${monthNames[ month - 1 ]}`;
}

// -------------------------
// Slider initialization
// -------------------------

slider.min   = 0;
slider.max   = ( 2026 - 1800 ) * 12 + 11;
slider.value = dateToMonthIndex( selectedDate );

display.innerText   = formatSliderDate( selectedDate );
dateInput.value     = selectedDate.toString();

// -------------------------
// Create the map
// -------------------------

const MyMap = L.map( "mapbox" ).setView( [ -15, -60 ], 4 );

L.tileLayer( "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
} ).addTo( MyMap );

// permanent white background
const backgroundLayer = L.rectangle(
  [ [ -90, -180 ], [ 90, 180 ] ],
  { color: null, fillColor: "#ffffff", fillOpacity: 1, interactive: false }
).addTo( MyMap );

let labelLayer   = L.layerGroup().addTo( MyMap );
let capitalLayer = L.layerGroup().addTo( MyMap );

// -------------------------
// Icons
// -------------------------

const capitalIcon = L.divIcon( {
  className: "capital-icon",
  html: "★",
  iconSize: [ 18, 18 ],
  iconAnchor: [ 9, 9 ]
} );

// -------------------------
// Data containers
// -------------------------

let geoData     = [];
let sovData     = [];
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
  capitalLayer.clearLayers();

  if ( !worldLayer ) return;

  const zoom = MyMap.getZoom();
  if ( zoom < 5 ) return;

  const y = selectedDate;

  capitalData.forEach( row => {
    const exists =
      row.Begin <= y &&
      row.End   >= y;

    if ( !exists ) return;

    const star = L.marker( [ row.Lat, row.Lon ], {
      icon: capitalIcon,
      interactive: false
    } );

    star.addTo( capitalLayer );

    if ( zoom >= 6 ) {
      const label = L.marker( [ row.Lat, row.Lon ], {
        icon: L.divIcon( {
          className: "capital-label",
          html: row.Capital,
          iconSize: [ 120, 20 ],
          iconAnchor: [ 60, -10 ]
        } ),
        interactive: false
      } );

      label.addTo( capitalLayer );
    }
  } );
}

// -------------------------
// Main map update
// -------------------------

async function updateMapByDate() {
  labelLayer.clearLayers();
  capitalLayer.clearLayers();

  if ( worldLayer ) {
    MyMap.removeLayer( worldLayer );
    worldLayer = null;
  }

  const y = selectedDate;

  const activePolities = sovData.filter( p =>
    p.StartDate <= y &&
    p.EndDate   >= y
  );

  console.log( "ACTIVE POLITIES:", activePolities.map( p => p.PolityID ) );

  const activeGeo = geoData.filter( g =>
    activePolities.some( p => p.PolityID === g.ID ) &&
    g.Begin <= y &&
    g.End   >= y
  );

  const filesNeeded = [ ...new Set( activeGeo.map( g => g.File ) ) ];

  if ( filesNeeded.length === 0 ) {
    updateCapitals();
    return;
  }

  const layers = await Promise.all(
    filesNeeded.map( f =>
      fetch( `Geojson/${f}.geojson` )
        .then( r => r.json() )
        .then( data => {
          data.features.forEach( feat => {
            if ( !feat.properties ) {
              feat.properties = {};
            }
            feat.properties.TAFile = f;
          } );
          return data;
        } )
    )
  );

  worldLayer = L.geoJSON( layers, {
    style: function ( feature ) {
      const matchGeo = activeGeo.find( g => g.File === feature.properties.TAFile );

      if ( !matchGeo ) {
        return {
          fillColor: "#ccc",
          fillOpacity: 0.2,
          color: "#222",
          weight: 1
        };
      }

      const polity = activePolities.find( p => p.PolityID === matchGeo.ID );

      console.log( "COLOR DEBUG:", feature.properties.TAFile, matchGeo.ID );

      return {
        fillColor: polity?.Color || "#ccc",
        fillOpacity: 0.5,
        color: "#222",
        weight: 1.5
      };
    }
  } ).addTo( MyMap );

  activeGeo.forEach( g => {
    const polity = activePolities.find( p => p.PolityID === g.ID );
    if ( !polity ) return;

    const matchingLayerData = layers.find( l =>
      l.features &&
      l.features.length > 0 &&
      l.features[ 0 ].properties &&
      l.features[ 0 ].properties.TAFile === g.File
    );

    if ( !matchingLayerData ) return;

    const geoLayer = L.geoJSON( matchingLayerData );
    const center   = geoLayer.getBounds().getCenter();

    L.marker( center, {
      icon: L.divIcon( {
        className: "country-label",
        html: polity.Name,
        iconSize: [ 100, 40 ],
        iconAnchor: [ 50, 20 ]
      } ),
      interactive: false
    } ).addTo( labelLayer );
  } );

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