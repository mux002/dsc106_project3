// const CSV_URL = "data/state_month_stats.csv";
// const STATES_GEOJSON = "data/us_states_simplified.geojson";

// // Helpers
// const getStateName = f => (f.properties.state ?? f.properties.name ?? "").trim();
// const norm = s => (s ?? "").toString().trim();

// const key = (state, year, month, dn) => `${state}__${year}__${month}__${dn}`;

// // DOM refs
// const svg = d3.select("#map");
// const width = +svg.attr("width");
// const height = +svg.attr("height");
// const g = svg.append("g");

// const tooltip     = d3.select("#tooltip");
// const monthInput  = document.getElementById("month");
// const monthLabel  = document.getElementById("monthLabel");
// const yearSelect  = document.getElementById("year");
// const yearLabel   = document.getElementById("yearLabel");
// const dnGroup     = document.getElementById("dnGroup");
// const metricSelect= document.getElementById("metric");
// const legendBar   = document.getElementById("legendBar");
// const legendMin   = document.getElementById("legendMin");
// const legendMax   = document.getElementById("legendMax");
// const playBtn     = document.getElementById("playBtn");   
// const frpNote   = document.getElementById("frpNote");
// const frpFootnote = document.getElementById("frpFootnote");

// const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// const projection = d3.geoAlbersUsa().scale(1100).translate([width/2, height/2 + 30]);
// const path = d3.geoPath().projection(projection);

// const color = d3.scaleSequential(d3.interpolateYlOrRd);

// // State
// let dataByKey = new Map();
// let years = [];
// let statesFeat = [];
// let statePath;                           // will hold the map paths
// let current = { year: null, month: +monthInput.value, dn: "A", metric: metricSelect.value };

// // Play / pause timer
// let monthTimer = null;

// // Zoom/pan
// const zoom = d3.zoom()
//   .scaleExtent([1, 8])
//   .on("zoom", (ev) => g.attr("transform", ev.transform));

// svg.call(zoom);

// Promise.all([
//   d3.json(STATES_GEOJSON),
//   d3.csv(CSV_URL, d3.autoType)
// ]).then(([states, rows]) => {

//   statesFeat = states.features;

//   // Index CSV (normalize state, coerce numbers, uppercase dn)
//   rows.forEach(r => {
//     const dn = (r.dn ?? "A").toString().toUpperCase();
//     dataByKey.set(key(norm(r.state), +r.year, +r.month, dn), r);
//   });

//   // Populate years
//   years = Array.from(new Set(rows.map(d => +d.year))).sort(d3.ascending);
//   current.year = years[years.length - 1];
//   yearLabel.textContent = current.year;
//   yearSelect.innerHTML = years
//     .map(y => `<option value="${y}" ${y===current.year?'selected':''}>${y}</option>`)
//     .join("");

//   // Draw state paths
//   statePath = g.append("g")
//     .selectAll("path")
//     .data(statesFeat)
//     .join("path")
//       .attr("d", path)
//       .attr("fill", "#1a2230")
//       .attr("stroke", "#0f141b")
//       .attr("stroke-width", 0.8)
//       .attr("vector-effect", "non-scaling-stroke");
  

//   const initialTransform = d3.zoomIdentity
//     .translate(450, 250)
//     .scale(0.95);
//   svg.call(zoom.transform, initialTransform);

//   // -------- 新增：季节性图表函数 ----------
//   function drawSeasonalChart() {
//     const svg = d3.select("#seasonalChart");
//     if (svg.empty()) return; // 确保元素存在
    
//     svg.selectAll("*").remove();
    
//     const margin = {top: 20, right: 20, bottom: 25, left: 40};
//     const width = 600 - margin.left - margin.right;
//     const height = 100 - margin.top - margin.bottom;
    
//     const g = svg.append("g")
//         .attr("transform", `translate(${margin.left},${margin.top})`);
    
//     // 计算所有年份每个月的平均检测数
//     const monthlyData = [];
//     for (let month = 1; month <= 12; month++) {
//         let total = 0;
//         let count = 0;
        
