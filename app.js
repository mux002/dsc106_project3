
const CSV_URL = "data/state_month_stats.csv";
const STATES_GEOJSON = "data/us_states_simplified.geojson";

// Helpers
const getStateName = f => (f.properties.state ?? f.properties.name ?? "").trim();
const norm = s => (s ?? "").toString().trim();

const key = (state, year, month, dn) => `${state}__${year}__${month}__${dn}`;

// DOM refs
const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");
const g = svg.append("g");

const tooltip     = d3.select("#tooltip");
const monthInput  = document.getElementById("month");
const monthLabel  = document.getElementById("monthLabel");
const yearSelect  = document.getElementById("year");
const yearLabel   = document.getElementById("yearLabel");
const dnGroup     = document.getElementById("dnGroup");
const metricSelect= document.getElementById("metric");
const legendBar   = document.getElementById("legendBar");
const legendMin   = document.getElementById("legendMin");
const legendMax   = document.getElementById("legendMax");
const playBtn     = document.getElementById("playBtn");   
const frpNote   = document.getElementById("frpNote");
const frpFootnote = document.getElementById("frpFootnote");

const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const projection = d3.geoAlbersUsa().scale(1100).translate([width/2, height/2 + 30]);
const path = d3.geoPath().projection(projection);

const color = d3.scaleSequential(d3.interpolateYlOrRd);



// State
let dataByKey = new Map();
let years = [];
let statesFeat = [];
let statePath;                           // will hold the map paths
let current = { year: null, month: +monthInput.value, dn: "A", metric: metricSelect.value };

// Play / pause timer
let monthTimer = null;

// Zoom/pan
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", (ev) => g.attr("transform", ev.transform));

svg.call(zoom);

