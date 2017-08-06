//Setting global variables for manipulating the table and for the sort function
var minDate;
var maxDate;
var origMinDate;
var origMaxDate;	
var timeChartLine = dc.lineChart("#dc-time-chart-tweetSum"); 
var timeChartBar = dc.barChart("#dc-time-chart-tweetCount");
var locationChart = dc.barChart("#location-row-chart");
var rowCount =  dc.dataCount("#row-selection");
var incidentDataTable = dc.dataTable("#data-table");	
var dtgSelectFormat = d3.time.format("%m/%d/%Y");
var filterDimension;

var pr_color = '#2c826b';//36ac9c';
var as_color = '#df6342';//'#8B2A2F';//f9a72b';
var nas_color = '#8B2A2F';
var oth_color = '#a1988d';

//The function used to upload and create the table from CSV
window.onload = function(e){ 
	createCharts();
}

$("#dateMenuFrom").change(function () {
	var value = $(this).val();
	minDate = dtgSelectFormat.parse(value); 
	console.log(minDate);
	console.log(origMinDate);
	filterDimension.filterRange([minDate, maxDate]);
	dc.redrawAll();
	//console.log(sminDate);
});

$("#dateMenuTo").change(function () {
	var value = $(this).val();
	
	maxDate = dtgSelectFormat.parse(value);
	maxDate = d3.time.hour.offset(maxDate, +23);
	maxDate = d3.time.minute.offset(maxDate, +59);
	console.log(maxDate);
	console.log(origMaxDate);
	filterDimension.filterRange([minDate, maxDate]);
	dc.redrawAll();
	//console.log(smaxDate);
});
var ndx;
var allData = [];
var prData = [];
var asData = [];
var nasData = [];
var othData = [];
var drawMap;
var map;
var currFilter = "ALL";
var hashM = new Object(); 
var hashPR = new Object(); 
var hashAS = new Object(); 
var hashNAS = new Object(); 
var hashOTH = new Object();  

