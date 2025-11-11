// Paths to your processed files
const CSV_URL = "data/state_month_stats.csv";
const STATES_GEOJSON = "data/us_states_simplified.geojson";

// DOM refs
const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");
const g = svg.append("g");

const tooltip = d3.select("#tooltip");
const monthInput = document.getElementById("month");
const monthLabel = document.getElementById("monthLabel");
const yearSelect = document.getElementById("year");
const yearLabel  = document.getElementById("yearLabel");
const dnGroup = document.getElementById("dnGroup");
const metricSelect = document.getElementById("metric");
const legendBar = document.getElementById("legendBar");
const legendMin = document.getElementById("legendMin");
const legendMax = document.getElementById("legendMax");

const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const projection = d3.geoAlbersUsa().scale(1280).translate([width/2, height/2]);
const path = d3.geoPath(projection);

const color = d3.scaleSequential(d3.interpolateYlOrRd);

const key = (state, year, month, dn) => `${state}__${year}__${month}__${dn}`;

let dataByKey = new Map();
let years = [];
let statesFeat = [];
let current = { year: null, month: +monthInput.value, dn: "A", metric: metricSelect.value };

// Zoom/pan
svg.call(d3.zoom().scaleExtent([1, 8]).on("zoom", (ev) => g.attr("transform", ev.transform)));

Promise.all([
    d3.json(STATES_GEOJSON),
    d3.csv(CSV_URL, d3.autoType)
]).then(([states, rows]) => {
    statesFeat = states.features;

  // Index CSV
    rows.forEach(r => dataByKey.set(key(r.state, r.year, r.month, r.dn), r));

  // Populate years
    years = Array.from(new Set(rows.map(d => d.year))).sort(d3.ascending);
    current.year = years[years.length - 1];
    yearLabel.textContent = current.year;
    yearSelect.innerHTML = years.map(y => `<option value="${y}" ${y===current.year?'selected':''}>${y}</option>`).join("");

  // Draw state paths
    const statePath = g.append("g")
        .selectAll("path")
        .data(statesFeat)
        .join("path")
        .attr("d", path)
        .attr("fill", "#1a2230")
        .attr("stroke", "#0f141b")
        .attr("stroke-width", 0.8)
        .attr("vector-effect", "non-scaling-stroke");

    function update() {
        monthLabel.textContent = `${current.month} (${monthNames[current.month]})`;
        yearLabel.textContent  = current.year;

    // Color domain for chosen year+month
    const vals = statesFeat.map(f => {
        const row = dataByKey.get(key(f.properties.name, current.year, current.month, current.dn));
        if (!row) return NaN;
        if (current.metric === "count") return row.count ?? NaN;
        if (current.metric === "avg_brightness") return row.avg_brightness ?? NaN;
        return row.median_frp ?? NaN;
    }).filter(Number.isFinite);

    const vmin = d3.quantile(vals, 0.02) ?? 0;
    const vmax = d3.quantile(vals, 0.98) ?? 1;
    color.domain([vmin, vmax]);

    legendBar.style.background = `linear-gradient(90deg, ${d3.interpolateYlOrRd(0)} 0%, ${d3.interpolateYlOrRd(1)} 100%)`;
    legendMin.textContent = d3.format(".2s")(vmin);
    legendMax.textContent = d3.format(".2s")(vmax);

    statePath
        .attr("fill", d => {
            const row = dataByKey.get(key(d.properties.name, current.year, current.month, current.dn));
            const val = current.metric === "count" ? row?.count
                    : current.metric === "avg_brightness" ? row?.avg_brightness
                    : row?.median_frp;
        return Number.isFinite(val) ? color(val) : "#1a2230";
        })
        .on("mousemove", (ev, d) => {
            const name = d.properties.name;
            const rowA  = dataByKey.get(key(name, current.year, current.month, "A"));
            const rowDN = dataByKey.get(key(name, current.year, current.month, current.dn)) || rowA;

        const fmt = d3.format(",.0f"), fmt1 = d3.format(".1f");
        const pct = x => Number.isFinite(+x) ? (100*+x).toFixed(0)+"%" : "—";

            tooltip.style("display","block")
            .style("left", (ev.clientX + 16) + "px")
            .style("top",  (ev.clientY + 16) + "px")
            .html(`
                <div class="h">${name} — ${monthNames[current.month]} ${current.year} (${current.dn==='A'?'All':current.dn==='D'?'Day':'Night'})</div>
                <div><b>Detections:</b> ${fmt(rowDN?.count ?? 0)}</div>
                <div><b>Avg. brightness:</b> ${Number.isFinite(rowDN?.avg_brightness)? fmt1(rowDN.avg_brightness):"—"}</div>
                <div><b>Median FRP:</b> ${Number.isFinite(rowDN?.median_frp)? fmt1(rowDN.median_frp):"—"}</div>
                <div><b>Max fires/day:</b> ${rowDN?.max_day_count ?? "—"} <span style="color:#9fb0c3">${rowDN?.max_day_date ? `(${rowDN.max_day_date})` : ""}</span></div>
                <div><b>% Night (month):</b> ${pct(rowA?.pct_night ?? rowDN?.pct_night)}</div>
            `);
        })
        .on("mouseleave", () => tooltip.style("display","none"));

    // Top-3 annotations
        g.selectAll(".anno").remove();
        const ranked = statesFeat
        .map(f => {
            const row = dataByKey.get(key(f.properties.name, current.year, current.month, current.dn));
            if (!row) return null;
            const val = current.metric === "count" ? row.count
                    : current.metric === "avg_brightness" ? row.avg_brightness
                    : row.median_frp;
            return Number.isFinite(val) ? {f, name: f.properties.name, val} : null;
        })
        .filter(Boolean)
        .sort((a,b)=> d3.descending(a.val, b.val))
        .slice(0,3);

        ranked.forEach((r,i)=>{
        const c = path.centroid(r.f);
        g.append("text")
            .attr("class","anno")
            .attr("x", c[0]).attr("y", c[1]).attr("text-anchor","middle").attr("dy","-6")
            .text(`${i+1}. ${r.name}`);
        });
    }

  // Initial draw
    update();

  // Controls
    monthInput.addEventListener("input", e => { current.month = +e.target.value; update(); });
    metricSelect.addEventListener("change", e => { current.metric = e.target.value; update(); });
    dnGroup.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", ()=>{
        dnGroup.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        current.dn = btn.dataset.dn;
        update();
        });
    });
    yearSelect.addEventListener("change", e => { current.year = +e.target.value; update(); });

    }).catch(err => {
    console.error(err);
    alert("Failed to load data or map — open the console for details.");
    });