//         statesFeat.forEach(f => {
//             years.forEach(year => {
//                 const row = dataByKey.get(key(getStateName(f), year, month, "A"));
//                 if (row && row.count) {
//                     total += row.count;
//                     count++;
//                 }
//             });
//         });
        
//         monthlyData.push({
//             month,
//             name: monthNames[month],
//             avgCount: count > 0 ? total / count : 0
//         });
//     }
    
//     const x = d3.scaleBand()
//         .domain(monthlyData.map(d => d.month))
//         .range([0, width])
//         .padding(0.2);
    
//     const y = d3.scaleLinear()
//         .domain([0, d3.max(monthlyData, d => d.avgCount)])
//         .range([height, 0]);
    
//     // 绘制条形
//     g.selectAll(".month-bar")
//         .data(monthlyData)
//         .join("rect")
//         .attr("class", "month-bar")
//         .attr("x", d => x(d.month))
//         .attr("y", d => y(d.avgCount))
//         .attr("width", x.bandwidth())
//         .attr("height", d => height - y(d.avgCount))
//         .attr("fill", d => {
//             // 根据月份设置颜色渐变
//             if (d.month <= 2) return "#4a6fa5"; // 冬季蓝色
//             if (d.month <= 5) return "#ffaa33"; // 春季黄色
//             if (d.month <= 8) return "#ff4444"; // 夏季红色
//             return "#dd7733"; // 秋季橙色
//         })
//         .attr("opacity", d => d.month === current.month ? 1 : 0.6);
    
//     // 添加连线展示"wave"形状
//     const line = d3.line()
//         .x(d => x(d.month) + x.bandwidth() / 2)
//         .y(d => y(d.avgCount))
//         .curve(d3.curveMonotoneX);
    
//     g.append("path")
//         .datum(monthlyData)
//         .attr("fill", "none")
//         .attr("stroke", "#ff7a18")
//         .attr("stroke-width", 2)
//         .attr("d", line);
    
//     // X轴
//     g.append("g")
//         .attr("transform", `translate(0,${height})`)
//         .call(d3.axisBottom(x).tickValues([1,4,7,10]).tickFormat(d => monthNames[d]))
//         .attr("font-size", "11px");
    
//     // 添加当前月份指示器
//     const currentMonthX = x(current.month) + x.bandwidth() / 2;
//     g.append("circle")
//         .attr("cx", currentMonthX)
//         .attr("cy", y(monthlyData[current.month-1]?.avgCount || 0))
//         .attr("r", 4)
//         .attr("fill", "white")
//         .attr("stroke", "#ff4444")
//         .attr("stroke-width", 2);
    
//     // 添加说明文本
//     const peakMonth = monthlyData.reduce((a, b) => a.avgCount > b.avgCount ? a : b);
//     if (peakMonth) {
//         g.append("text")
//             .attr("x", x(peakMonth.month) + x.bandwidth() / 2)
//             .attr("y", y(peakMonth.avgCount) - 8)
//             .attr("text-anchor", "middle")
//             .attr("font-size", "11px")
//             .attr("fill", "#ff4444")
//             .text("Peak");
//     }
//   }

//   // -------- Detail chart function ----------
//   function drawDetailChart(stateName) {
//     const svgD = d3.select("#detailChart");
//     svgD.selectAll("*").remove();

//     const data = Array.from(dataByKey.entries())
//       .map(([k, v]) => {
//         const [state, year, month, dn] = k.split("__");
//         if (state !== stateName || dn !== current.dn) return null;
//         return { year:+year, month:+month, count:+v.count };
//       })
//       .filter(Boolean)
//       .sort((a,b)=>a.year===b.year ? a.month-b.month : a.year-b.year);

//     if (!data.length) {
//       d3.select("#detailTitle").text(`${stateName}: No data`);
//       return;
//     }

//     const parseDate = d => new Date(d.year, d.month-1);
//     const x = d3.scaleTime()
//       .domain(d3.extent(data, d=>parseDate(d)))
//       .range([40,380]);
//     const y = d3.scaleLinear()
//       .domain([0, d3.max(data,d=>d.count)]).nice()
//       .range([220,20]);

