// Define margins, barWidth and width and height in relation to margins
var margin = {top: 20, right: 75, bottom: 30, left: 20},
    width = 960 - margin.left - margin.right,
    height = 560 - margin.top - margin.bottom,
    barWidth = Math.floor(height / 20) - 1; // will display 19 age categories, this could change

var x = d3.scale.linear().range([width, 0]); // maps to [1910, 2000]
x.domain([0, 0.10 ]); 

var nums = false;
var outlines = true;
var year_now = 2015;
// axis work similarly to scales
// No input is defined on axis scale, just output (for drawing).
var xAxis = d3.svg.axis()
    .orient("bottom")
    .tickSize(height); // creates them across the chart

xAxis.scale(d3.scale.linear().range([width, 0]));
xAxis.tickFormat(function(d) { return Math.round(10 * +d.toFixed(2)) + "%"; });

// Here we go: start drawing the svg
// An SVG element with a bottom-right origin.
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // append a g and shift it in by the margins

// Labels for the current year and country.
var title = svg.append("text")
    .attr("class", "title")
    .attr("dy", "0.71em")
    .text('WORLD'); // I bet I can set this later
var title2 = svg.append("text")
    .attr("class", "title")
    .attr("dy", "1.71em")
    .text(year_now); // dangerous to hardcode the defaults?

// A sliding container to hold the bars birthyears.
var birthyears = svg.append("g")
    .attr("class", "birthyears");

// Rounds off so that we have the appropriate number of digits.  It relies on d3's default significant digit behavior 
function calc_sig_digits(biggest) {
  if (biggest > 6600) {
    return 0;
  } else if (biggest > 660) {
    return 1;
  } else if (biggest > 66) {
    return 2;
  } else {
    return 3;
  }
}

