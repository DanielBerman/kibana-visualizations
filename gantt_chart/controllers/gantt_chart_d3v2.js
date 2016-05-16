/**
 * @author Dimitry Kudrayvtsev
 * @version 2.0
 */
define(function (require) {

	var d3 = require('d3');

	d3.gantt = function() {
	    var FIT_TIME_DOMAIN_MODE = "fit";
	    var FIXED_TIME_DOMAIN_MODE = "fixed";
	    var DEFAULT_BLOCK_COLOR = "#57c17b";
	    
	    var margin = {
		top : 10,
		right : 65,
		bottom : 40,
		left : 75
	    };

	    var padding = {
		top : 10,
		right : 10,
		bottom : 10,
		left : 10
	    };

	    var timeDomainStart = d3.time.day.offset(new Date(),-3);
	    var timeDomainEnd = d3.time.hour.offset(new Date(),+3);
	    var timeDomainMode = FIT_TIME_DOMAIN_MODE;// fixed or fit
	    var taskTypes = [];
	    var height = document.body.clientHeight - margin.top - margin.bottom-5;
	    var width = document.body.clientWidth - margin.right - margin.left-5;
	    var tooltipFields = [];

	    var tickFormat = "%H:%M";
	    var ticks = 10;

	    var keyFunction = function(d) {
		return d.startDate + d.taskName + d.endDate;
	    };

	    var colorFunction = function (d) {
	    	// Default block color
	    	return DEFAULT_BLOCK_COLOR;
	    };

	    var rectTransform = function(d) {
		return "translate(" + x(d.startDate) + "," + y(d.taskName) + ")";
	    };

	    var x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, width ]).clamp(true);

	    var y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);
	    
	    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(d3.time.format(tickFormat)).ticks(ticks);

	    var yAxis = d3.svg.axis().scale(y).orient("left").tickSize(0);

	    var initTimeDomain = function(tasks) {
			if (timeDomainMode === FIT_TIME_DOMAIN_MODE) {
			    if (tasks === undefined || tasks.length < 1) {
				timeDomainStart = d3.time.day.offset(new Date(), -3);
				timeDomainEnd = d3.time.hour.offset(new Date(), +3);
				return;
			    }
			    tasks.sort(function(a, b) {
				return a.endDate - b.endDate;
			    });
			    timeDomainEnd = tasks[tasks.length - 1].endDate;
			    tasks.sort(function(a, b) {
				return a.startDate - b.startDate;
			    });
			    timeDomainStart = new Date(tasks[0].startDate);
			    timeDomainEnd = new Date();
			}
	    };

	    var tickFormatter = function (val) {
	    	return d3.time.format(tickFormat)(val);
	    }

	    var initAxis = function() {

			x = d3.time.scale().domain([ timeDomainStart, timeDomainEnd ]).range([ 0, width - margin.left - margin.right ]).clamp(true);
			y = d3.scale.ordinal().domain(taskTypes).rangeRoundBands([ 0, height - margin.top - margin.bottom ], .1);

			xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(tickFormatter).ticks(ticks);
			yAxis = d3.svg.axis().scale(y).orient("left").tickSize(0);
	    };
	    
	    function gantt(tasks, element) {

	    	containerElement = $(element);

	    	// Set minimal and active size for the chart.
	    	width = containerElement.width() - padding.left - padding.right;
	    	height = containerElement.height() - padding.top - padding.bottom;

	    	width = width < 440 ? 440 : width;
	    	height = height < 150 ? 150 : height;

	    	// Init time domain and axis
			initTimeDomain(tasks);
			initAxis();

			// Empty previous chart draw, the redraw function should be used somewhow instead.
			containerElement.empty();

			var tooltip = d3.select("body").append("div")   
					    .attr("class", "gantt-tooltip")               
					    .style("opacity", 0);

			var svg = d3.select(element)
				.append("svg")
				.attr("class", "chart")
				.attr("width", width)
				.attr("height", height)
				.append("g")
			    .attr("class", "gantt-chart")
				.attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
			
		    svg.selectAll(".chart")
				.data(tasks, keyFunction).enter()
				.append("rect")
				.attr("rx", 5)
				.attr("ry", 5)
				.style("fill", function(d){
			 		return colorFunction(d.color);
			 	})
				.attr("transform", rectTransform)
				.attr("height", function(d) { return y.rangeBand(); })
				.attr("width", function(d) {
					return (x(d.endDate) - x(d.startDate)); 
				})
				.on('mouseover', function (d) {
					tooltip.transition().duration(200).style("opacity", .93);      
				    tooltip.html(TooltipFormatter(d))
				      .style("left", (d3.event.pageX) + "px")     
				      .style("top", (d3.event.pageY) + "px");
				})
				.on('mouseout', function (d) {
					tooltip.transition().duration(300).style("opacity", 0);  
				});
			 
			 
			svg.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0, " + (height - margin.top - margin.bottom) + ")")
				.transition()
				.call(xAxis);
			 
			svg.append("g").attr("class", "y axis").transition().call(yAxis);

			return gantt;
	    };

	    var TooltipFormatter = function (dataElement) {
	    	
	    	var html = "<table>";

	    	tooltipFields.forEach(function (elem) {
	    		html += "<tr><td><b>" + elem + "</b></td><td>" + dataElement[elem] + "</td></tr>";
	    	})

	    	return html;
	    }
	    
	 //    gantt.redraw = function(tasks) {
		// initTimeDomain(tasks);
		// initAxis();
		
	 //    var svg = d3.select("svg");

	 //    var ganttChartGroup = svg.select(".gantt-chart");
	 //    var rect = ganttChartGroup.selectAll("rect").data(tasks, keyFunction);
	        
  //       rect.enter()
  //       .insert("rect",":first-child")
  //       .attr("rx", 5)
  //       .attr("ry", 5)
	 // 	.style("fill", function(d){
		//  	return colorFunction(d.color);
		//  })
	 // 	.transition()
	 // 	.attr("y", 0)
		// .attr("transform", rectTransform)
	 // 	.attr("height", function(d) { return y.rangeBand(); })
	 // 	.attr("width", function(d) { 
	 //    	return (x(d.endDate) - x(d.startDate)); 
	 //    });

	 //    rect.transition()
  //       .attr("transform", rectTransform)
	 // 	.attr("height", function(d) { return y.rangeBand(); })
	 // 	.attr("width", function(d) { 
	 //    	return (x(d.endDate) - x(d.startDate)); 
	 //    });
	        
		// rect.exit().remove();

		// svg.select(".x").transition().call(xAxis);
		// svg.select(".y").transition().call(yAxis);
		
		// return gantt;
	 //    };

	    gantt.margin = function(value) {
		if (!arguments.length)
		    return margin;
		margin = value;
		return gantt;
	    };

	    gantt.timeDomain = function(start, end) {
		if ((!start) || (!end))
		    return [ timeDomainStart, timeDomainEnd ];
		timeDomainStart = start, timeDomainEnd = end;
		return gantt;
	    };

	    /**
	     * @param {string}
	     *                vale The value can be "fit" - the domain fits the data or
	     *                "fixed" - fixed domain.
	     */
	    gantt.timeDomainMode = function(value) {
			if (!arguments.length)
		    	return timeDomainMode;
	        timeDomainMode = value;
	        return gantt;

	    };

	    gantt.taskTypes = function(value) {
			if (!arguments.length)
			    return taskTypes;
			taskTypes = value;
			return gantt;
	    };

	    gantt.width = function(value) {
			if (!arguments.length)
			    return width;
			width = +value;
			return gantt;
	    };

	    gantt.height = function(value) {
			if (!arguments.length)
			    return height;
			height = +value;
			return gantt;
	    };

	    gantt.tickFormat = function(value) {
			if (!arguments.length)
			    return tickFormat;
			tickFormat = value;
			return gantt;
	    };

	    gantt.ticks = function(value) {
			if (!arguments.length)
			    return ticks;
			ticks = value;
			return gantt;
	    };

	    // Generates a color for the gantt bars.
	    gantt.colorFunction = function (value) {
	    	colorFunction = value;
	    	return gantt;
	    }

	    // Generates a color for the gantt bars.
	    gantt.tooltipFields = function (value) {
	    	tooltipFields = value;
	    	return gantt;
	    }

	    return gantt;
	};

});