//     const line = d3.line()
//       .x(d=>x(parseDate(d)))
//       .y(d=>y(d.count));

//     svgD.append("path")
//       .datum(data)
//       .attr("fill","none")
//       .attr("stroke","#ff7a18")
//       .attr("stroke-width",2)
//       .attr("d",line);

//     svgD.append("g").attr("transform","translate(0,220)").call(d3.axisBottom(x).ticks(5));
//     svgD.append("g").attr("transform","translate(40,0)").call(d3.axisLeft(y).ticks(4));

//     d3.select("#detailTitle").text(`${stateName} — Monthly Wildfires`);
//   }

//   // -------- Map update function ----------
//   function update() {
//     monthLabel.textContent = `${current.month} (${monthNames[current.month]})`;
//     yearLabel.textContent  = current.year;

//     // Color domain for chosen year+month
//     const vals = statesFeat.map(f => {
//       const row = dataByKey.get(key(getStateName(f), current.year, current.month, current.dn));
//       if (!row) return NaN;
//       if (current.metric === "count")          return row.count ?? NaN;
//       if (current.metric === "avg_brightness") return row.avg_brightness ?? NaN;
//       return row.median_frp ?? NaN;
//     }).filter(Number.isFinite);

//     const vmin = vals.length ? d3.quantile(vals, 0.02) : 0;
//     const vmax = vals.length ? d3.quantile(vals, 0.98) : 1;
//     color.domain([vmin, vmax]);

//     legendBar.style.background =
//       `linear-gradient(90deg, ${d3.interpolateYlOrRd(0)} 0%, ${d3.interpolateYlOrRd(1)} 100%)`;
//     legendMin.textContent = d3.format(".2s")(vmin);
//     legendMax.textContent = d3.format(".2s")(vmax);

//     if (current.metric === "median_frp") {
//       frpNote.style.display = "block";
//     } else {
//       frpNote.style.display = "none";
//     }

//     statePath
//       .attr("fill", d => {
//         const row = dataByKey.get(key(getStateName(d), current.year, current.month, current.dn));
//         const val = current.metric === "count"
//           ? row?.count
//           : current.metric === "avg_brightness"
//           ? row?.avg_brightness
//           : row?.median_frp;
//         return Number.isFinite(val) ? color(val) : "#1a2230";
//       })
//       .on("mousemove", (ev, d) => {
//         const name  = getStateName(d);
//         const rowA  = dataByKey.get(key(name, current.year, current.month, "A"));
//         const rowDN = dataByKey.get(key(name, current.year, current.month, current.dn)) || rowA;

//         const fmt = d3.format(",.0f"), fmt1 = d3.format(".1f");
//         const pct = x => Number.isFinite(+x) ? (100*+x).toFixed(0)+"%" : "—";

//         tooltip.style("display","block")
//           .style("left", (ev.clientX + 16) + "px")
//           .style("top",  (ev.clientY + 16) + "px")
//           .html(`
//             <div class="h">${name} — ${monthNames[current.month]} ${current.year}
//               (${current.dn==='A'?'All':current.dn==='D'?'Day':'Night'})</div>
//             <div><b>Detections:</b> ${fmt(rowDN?.count ?? 0)}</div>
//             <div><b>Avg. brightness:</b> ${
//               Number.isFinite(rowDN?.avg_brightness)? fmt1(rowDN.avg_brightness):"—"
//             }</div>
//             <div><b>Median FRP:</b> ${
//               Number.isFinite(rowDN?.median_frp)? fmt1(rowDN.median_frp):"—"
//             }</div>
//             <div><b>Max fires/day:</b> ${rowDN?.max_day_count ?? "—"}
//               <span style="color:#9fb0c3">${
//                 rowDN?.max_day_date ? `(${rowDN.max_day_date})` : ""
//               }</span></div>
//             <div><b>% Night (month):</b> ${pct(rowA?.pct_night ?? rowDN?.pct_night)}</div>
//           `);
//       })
//       .on("mouseleave", () => tooltip.style("display","none"))
//       .on("click", (ev, d) => {
//         const stateName = getStateName(d);
//         drawDetailChart(stateName);
//       });

  
//     drawSeasonalChart();
//   }