d3.csv("processed_data.csv", function(error, data) {

  // Convert strings to numbers. sex and country not coverted
  data.forEach(function(d) {
    d.people = parseFloat(d.people);
    d.year = +d.year;
    d.age = +d.age;
  });

  // Compute the extent of the data set in age and years.
  max_age = d3.max(data, function(d) { return d.age; }),
  min_year = d3.min(data, function(d) { return d.year; }), // across ALL countries...could be a problem
  max_year = d3.max(data, function(d) { return d.year; }),
  year = year_now,
  country_i = 0;

  // Update the scale input domains.
  y = d3.scale.linear().domain([year - max_age, year]).range([0, height - barWidth / 2]); // maps current year to earliest birth year 

  // Sums total population by country and year.
  // Used for circles and calculating proportions
  data_sums = d3.nest()
      .key(function(d) { return d.country; }) // rollup by year
      .key(function(d) { return d.year; }) // rollup by year
      .rollup(function(d) { 
          return d3.sum(d, function(g) {return g.people; });
      })
      .map(data);

  // Sum by year, then country, to use for maximum size of each country
  var pop2015 = d3.nest()
      .key(function(d) { return d.year; }) // rollup by year
      .key(function(d) { return d.country; }) // rollup by year
      .rollup(function(d) { 
          return d3.sum(d, function(g) {
	      return g.people; });
      })
      .map(data);
  pop2015 = pop2015[2015];

  // Sum by year, then country, to use for maximum size of each country
  country_maxs = d3.nest()
      .key(function(d) { return d.country; }) // rollup by year
      .rollup(function(d) { 
          return d3.max(d, function(g) {
	      return g.people; });
      })
      .map(data);
//  console.log(JSON.stringify(country_maxs['United States of America']));

  // Produce a map from country and year and to % female.
  // Used for gender ratio in the circle
  data_sex = d3.nest()
      .key(function(d) { return d.country; }) // rollup by year
      .key(function(d) { return d.year; }) // rollup by year
      .key(function(d) { return d.sex; }) // rollup by year
      .rollup(function(d) { 
          return d3.sum(d, function(g) {return g.people; });
      })
      .map(data);

  // Sorts by population
  var country_list = Object.keys(pop2015).sort(function(a,b){return pop2015[b]-pop2015[a]});
  var max_country_i = country_list.length;

  this_country = "WORLD";
  max_group = country_maxs[this_country];
  sig_digs = calc_sig_digits(max_group);


  var dropDown = d3.select("#dd").append("select")
                    .attr("name", "country-list");
  var options = dropDown.selectAll("option")
         .data(country_list)
         .enter()
         .append("option");
  options.text(function (d, i) { return d; })
         .attr("value", function (d, i) { return i; });


  // Prep for circles
  var pop_max = d3.max(data, function(d) { return data_sums[this_country][d.year] });
  var radius = d3.scale.sqrt()
    .domain([0, data_sums['WORLD'][year_now]])
    .range([0, 310]);

  // PROPORTIONS
  // Produce a map from country, year and birthyear to [male, female].
  data2 = d3.nest()
      .key(function(d) { return d.country; }) // rollup by year
      .key(function(d) { return d.year; }) // rollup by year
      .key(function(d) { return d.year - d.age; }) // then birthyear
      .rollup(function(v) { return v.map(function(d) { return d.people / data_sums[d.country][d.year]; }); }) // sex is the only variable left out, I think that's why it rollsup by it
      .map(data);

  // TOTALS
  // Produce a map from country, year and birthyear to [male, female].
  data3 = d3.nest()
      .key(function(d) { return d.country; }) // rollup by year
      .key(function(d) { return d.year; }) // rollup by year
      .key(function(d) { return d.year - d.age; }) // then birthyear
      .rollup(function(v) { return v.map(function(d) { return d.people; }); }) // sex is the only variable left out, that's why it rollsup by it
      .map(data);

  // Add X axis to show the population values.
  svg.append("g")
     .attr("class", "x axis")
     .call(xAxis)
     .selectAll("g")
     .filter(function(value) { return !value; })
     .classed("zero", true); // this and the above line have something to do with the 0-line styling

  // Add labeled rects for each birthyear, only those positioned on the svg are rendered (so that no enter or exit is required).
  // Data entered is all the possible birthyears
  birthyear = birthyears.selectAll(".birthyear")
      .data(d3.range(min_year - max_age, max_year + 1, 5))
    .enter().append("g")
      .attr("class", "birthyear")
      .attr("fill-opacity", function(birthyear) { return 0.35 + ((birthyear % 30)) / 65 })
      .attr("transform", function(birthyear) { return "translate(0," + y(birthyear) + ")"; });

  birthyear.selectAll("rect")
      .data(function(birthyear) { return data2[this_country][year][birthyear] || [0, 0]; })
    .enter().append("rect")
      .attr("y", -barWidth / 2)
      .attr("height", barWidth)
      .attr("x", x) // NOTE that this is done after domain is set
      .attr("width", function(value) { return width - x(value); });

//  birthyear.selectAll("rect:last-child")
//      .attr("stroke", "black");

  // Add labels to show birthyear.
  birthyear.append("text")
      .attr("transform", "translate(-20,5)")
      .attr("x", width - 24)
      .text(function(birthyear) { return (birthyear - 5).toString() + " - " + birthyear.toString(); });

  now = svg.selectAll(".now")
      .data(d3.range(min_year - max_age, max_year + 1, 5))
    .enter().append("g")
      .attr("class", "now")
      .attr("fill-opacity", 0.05)
      .attr("transform", function(now) { return "translate(0," + y(now) + ")"; });

  now.selectAll("rect")
      .data(function(now) { return data2[this_country][year_now][now] || [0, 0]; })
    .enter().append("rect")
      .attr("y", -barWidth / 2)
      .attr("height", barWidth)
      .attr("x", x)
      .attr("width", function(value) { return width - x(value); });

  // Add labels to show age (separate; not animated).
  svg.selectAll(".age")
      .data(d3.range(0, max_age + 1, 5))
    .enter().append("text")
      .attr("transform", "translate(22,5)")
      .attr("class", "age")
      .attr("y", function(age) { return y(year - age); })
      .attr("x", width + 0)
      .attr("dx", ".71em")
      .text(function(age) { 
	   
	  if (age === 100) { return age.toString() + "+"}
	  else {return age.toString() + " - " + (age + 5).toString();}
      });

  // todo: Make these into a group (g)  also add to CSS
  var ratio = data_sex[this_country][year][2] / (data_sex[this_country][year][2] + data_sex[this_country][year][1]);

  var hue_scale = d3.scale.linear().domain([0.3,0.7]).range([240, 360]);
  var hue = hue_scale(ratio);
  var cx = 170;
  var cy = 136;
  var circle = svg.append("circle").attr("id", "circle")
     .attr("fill", "hsl(" + hue + ", 40%, 50%)")
     .attr("fill-opacity", 0.1)
     .attr("transform", "translate(" + cx + "," + cy+ ")") 
     .attr("r", function() { return radius(data_sums[this_country][year]);});

  circle_o = svg.append("circle").attr("id", "circle_o")
     .attr("fill", "hsl(" + hue + ", 40%, 50%)")
     .attr("fill-opacity", 0.05)
     .attr("stroke", "hsl(" + hue + ", 40%, 50%)")
     .attr("transform", "translate(" + cx + "," + cy+ ")") 
     .attr("r", function() { return radius(data_sums[this_country][year_now]);});

  cx = cx - 170;
  cy = cy - 22 + 0;
  var circle_text1 = svg.append("text")
      .attr("class", "circle")
      .attr("transform", "translate(" + cx + "," + cy+ ")") 
      .text(function() { return Math.round(data_sums[this_country][year] / 1e3) + " million people"; });
  cy = cy + 30;
  var circle_text2 = svg.append("text")
      .attr("class", "circle")
      .attr("transform", "translate(" + cx + "," + cy+ ")") 
      .text(function() { 
	      return Math.round(100 * +ratio.toFixed(4)) + "% female"; 
  });

  ////////////////////////////////////////////////////////////////////
  // Allow the arrow keys to change the displayed year.
  ////////////////////////////////////////////////////////////////////
  window.focus();
  d3.select(window).on("keydown", function() {
    switch (d3.event.keyCode) {
        case 40: year -= 5; if (year < min_year) {year = max_year}; break; // D
        case 38: year += 5; if (year > max_year) {year = min_year}; break; // U
        case 37: country_i -= 1; if(country_i < 0) { country_i = max_country_i - 1 }; break; // L
        case 39: country_i += 1; if(country_i >= max_country_i) { country_i = 0}; break; // R
    }
    this_country = country_list[country_i];
    max_group = country_maxs[this_country];
    sig_digs = calc_sig_digits(max_group); 
    update();
  });

  dropDown.on("change", function() {
      country_i = d3.event.target.value;
      this_country = country_list[country_i];
      max_group = country_maxs[this_country];
      sig_digs = calc_sig_digits(max_group); 
      update();
      this.blur();
  });

  ////////////////////////////////////////////////////////////////////
  // Function for updating the data based on arrow keys
  ////////////////////////////////////////////////////////////////////
  function update() {
    if (!(year in data2[this_country])) return;
    title.text(this_country);
    title2.text(year);

    birthyears.transition().duration(850)
        .attr("transform", "translate(0," + (y(year_now) - y(year)) + ")");

    // NUMERICAL TOTALS
    if (nums) {

// If I wanted to bring back birth cohorts it would be something like this
//        now.transition().duration(850)
//       .attr("transform", function(now) { return "translate(0," + y(now + year_now - year) + ")"; });

        x.domain([0, max_group]);
        birthyear.selectAll("rect")
          .data(function(birthyear) { return data3[this_country][year][birthyear] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });

        now.selectAll("rect")
         .data(function(now) { return data3[this_country][year_now][now] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });

	xAxis.tickFormat(function(d) { return (d / 1e3).toFixed(sig_digs) + "M"; });
        xAxis.scale(x);
        svg.transition().duration(1).select(".x.axis").call(xAxis)

    // % PROPORTIONS
    } else {

        birthyear.selectAll("rect")
          .data(function(birthyear) { return data2[this_country][year][birthyear] || [0, 0]; })
         .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });

        now.selectAll("rect")
         .data(function(now) { return data2[this_country][year_now][now] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });
    }

    ratio = data_sex[this_country][year][2] / (data_sex[this_country][year][2] + data_sex[this_country][year][1]);
    hue = hue_scale(ratio);
    circle.transition().duration(850)
        .attr("fill", "hsl(" + hue + ", 40%, 50%)")
        .attr("r", function() { return radius(data_sums[this_country][year]);});
    circle_o.transition().duration(850)
        .attr("fill", "hsl(" + hue + ", 40%, 50%)")
        .attr("stroke", "hsl(" + hue + ", 40%, 50%)")
        .attr("r", function() { return radius(data_sums[this_country][year_now]);});
    circle_text1.transition().duration(850)
        .text(function() { return Math.round(data_sums[this_country][year] / 1e3) + " million people"; });
    circle_text2.transition().duration(850)
      .text(function() { 
	      return Math.round(1000 * +ratio.toFixed(3)) / 10 + "% female"; 
      });
  }

});