Promise.all([
  d3.json(STATES_GEOJSON),
  d3.csv(CSV_URL, d3.autoType)
]).then(([states, rows]) => {

  statesFeat = states.features;

  // Index CSV (normalize state, coerce numbers, uppercase dn)
  rows.forEach(r => {
    const dn = (r.dn ?? "A").toString().toUpperCase();
    dataByKey.set(key(norm(r.state), +r.year, +r.month, dn), r);
  });

  // Populate years
  years = Array.from(new Set(rows.map(d => +d.year))).sort(d3.ascending);
  current.year = years[years.length - 1];
  yearLabel.textContent = current.year;
  yearSelect.innerHTML = years
    .map(y => `<option value="${y}" ${y===current.year?'selected':''}>${y}</option>`)
    .join("");

  // Draw state paths
  statePath = g.append("g")
    .selectAll("path")
    .data(statesFeat)
    .join("path")
      .attr("d", path)
      .attr("fill", "#1a2230")
      .attr("stroke", "#0f141b")
      .attr("stroke-width", 0.8)
      .attr("vector-effect", "non-scaling-stroke");
  

  const initialTransform = d3.zoomIdentity
    .translate(350, 250)
    .scale(1);
  svg.call(zoom.transform, initialTransform);

  // -------- Detail chart function ----------
  function drawDetailChart(stateName) {
    const svgD = d3.select("#detailChart");
    svgD.selectAll("*").remove();

    const data = Array.from(dataByKey.entries())
      .map(([k, v]) => {
        const [state, year, month, dn] = k.split("__");
        if (state !== stateName || dn !== current.dn) return null;
        return { year:+year, month:+month, count:+v.count };
      })
      .filter(Boolean)
      .sort((a,b)=>a.year===b.year ? a.month-b.month : a.year-b.year);

    if (!data.length) {
      d3.select("#detailTitle").text(`${stateName}: No data`);
      return;
    }

    const parseDate = d => new Date(d.year, d.month-1);
    const x = d3.scaleTime()
      .domain(d3.extent(data, d=>parseDate(d)))
      .range([40,380]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data,d=>d.count)]).nice()
      .range([220,20]);

    const line = d3.line()
      .x(d=>x(parseDate(d)))
      .y(d=>y(d.count));

    svgD.append("path")
      .datum(data)
      .attr("fill","none")
      .attr("stroke","#ff7a18")
      .attr("stroke-width",2)
      .attr("d",line);

    svgD.append("g").attr("transform","translate(0,220)").call(d3.axisBottom(x).ticks(5));
    svgD.append("g").attr("transform","translate(40,0)").call(d3.axisLeft(y).ticks(4));

    d3.select("#detailTitle").text(`${stateName} — Monthly Wildfires`);
  }

  // -------- Map update function ----------
  function update() {
    monthLabel.textContent = `${current.month} (${monthNames[current.month]})`;
    yearLabel.textContent  = current.year;

    // Color domain for chosen year+month
    const vals = statesFeat.map(f => {
      const row = dataByKey.get(key(getStateName(f), current.year, current.month, current.dn));
      if (!row) return NaN;
      if (current.metric === "count")          return row.count ?? NaN;
      if (current.metric === "avg_brightness") return row.avg_brightness ?? NaN;
      return row.median_frp ?? NaN;
    }).filter(Number.isFinite);

    const vmin = vals.length ? d3.quantile(vals, 0.02) : 0;
    const vmax = vals.length ? d3.quantile(vals, 0.98) : 1;
    color.domain([vmin, vmax]);

    legendBar.style.background =
      `linear-gradient(90deg, ${d3.interpolateYlOrRd(0)} 0%, ${d3.interpolateYlOrRd(1)} 100%)`;
    legendMin.textContent = d3.format(".2s")(vmin);
    legendMax.textContent = d3.format(".2s")(vmax);

    if (current.metric === "median_frp") {
      frpNote.style.display = "block";
    } else {
      frpNote.style.display = "none";
    }


    statePath
      .attr("fill", d => {
        const row = dataByKey.get(key(getStateName(d), current.year, current.month, current.dn));
        const val = current.metric === "count"
          ? row?.count
          : current.metric === "avg_brightness"
          ? row?.avg_brightness
          : row?.median_frp;
        return Number.isFinite(val) ? color(val) : "#1a2230";
      })
      .on("mousemove", (ev, d) => {
        const name  = getStateName(d);
        const rowA  = dataByKey.get(key(name, current.year, current.month, "A"));
        const rowDN = dataByKey.get(key(name, current.year, current.month, current.dn)) || rowA;

        const fmt = d3.format(",.0f"), fmt1 = d3.format(".1f");
        const pct = x => Number.isFinite(+x) ? (100*+x).toFixed(0)+"%" : "—";

        tooltip.style("display","block")
          .style("left", (ev.clientX + 16) + "px")
          .style("top",  (ev.clientY + 16) + "px")
          .html(`
            <div class="h">${name} — ${monthNames[current.month]} ${current.year}
              (${current.dn==='A'?'All':current.dn==='D'?'Day':'Night'})</div>
            <div><b>Detections:</b> ${fmt(rowDN?.count ?? 0)}</div>
            <div><b>Avg. brightness:</b> ${
              Number.isFinite(rowDN?.avg_brightness)? fmt1(rowDN.avg_brightness):"—"
            }</div>
            <div><b>Median FRP:</b> ${
              Number.isFinite(rowDN?.median_frp)? fmt1(rowDN.median_frp):"—"
            }</div>
            <div><b>Max fires/day:</b> ${rowDN?.max_day_count ?? "—"}
              <span style="color:#9fb0c3">${
                rowDN?.max_day_date ? `(${rowDN.max_day_date})` : ""
              }</span></div>
            <div><b>% Night (month):</b> ${pct(rowA?.pct_night ?? rowDN?.pct_night)}</div>
          `);
      })
      .on("mouseleave", () => tooltip.style("display","none"))
      .on("click", (ev, d) => {
        const stateName = getStateName(d);
        drawDetailChart(stateName);
      });
  }

  // Initial draw
  update();

  // Controls
  monthInput.addEventListener("input", e => {
    current.month = +e.target.value;
    update();
  });

  metricSelect.addEventListener("change", e => {
    current.metric = e.target.value;
    update();
  });

  dnGroup.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      dnGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      current.dn = btn.dataset.dn;
      update();
    });
  });

  yearSelect.addEventListener("change", e => {
    current.year = +e.target.value;
    update();
  });

  // -------- Play / Pause month animation --------
  function tickMonth() {
    current.month = (current.month % 12) + 1;   // loop 1→12
    monthInput.value = current.month;
    update();
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (monthTimer) {
        // Pause
        clearInterval(monthTimer);
        monthTimer = null;
        playBtn.textContent = "▶ Play";
      } else {
        // Play
        tickMonth();                         // show next month immediately
        monthTimer = setInterval(tickMonth, 900); // ms per step
        playBtn.textContent = "❚❚ Pause";
      }
    });
  }

}).catch(err => {
  console.error(err);
  alert("Failed to load data or map — open the console for details.");
});