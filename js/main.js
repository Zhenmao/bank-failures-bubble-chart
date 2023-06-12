d3.csv("bfb-data@1.csv").then((csv) => {
  const data = processData(csv);

  document.querySelectorAll("input[name='groupBy']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const groupBy = event.target.value;
      bubbleChart.yAccessor = groupBy ? (d) => d[groupBy] : () => "";
      bubbleChart.redraw();
    });
  });

  const xTickFormat = (d) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
    }).format(d * 1e6);

  const xValueFormat = (d) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(d * 1e6);

  const bubbleChart = new BubbleChart({
    el: document.querySelector("#chart"),
    data,
    keyAccessor: (d) => d.key,
    nameAccessor: (d) => d.name,
    xAccessor: (d) => d.assets,
    yAccessor: () => "",
    rAccessor: (d) => d.assets,
    xTickFormat,
    xTitle: "Assets",
    tooltipContent: (d) => {
      const name = d.name;
      const date = d3.utcFormat("%b %d, %Y")(d.date);
      const location = d.location;
      const assets = xValueFormat(d.assets);
      return `
      <div>${name}</div>
      <div>${location}</div>
      <div>${date}</div>
      <div>${assets}</div>
      `;
    },
  });
});

function processData(csv) {
  const parseDate = d3.utcParse("%d-%b-%y");
  const parseAssets = (x) => parseFloat(x.replace(/[^\d.]/g, ""));
  return csv
    .map((d, i) => {
      const [name, ...location] = d[csv.columns[0]].split(", ");
      const state = location[location.length - 1].trim();
      const date = parseDate(d[csv.columns[2]]);
      const year = String(date.getFullYear());
      const assets = parseAssets(d[csv.columns[3]]);
      return {
        key: i,
        name,
        location,
        state,
        date,
        year,
        assets,
      };
    })
    .sort((a, b) => d3.ascending(a.assets, b.assets));
}