////////////////////////////////////////////////////////////////////
// TOGGLE Function
////////////////////////////////////////////////////////////////////
function makeNumbers() {
    if (nums) { nums = false }
    else { nums = true }

    // NUMERICAL TOTALS
    if (nums) {
//      For BIRTH COHORTS
//      now.transition().duration(850)
//      .attr("transform", function(now) { return "translate(0," + y(now) + ")"; });
//      I think it's the below
//      .attr("transform", function(now) { return "translate(0," + y(now + year_now - year) + ")"; });

        x.domain([0, max_group]);
        birthyear.selectAll("rect")
          .data(function(birthyear) { return data3[this_country][year][birthyear] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });
        now.selectAll("rect")
          .data(function(now) { return data3[this_country][year_now][now] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });
        xAxis.tickFormat(function(d) { return (d / 1e3).toFixed(sig_digs) + "M"; });
        xAxis.scale(x);

    // % PROPORTIONS
    } else {

        x.domain([0, 0.10 ]);
        birthyear.selectAll("rect")
          .data(function(birthyear) { return data2[this_country][year][birthyear] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });
        now.selectAll("rect")
          .data(function(now) { return data2[this_country][year_now][now] || [0, 0]; })
          .transition().duration(850)
          .attr("x", x)
          .attr("width", function(value) { return width - x(value); });
        xAxis.tickFormat(function(d) { return Math.round(100 * +d.toFixed(2)) + "%"; });
        xAxis.scale(x);

    }

    svg.transition().duration(1).select(".x.axis").call(xAxis)
}


////////////////////////////////////////////////////////////////////
// 2015 Function
////////////////////////////////////////////////////////////////////
function doOutlines() {
    if (outlines) { outlines = false }
    else { outlines = true }

    // Re-Add Outlines
    if (outlines) {
        now.selectAll("rect").transition().duration(850)
          .attr("fill-opacity", 0.05)
          .attr("stroke-opacity", 1.00);
        circle_o.transition().duration(850)
          .attr("fill-opacity", 0.05)
          .attr("stroke-opacity", 1.00);

    // Drop Outlines
    } else {
        now.selectAll("rect").transition().duration(850)
          .attr("fill-opacity", 0.00)
          .attr("stroke-opacity", 0.00);
        circle_o.transition().duration(850)
          .attr("fill-opacity", 0.00)
          .attr("stroke-opacity", 0.00);

    }

}
