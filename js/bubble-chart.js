class BubbleChart {
  constructor({
    el,
    data,
    keyAccessor,
    nameAccessor,
    xAccessor,
    yAccessor,
    rAccessor,
    xTitle,
    xTickFormat,
    tooltipContent,
  }) {
    this.el = el;
    this.data = data;
    this.keyAccessor = keyAccessor;
    this.nameAccessor = nameAccessor;
    this.xAccessor = xAccessor;
    this.yAccessor = yAccessor;
    this.rAccessor = rAccessor;
    this.xTitle = xTitle;
    this.xTickFormat = xTickFormat;
    this.tooltipContent = tooltipContent;
    this.moved = this.moved.bind(this);
    this.left = this.left.bind(this);
    this.init();
  }

  init() {
    this.marginTop = 48;
    this.marginRight = 96;
    this.marginBottom = 48;
    this.marginLeft = 48;

    this.x = d3.scaleLog();
    this.y = d3.scalePoint().padding(0.5);
    this.r = d3.scaleSqrt();

    this.container = d3.select(this.el).classed("bubble-chart", true);
    this.svg = this.container
      .append("svg")
      .on("pointerenter", this.moved)
      .on("pointermove", this.moved)
      .on("pointerleave", this.left)
      .on("touchstart", (event) => event.preventDefault(), { passive: true });
    this.tooltip = this.container.append("div").attr("class", "tooltip");

    this.resizeObserver = new ResizeObserver((entries) =>
      entries.forEach((entry) => this.resized(entry.contentRect))
    );
    this.resizeObserver.observe(this.el);
  }

  resized({ width }) {
    if (!width || this.width === width) return;
    this.width = width;
    this.computeLayout();
  }

  computeLayout() {
    this.x
      .domain(d3.extent(this.data, this.xAccessor))
      .range([this.marginLeft, this.width - this.marginRight]);

    this.ys = Array.from(new Set(this.data.map(this.yAccessor))).sort(
      d3.ascending
    );
    this.rowHeight = this.ys.length === 1 ? 400 : 160;
    this.height =
      this.marginTop + this.marginBottom + this.rowHeight * this.ys.length;
    this.y
      .domain(this.ys)
      .range([this.marginTop, this.height - this.marginBottom]);

    this.rMin = this.width / 320;
    this.rMax = this.width / 16;
    this.r
      .domain(d3.extent(this.data, this.rAccessor))
      .range([this.rMin, this.rMax]);

    this.simulation = d3
      .forceSimulation(this.data)
      .force(
        "x",
        d3
          .forceX()
          .x((d) => this.x(this.xAccessor(d)))
          .strength(1)
      )
      .force(
        "y",
        d3
          .forceY()
          .y((d) => this.y(this.yAccessor(d)))
          .strength(0.1)
      )
      .force(
        "collision",
        d3
          .forceCollide()
          .radius((d) => this.r(this.rAccessor(d)) + 1)
          .strength(1)
          .iterations(2)
      )
      .stop()
      .tick(300);

    this.render();
  }

  render() {
    this.svg.attr("pointer-events", "none");

    this.transition = this.svg.transition().duration(750);

    if (!this.svg.attr("height")) this.svg.attr("height", this.height);
    this.svg
      .attr("width", this.width)
      .transition(this.transition)
      .attr("height", this.height);

    const ticks = (this.width - this.marginLeft - this.marginRight) / 100;

    this.svg
      .selectAll(".axis")
      .data([0])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "axis")
          .attr("transform", `translate(0,${this.marginTop})`)
      )
      .call(
        d3
          .axisTop(this.x)
          .ticks(ticks)
          .tickFormat(this.x.tickFormat(ticks, this.xTickFormat))
      )
      .call((g) =>
        g
          .selectAll(".axis-title")
          .data([this.xTitle])
          .join((enter) =>
            enter
              .append("text")
              .attr("class", "axis-title")
              .attr("fill", "currentColor")
              .attr("text-anchor", "start")
              .text((d) => d)
          )
      );

    this.rowG = this.svg
      .selectAll(".rows-g")
      .data([0])
      .join((enter) => enter.append("g").attr("class", "rows-g"))
      .selectAll(".row-g")
      .data(this.ys, (d) => d)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "row-g")
          .attr("transform", (d) => `translate(0,${this.y(d)})`)
          .call((g) =>
            g
              .append("text")
              .attr("class", "row-text")
              .attr("dy", "0.32em")
              .text((d) => d)
          )
          .call((g) =>
            g
              .append("line")
              .attr("class", "row-line")
              .attr("x1", this.marginLeft)
          )
      )
      .call((g) =>
        g.select(".row-line").attr("x2", this.width - this.marginRight)
      );

    this.bubbleG = this.svg
      .selectAll(".bubbles-g")
      .data([0])
      .join((enter) => enter.append("g").attr("class", "bubbles-g"))
      .selectAll(".bubble-g")
      .data(this.data, this.keyAccessor)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "bubble-g")
          .attr("transform", (d) => `translate(${d.x},${d.y})`)
          .call((g) => g.append("circle").attr("class", "bubble-circle"))
      )
      .call((g) =>
        g.select(".bubble-circle").attr("r", (d) => this.r(this.rAccessor(d)))
      )
      .call((g) => g.selectAll("text").remove())
      .call((g) =>
        g
          .filter((d) => this.r(this.rAccessor(d)) > 16)
          .selectAll("text")
          .data((d) => {
            let texts = [this.xTickFormat(this.xAccessor(d))];
            if (this.r(this.rAccessor(d)) > 24)
              texts = [...this.nameAccessor(d).split(" "), ...texts];
            return texts;
          })
          .join("text")
          .attr("class", "bubble-text")
          .attr("text-anchor", "middle")
          .attr("fill", "currentColor")
          .attr("dy", (_, i, n) => `${(i - (n.length - 1) / 2) * 1.1 + 0.32}em`)
          .text((d) => d)
      );

    this.bubbleG
      .transition(this.transition)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .delay((_, i) => i * 2)
      .end()
      .then(() => {
        this.delaunay = d3.Delaunay.from(
          this.data,
          (d) => d.x,
          (d) => d.y
        );
        this.svg.attr("pointer-events", null);
      });
  }

  moved(event) {
    const [mx, my] = d3.pointer(event);
    let p = this.delaunay.find(mx, my);
    const distance = Math.hypot(mx - this.data[p].x, my - this.data[p].y);
    const minDistance = this.rMax;
    if (distance > minDistance) return this.left();
    this.bubbleG.classed("is-active", (_, i) => i === p);
    const d = this.data[p];
    this.tooltip.html(this.tooltipContent(d)).classed("is-active", true);
    const { width, height } = this.tooltip.node().getBoundingClientRect();
    let tx = d.x - width / 2;
    if (tx < 0) tx = 0;
    if (tx + width > this.width) tx = this.width - width;
    let ty = d.y - this.r(this.rAccessor(d)) - height - 4;
    this.tooltip.style("transform", `translate(${tx}px,${ty}px)`);
  }

  left() {
    this.bubbleG.classed("is-active", false);
    this.tooltip.classed("is-active", false);
  }

  redraw() {
    this.computeLayout();
  }
}