//   // Initial draw
//   update();

//   // Controls
//   monthInput.addEventListener("input", e => {
//     current.month = +e.target.value;
//     update();
//   });

//   metricSelect.addEventListener("change", e => {
//     current.metric = e.target.value;
//     update();
//   });

//   dnGroup.querySelectorAll("button").forEach(btn => {
//     btn.addEventListener("click", () => {
//       dnGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
//       btn.classList.add("active");
//       current.dn = btn.dataset.dn;
//       update();
//     });
//   });

//   yearSelect.addEventListener("change", e => {
//     current.year = +e.target.value;
//     update();
//   });

//   // -------- Play / Pause month animation --------
//   function tickMonth() {
//     current.month = (current.month % 12) + 1;   // loop 1→12
//     monthInput.value = current.month;
//     update();
//   }

//   if (playBtn) {
//     playBtn.addEventListener("click", () => {
//       if (monthTimer) {
//         // Pause
//         clearInterval(monthTimer);
//         monthTimer = null;
//         playBtn.textContent = "▶ Play";
//       } else {
//         // Play
//         tickMonth();                         // show next month immediately
//         monthTimer = setInterval(tickMonth, 900); // ms per step
//         playBtn.textContent = "❚❚ Pause";
//       }
//     });
//   }

// }).catch(err => {
//   console.error(err);
//   alert("Failed to load data or map — open the console for details.");
// });

const CSV_URL = "data/state_month_stats.csv";
const STATES_GEOJSON = "data/us_states_simplified.geojson";

// Helpers
const getStateName = f => (f.properties.state ?? f.properties.name ?? "").trim();
const norm = s => (s ?? "").toString().trim();
const key = (state, year, month, dn) => `${state}__${year}__${month}__${dn}`;

// DOM refs
const svg = d3.select("#map");
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
const frpNote     = document.getElementById("frpNote");

const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// FIXED: 960 × 600 explicit width/height
const width = 960;
const height = 600;

// FIXED: More stable map centering
const projection = d3.geoAlbersUsa()
  .scale(1200)
  .translate([width/2, height/2 + 20]);

const path = d3.geoPath().projection(projection);
const color = d3.scaleSequential(d3.interpolateYlOrRd);

// State
let dataByKey = new Map();
let years = [];
let statesFeat = [];
let statePath;
let current = {
  year: null,
  month: +monthInput.value,
  dn: "A",
  metric: metricSelect.value
};

// Play animation
let monthTimer = null;

// Zoom
const zoom = d3.zoom()
  .scaleExtent([1,8])
  .on("zoom", ev => g.attr("transform", ev.transform));

svg.call(zoom);

// ───────────────────────────────
// BEGIN LOADING DATA
// ───────────────────────────────