function createCharts() {
	d3.csv("../static/nuclearvizFiles/data/nuclusa.csv", function(error, data) {
		
		//Function to help print any Object
		function print_filter(filter){
			var f=eval(filter);
			if (typeof(f.length) != "undefined") {}else{}
			if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
			if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
			console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
		};
		
		// format our data
		var dtgFormat = d3.time.format("%m/%d/%Y %H:%M");
		minDate = dtgFormat.parse("01/01/2030 00:00"); 
		maxDate = dtgFormat.parse("01/01/1973 00:00"); 
		var dateSet = [];
		var prevDate;
		var i = 1;
		//document.getElementById("dateMenuFrom").options.length = 0;
		//document.getElementById("dateMenuTo").options.length = 0;
		$.ajaxSetup({
			async: false
		});
		data.forEach(function(d) { 
			/*
			var country = d['Country of Origin'];
			if(d.CountryOfOrigin == "Unknown")
				locationOut = "Russia";
			else{
				if(country.substring(country.length - 1) == "?"){
					locationOut = country.substring(0,country.length - 1);
				}
				else{
					locationOut = country;
				}
			}*/
			
			//if(d.Identified_but_unsure == '0' && d.Not_found == '0' && d.Multiple_country=='0') {
				
				d.dtg = dtgFormat.parse(d['Event Dt']); 
				if(d.dtg < minDate) {
					minDate = d.dtg;
				}
				
				if(d.dtg > maxDate) {
					maxDate = d.dtg;
				}
			
				var locationOut = d['State Cd'];
				
				if (hashM.hasOwnProperty(locationOut)) {
					//alert('key is: ' + k + ', value is: ' + h[k]);
					hashM[locationOut]++;
				}
				else {
					hashM[locationOut] = 1;
				}
				d.Id = i++;
				//console.log(locationOut+" "+hashM[locationOut]);
				//Getting co-ordinates of the locations for using in leaflet
				$.getJSON("https://maps.googleapis.com/maps/api/geocode/json?address="+encodeURIComponent(locationOut), function(val) {
					if(val.results.length) {
						var location = val.results[0].geometry.location
						d.lat = +location.lat;
						d.lng = +location.lng;
						d.longName = val.results[0].address_components[0].long_name;
					}
				});
				//console.log(d.ID+" "+locationOut +" "+d.lat+" "+ d.lng);
				allData.push(d);
				
				if(d["Event Desc"] == "Power Reactor") {
					prData.push(d);
					
					if (hashPR.hasOwnProperty(locationOut)) {
						//alert('key is: ' + k + ', value is: ' + h[k]);
						hashPR[locationOut]++;
					}
					else {
						hashPR[locationOut] = 1;
					}
				}else if(d["Event Desc"] == "Agreement State") {
					asData.push(d);
					
					if (hashAS.hasOwnProperty(locationOut)) {
					//alert('key is: ' + k + ', value is: ' + h[k]);
						hashAS[locationOut]++;
					}
					else {
						hashAS[locationOut] = 1;
					}
				}else if(d["Event Desc"] == "Non-Agreement State") {
					nasData.push(d);
					
					if (hashNAS.hasOwnProperty(locationOut)) {
					//alert('key is: ' + k + ', value is: ' + h[k]);
						hashNAS[locationOut]++;
					}
					else {
						hashNAS[locationOut] = 1;
					}
				}
				else {
					othData.push(d);
					
					if (hashOTH.hasOwnProperty(locationOut)) {
						//alert('key is: ' + k + ', value is: ' + h[k]);
						hashOTH[locationOut]++;
					}
					else {
						hashOTH[locationOut] = 1;
					}
				}
			//}
		});
		
		$.ajaxSetup({
			async: false
		});
		
		origMinDate = minDate;
		origMaxDate = maxDate;

		ndx = crossfilter(allData);
	
		var xValue = ndx.dimension(function (d) {return d.dtg;});
		var yGroupCount = xValue.group().reduceCount(function(d) { return d.id; });
		
		var locationDim = ndx.dimension(function(d) { return d['longName']; });
		var locationGroup = locationDim.group().reduceCount();
		//print_filter(xValue);
		var all = ndx.groupAll();
		var allDim = ndx.dimension(function(d) {return d;});
		
		//var yGroupSum = xValue.group().reduceSum(function(d) { return d.tweets; });
		filterDimension = ndx.dimension(function (d) {return d.dtg;});
		
		rowCount
		.dimension(ndx)
		.group(all);
				
		timeChartLine.width(320)
					.height(300)
					.margins({top: 50, right: 10, bottom: 50, left: 30})
					.dimension(xValue)
					.group(yGroupCount)
					.colors('red')
					.renderHorizontalGridLines(true)
					.renderVerticalGridLines(true)
					.rangeChart(timeChartBar)
					.mouseZoomable(true)
					.transitionDuration(0)
					.renderDataPoints({radius: 5})
					.elasticY(true)
					.elasticX(true)
					.brushOn(true)
					.title(function (d) {
						return d.key+"\n"+ d.value;
					 })
					//.x(d3.time.scale().domain([new Date(2016, 11, 28), new Date(2016, 11, 30)])) 
					.x(d3.time.scale().domain([minDate, maxDate])) 
					//.y(d3.scale.linear().domain([0, 50]))// scale and domain of the graph
					.xAxis();
					
		timeChartLine.renderlet(function (chart) {
				// rotate x-axis labels
				chart.selectAll('g.x text')
				.attr('transform', 'translate(-10,10) rotate(300)');
		});
			
		timeChartBar.width(600)
					.height(200)
					.margins({top: 10, right: 10, bottom: 20, left: 40})
					.dimension(xValue)
					.group(yGroupCount)
					.colors('blue')
					.renderHorizontalGridLines(true)
					.renderVerticalGridLines(true)
					.centerBar(true)			
					.transitionDuration(0)
					.elasticX(true)
					.gap(65)
					.brushOn(true)
					.elasticY(true)
					//.x(d3.time.scale().domain([new Date(2016, 11, 28), new Date(2016, 11, 30)]))
					//.xUnits(function(){return 25;})
					//.xUnits(d3.time.days)
					.x(d3.time.scale().domain([minDate, maxDate])) 
					//.y(d3.scale.linear().domain([0, 10]))// scale and domain of the graph
					.xAxis();

		locationChart.width(1150)
					.height(350)
					//.margins({top: 0, right: 0, bottom: 0, left: 30})
					.dimension(locationDim)
					.group(locationGroup)
					.ordering(function(d) { return -d.value })
					.colors(['#6baed6'])
					//.elasticX(true)
					.elasticY(true)
					.transitionDuration(0)
					//.gap(100)
					.xUnits(dc.units.ordinal)
					.label(function(d) {return d.value})
					.x(d3.scale.ordinal().domain(locationDim)) 
					//.labelOffsetY(10)
					.xAxis().ticks(4);
					
		locationChart.renderlet(function (chart) {
				// rotate x-axis labels
				chart.selectAll('g.x text')
				.attr('transform', 'translate(-10,10) rotate(270)')
				.attr("dx", "10em")
				.attr("dy", "-0.50em");
				
				chart.selectAll('rect.bar')
				.attr("width", "15px");
		});
		
		
		incidentDataTable.width(960).height(800)
			.dimension(xValue)
			.group(function(d) { return ""
			 })
			//.size(10)							// number of rows to return
			.columns([
			  function(d) { return d['Event Dt']; },
			  function(d) { return d['longName']; },
			  function(d) { return d['Event Desc']; },
			  function(d) { return d['Event Text']; }
			])
			.sortBy(function(d){ return d['Event Dt'];})
			.order(d3.descending); 
			
		 update();
		 incidentDataTable.render();
			
		//Initiating Map
		map = L.map('map');
		map.fitWorld().zoomIn();
		drawMap = function(){

		//map.setView([31.75, 110], 4);
		//map.fitWorld().setView([0, 0],1);

		mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
		L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/outdoors-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibGlqdWdlb3JnZSIsImEiOiJjaXpkeHdpcTYyNHcyMzNxcG9lZGsyNjB3In0.UhU9BN3x6oITYM1UVdtekQ', {
  		maxZoom: 18,
  		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
  			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
  			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
  		id: 'mapbox.streets'
		}).addTo(map);
		
		var nuclearIcon = L.icon({
          iconUrl: 'nuclear.png',
          iconSize:     [10, 10],
          iconAnchor:   [5, 5],
		});
			
		var geoData = [];
		var lat;
		var lng;
		var toi;
		var contr;
		var radius;
		var addedCircle = new Object();
		allDim.top(Infinity).forEach( function (d) {
			//console.log(d['ID']+" "+d['lat']+" "+d['lng']);
			lat = d["lat"];
			lng = d["lng"];
			toi = d["Event Desc"];
			contr = d["State Cd"];
		
			if(currFilter == "ALL")
				radius = hashM[contr];
			else if (currFilter == "PR")
				radius = hashPR[contr];
			else if(currFilter == "AS")
				radius = hashAS[contr];
			else if(currFilter == "NAS")
				radius = hashNAS[contr];
			else if(currFilter == "OTH")
				radius = hashOTH[contr];
			
			geoData.push([lat, lng, 1]);
			//L.marker([lat, lng], {icon: nuclearIcon}).addTo(map);
			var circle = L.circleMarker([lat, lng], {
			color: ((toi == "Power Reactor") ? pr_color :(toi == "Agreement State") ?  as_color:(toi == "Non-Agreement State")? nas_color:oth_color),
			fillColor: ((toi == "Power Reactor") ? pr_color :(toi == "Agreement State") ?  as_color:(toi == "Non-Agreement State")? nas_color:oth_color),
			fillOpacity: 0.6,
			//opacity: 3,
			weight: 2
			});
			
			if (addedCircle.hasOwnProperty(contr)) {
						//alert('key is: ' + k + ', value is: ' + h[k]);
						addedCircle[contr]++;
						//continue;
			}
			else {
				addedCircle[contr] = 1;
				circle.setRadius(1.5 * Math.sqrt(Math.abs(radius+3))).bindPopup("No of Incidents in "+d.longName+": "+radius).addTo(map);
			}
			//circle.setRadius(1.5 * Math.sqrt(Math.abs(radius+3))).bindPopup(d["Description"]).addTo(map);
			//circle.setStyle({color: ((toi == "Seizure") ? pr_color :(toi == "Theft") ?  as_color:oth_color)})
			
		});
				
		//HeatMap
		/*
		var heat = L.heatLayer(geoData,{
				radius: 10,
				blur: 20, 
				maxZoom: 1,
			}).addTo(map);	*/
		};
			
		//Draw Map
		drawMap();
		
		//Update the heatmap if any dc chart get filtered
		dcCharts = [timeChartLine, timeChartBar, locationChart, incidentDataTable];

		dcCharts.forEach(function (dcChart) {
			dcChart.on("filtered", function (chart, filter) {
				map.eachLayer(function (layer) {
					map.removeLayer(layer)
				}); 
				drawMap();
			});
		}); 
			
			dc.renderAll(); 
  }).on("progress", function(event){
	  if (d3.event.lengthComputable) {
          var percentComplete = Math.round(d3.event.loaded * 100 / d3.event.total);
          if(percentComplete == 100)
			  document.getElementById("loader").style.display = "none";  
       }
  });
}