Promise.all([
  d3.json(STATES_GEOJSON),
  d3.csv(CSV_URL, d3.autoType)
]).then(([states, rows]) => {

  statesFeat = states.features;

  // Build lookup table
  rows.forEach(r => {
    const dn = (r.dn ?? "A").toString().toUpperCase();
    dataByKey.set(key(norm(r.state), +r.year, +r.month, dn), r);
  });

  // Year dropdown
  years = Array.from(new Set(rows.map(r => +r.year))).sort(d3.ascending);
  current.year = years.at(-1);

  yearLabel.textContent = current.year;
  yearSelect.innerHTML = years.map(y =>
    `<option value="${y}" ${y===current.year ? "selected" : ""}>${y}</option>`
  ).join("");

  // Draw base map
  statePath = g.append("g")
    .selectAll("path")
    .data(statesFeat)
    .join("path")
    .attr("d", path)
    .attr("fill", "#1a2230")
    .attr("stroke", "#0f141b")
    .attr("stroke-width", 0.8)
    .attr("vector-effect", "non-scaling-stroke");

  // Initial map zoom position
  svg.call(
    zoom.transform,
    d3.zoomIdentity.translate(width/2, height/2).scale(0.95)
  );

  // After loading, run first draw
  update();
  drawSeasonalChart();

    // ───────────────────────────────
  // Seasonal Chart (fixed responsive version)
  // ───────────────────────────────
  function drawSeasonalChart() {
    const svgS = d3.select("#seasonalChart");
    svgS.selectAll("*").remove();

    const bounds = svgS.node().getBoundingClientRect();
    const margin = {top: 10, right: 20, bottom: 25, left: 40};

    const width = bounds.width - margin.left - margin.right;
    const height = bounds.height - margin.top - margin.bottom;

    const g = svgS.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Compute average monthly counts across all years + states
    const monthlyData = d3.range(1, 13).map(m => {
      let total = 0, count = 0;

      statesFeat.forEach(f => {
        years.forEach(y => {
          const row = dataByKey.get(key(getStateName(f), y, m, "A"));
          if (row && row.count) {
            total += row.count;
            count++;
          }
        });
      });

      return {
        month: m,
        avgCount: count ? total / count : 0
      };
    });

    // Scales
    const x = d3.scaleLinear()
      .domain([1, 12])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(monthlyData, d => d.avgCount)])
      .range([height, 0]);

    // Line
    const line = d3.line()
      .x(d => x(d.month))
      .y(d => y(d.avgCount))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(monthlyData)
      .attr("fill", "none")
      .attr("stroke", "#ff7a18")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Circles
    g.selectAll("circle")
      .data(monthlyData)
      .join("circle")
      .attr("cx", d => x(d.month))
      .attr("cy", d => y(d.avgCount))
      .attr("r", d => d.month === current.month ? 5 : 3)
      .attr("fill", d => d.month === current.month ? "#ff7a18" : "#bbb");

    // X-axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(4)
          .tickFormat(d => monthNames[d])
      )
      .attr("font-size", "11px");
  }

  // ───────────────────────────────
  // Detail Chart for state
  // ───────────────────────────────
  function drawDetailChart(stateName) {
    const svgD = d3.select("#detailChart");
    svgD.selectAll("*").remove();

    // Extract all months across years for that state
    const data = Array.from(dataByKey.entries())
      .map(([k, v]) => {
        const [s, y, m, dn] = k.split("__");
        if (s !== stateName || dn !== current.dn) return null;
        return {year: +y, month: +m, count: +v.count};
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.year === b.year
          ? a.month - b.month
          : a.year - b.year
      );

    if (!data.length) {
      d3.select("#detailTitle").text(`${stateName}: No data`);
      return;
    }

    // Parse to date
    const date = d => new Date(d.year, d.month - 1);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => date(d)))
      .range([40, 380]);

    // FIXED: Y-axis consistent scale (stabilizes transitions)
    const maxCount = d3.max(data, d => d.count);
    const y = d3.scaleLinear()
      .domain([0, maxCount * 1.05])
      .range([220, 20]);

    const line = d3.line()
      .x(d => x(date(d)))
      .y(d => y(d.count));

    svgD.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#ff7a18")
      .attr("stroke-width", 2)
      .attr("d", line);

    svgD.append("g")
      .attr("transform", "translate(0,220)")
      .call(d3.axisBottom(x).ticks(5));

    svgD.append("g")
      .attr("transform", "translate(40,0)")
      .call(d3.axisLeft(y).ticks(4));

    d3.select("#detailTitle").text(`${stateName} — Monthly Wildfires`);
  }
    // ───────────────────────────────
  // MAIN UPDATE FUNCTION
  // ───────────────────────────────
  function update() {
    monthLabel.textContent = monthNames[current.month];
    yearLabel.textContent = current.year;

    // Gather values for the current month (for color domain)
    const vals = statesFeat.map(f => {
      const row = dataByKey.get(
        key(getStateName(f), current.year, current.month, current.dn)
      );
      if (!row) return NaN;

      if (current.metric === "count") return row.count;
      if (current.metric === "avg_brightness") return row.avg_brightness;
      return row.median_frp;
    }).filter(Number.isFinite);

    // FIXED: true domain based on actual data (2%–98% trimmed)
    const vmin = vals.length ? d3.quantile(vals, 0.02) : 0;
    const vmax = vals.length ? d3.quantile(vals, 0.98) : 1;
    color.domain([vmin, vmax]);

    // FIXED: Legend text updates properly
    legendMin.textContent = d3.format(".2s")(vmin);
    legendMax.textContent = d3.format(".2s")(vmax);

    // show FRP note only when using FRP
    frpNote.style.display =
      current.metric === "median_frp" ? "block" : "none";

    // ───────────────────────────────
    // Map fill
    // ───────────────────────────────
    statePath
      .attr("fill", d => {
        const row = dataByKey.get(
          key(getStateName(d), current.year, current.month, current.dn)
        );
        if (!row) return "#1a2230";

        const val =
          current.metric === "count" ? row.count :
          current.metric === "avg_brightness" ? row.avg_brightness :
          row.median_frp;

        return Number.isFinite(val) ? color(val) : "#1a2230";
      })

      // ───────────────────────────────
      // Tooltip (with throttling)
      // ───────────────────────────────
      .on("mousemove", throttle((ev, d) => {
        const name = getStateName(d);
        const rowAll = dataByKey.get(
          key(name, current.year, current.month, "A")
        );
        const rowDN = dataByKey.get(
          key(name, current.year, current.month, current.dn)
        ) || rowAll;

        const fmt = d3.format(",.0f");
        const fmt1 = d3.format(".1f");

        tooltip
          .style("display", "block")
          .style("left", ev.clientX + 16 + "px")
          .style("top",  ev.clientY + 16 + "px")
          .html(`
            <div class="h">${name} — ${monthNames[current.month]} ${current.year}
              (${current.dn === "A" ? "All" : current.dn === "D" ? "Day" : "Night"})
            </div>
            <div><b>Detections:</b> ${fmt(rowDN?.count ?? 0)}</div>
            <div><b>Avg. brightness:</b> ${
              Number.isFinite(rowDN?.avg_brightness)
                ? fmt1(rowDN.avg_brightness) : "—"
            }</div>
            <div><b>Median FRP:</b> ${
              Number.isFinite(rowDN?.median_frp)
                ? fmt1(rowDN.median_frp) : "—"
            }</div>
            <div><b>Max fires/day:</b> ${rowDN?.max_day_count ?? "—"}
              <span style="color:#9fb0c3">${
                rowDN?.max_day_date ? "(" + rowDN.max_day_date + ")" : ""
              }</span>
            </div>
          `);
      }, 25))    // throttle every 25ms
      .on("mouseleave", () => tooltip.style("display", "none"))

      // ───────────────────────────────
      // State click → detail chart
      // ───────────────────────────────
      .on("click", (ev, d) => {
        drawDetailChart(getStateName(d));
      });

    drawSeasonalChart();
  }

  // ───────────────────────────────
  // TOOLTIP THROTTLE FUNCTION
  // ───────────────────────────────
  function throttle(fn, delay) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, args);
      }
    };
  }
    // ───────────────────────────────
  // CONTROL LISTENERS
  // ───────────────────────────────

  // Month slider
  monthInput.addEventListener("input", e => {
    current.month = +e.target.value;
    update();
  });

  // Metric dropdown
  metricSelect.addEventListener("change", e => {
    current.metric = e.target.value;
    update();
  });

  // Day / Night / All toggle buttons
  dnGroup.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      dnGroup.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      current.dn = btn.dataset.dn;
      update();
    });
  });

  // Year dropdown
  yearSelect.addEventListener("change", e => {
    current.year = +e.target.value;
    update();
  });

  // ───────────────────────────────
  // PLAY / PAUSE ANIMATION
  // ───────────────────────────────
  function tickMonth() {
    current.month = (current.month % 12) + 1;
    monthInput.value = current.month;
    update();
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (monthTimer) {
        // PAUSE
        clearInterval(monthTimer);
        monthTimer = null;
        playBtn.textContent = "▶ Play";
      } else {
        // PLAY
        tickMonth();  // show next month immediately
        monthTimer = setInterval(tickMonth, 900); // smooth animation
        playBtn.textContent = "❚❚ Pause";
      }
    });
  }

}); // END OF Promise.then

// ───────────────────────────────
// END OF FILE
// ───────────────────────────────