var ofs = 0, pag = 10;
function display() {
  d3.select('#begin')
	  .text(ofs);
  d3.select('#end')
	  .text(ofs+pag-1);
  d3.select('#last')
	  .attr('disabled', ofs-pag<0 ? 'true' : null);
  d3.select('#next')
	  .attr('disabled', ofs+pag>=ndx.size() ? 'true' : null);
  d3.select('#size').text(ndx.size());
}
function update() {
  incidentDataTable.filter(null);
  incidentDataTable.beginSlice(ofs);
  incidentDataTable.endSlice(ofs+pag);
  display();
}
function next() {
  ofs += pag;
  update();
  incidentDataTable.redraw();
}
function last() {
  ofs -= pag;
  update();
  incidentDataTable.redraw();
}

function render(){
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	dc.filterAll();
	ndx.remove();
	ndx.add(allData);
	dc.redrawAll();
}

function renderAllM(){
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	currFilter = "ALL";
	dc.filterAll();
	ndx.remove();
	ndx.add(allData);
	dc.redrawAll();
	
	map.eachLayer(function (layer) {
					map.removeLayer(layer)
	}); 
	drawMap();
	
}

function power(){
	currFilter = "PR"
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	//dc.filterAll();
	//locationChart.filter(null)
	ndx.remove();
	ndx.add(prData);
	dc.redrawAll();
	
	map.eachLayer(function (layer) {
					map.removeLayer(layer)
	}); 
	drawMap();
}

function agree(){
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	currFilter = "AS";
	//dc.filterAll();
	ndx.remove();
	ndx.add(asData);
	
	dc.redrawAll();
	
	map.eachLayer(function (layer) {
					map.removeLayer(layer)
	}); 
	drawMap();
}

function nagree(){
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	currFilter = "NAS";
	//dc.filterAll();
	ndx.remove();
	ndx.add(nasData);
	
	dc.redrawAll();
	
	map.eachLayer(function (layer) {
					map.removeLayer(layer)
	}); 
	drawMap();
}

function others(){
	currFilter = "OTH"
	//filterDimension.filterRange([origMinDate, origMaxDate]);
	//dc.filterAll();
	ndx.remove();
	ndx.add(othData);
	dc.redrawAll();
	
	map.eachLayer(function (layer) {
					map.removeLayer(layer)
	}); 
	drawMap();
}

//Function to print the page
function printPage() {
    window.print();
}

var amountScrolled = 300;

$(window).scroll(function() {
	if ( $(window).scrollTop() > amountScrolled ) {
		$('a.back-to-top').fadeIn('slow');
	} else {
		$('a.back-to-top').fadeOut('slow');
	}
});

$('a.back-to-top').click(function() {
	$('html, body').animate({
		scrollTop: 0
	}, 700);
	return false;
});
