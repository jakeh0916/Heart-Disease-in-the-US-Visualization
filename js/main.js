// Created by Jake Huseman for CS5124001 at University of Cincinnati

let focusedDataField = "percent_smoking";
let focusedVisualizationIsChart = true;


updateVisualization()


document.addEventListener('mousemove', (e) => updateInspection(e));


function updateKey() {
    const key = document.getElementById('key');
    key.innerHTML = "Displaying <b>" + toPrettyString("percent_coronary_heart_disease") + "</b> vs. <b>" + toPrettyString(focusedDataField) + "</b>.";

    if (focusedVisualizationIsChart) {
        key.innerHTML += "<br>• Circle size indicates population of U.S. county.";
        key.innerHTML += "<br>• Circle color (<b style='color:#619cd6;'>blue</b> to <b style='color:#ff4d4d;'>red</b>) indicates the severity of Heart Disease.";
    } else {
        key.innerHTML += "<br>• County color (<b style='color:#619cd6;'>blue</b> to <b style='color:#ff4d4d;'>red</b>) indicates the severity of " + toPrettyString(focusedDataField) + ".";
        key.innerHTML += "<br>• <b>Use the mouse</b> to compare the severity of Heart Disease in each county.";
    }
}


function updateInspection(e) {
    const mapInspect = document.getElementById('map-inspect');
    const mapOverlay = document.getElementById('map-overlay');

    if (!mapOverlay || !e) {
        mapInspect.style.visibility = "hidden"
        if (mapOverlay) mapOverlay.style.visibility = "hidden"
        return;
    }

    mapInspect.style.visibility = "visible"
    mapOverlay.style.visibility = "visible"

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    mapInspect.style.left = `${mouseX}px`;
    mapInspect.style.top = `${mouseY}px`;

    const mouseXInMap = mouseX - mapOverlay.getBoundingClientRect().left;
    const mouseYInMap = mouseY - mapOverlay.getBoundingClientRect().top;
    mapOverlay.style.clipPath = `fill-box circle(50px at ${mouseXInMap}px ${mouseYInMap}px)`;
}


function compareWithSmoking() {
    focusedDataField = "percent_smoking";
    updateVisualization();
}


function compareWithHBP() {
    focusedDataField = "percent_high_blood_pressure";
    updateVisualization();
}


function compareWithInactive() {
    focusedDataField = "percent_inactive";
    updateVisualization();
}


function compareWithSmoking() {
    focusedDataField = "percent_smoking";
    updateVisualization();
}


function compareWithPoverty() {
    focusedDataField = "poverty_percent";
    updateVisualization();
}


function updateVisualization() {
    if (focusedVisualizationIsChart) {
        visualizeChart();
    } else {
        visualizeMap();
    }
    updateInspection(null);
}


function visualizeMap() {
    focusedVisualizationIsChart = false

    // (Remove current visualization.)
    const visualizationContainer = document.getElementById("visualization-container");
    visualizationContainer.innerHTML = '';

    Promise.all([ d3.json('data/counties-10m.json'), d3.csv('data/NationalHealthDataset.csv') ]).then(data => {
        let geographyData = data[0];
        let healthData = data[1];

        geographyData.objects.counties.geometries.forEach(datum => {
            for (rowIndex = 0; rowIndex < healthData.length; rowIndex += 1) {
                if (datum.id == healthData[rowIndex].cnty_fips) {
                    datum.properties["percent_coronary_heart_disease"] = +healthData[rowIndex]["percent_coronary_heart_disease"];
                    datum.properties[focusedDataField] = +healthData[rowIndex][focusedDataField];
                    break;
                }
            }
        });

        geographyData.objects.counties.geometries = geographyData.objects.counties.geometries.filter(
            datum => datum.properties[focusedDataField] && datum.properties[focusedDataField] > 0
            && datum.properties["percent_coronary_heart_disease"] && datum.properties["percent_coronary_heart_disease"] > 0);

        drawMap(geographyData, focusedDataField);
        drawMap(geographyData, "percent_coronary_heart_disease");

        updateInspection(null)
    }).catch(error => {
        console.error('<Error> ' + error);
    });

    updateKey();
}


function drawMap(data, dataField) {
    const margin = { top: 16, right: 16, bottom: 16, left: 16 };
    const widthWithMargin = 1000;
    const heightWithMargin = 750;
    const width = widthWithMargin - margin.left - margin.right;
    const height = heightWithMargin - margin.top - margin.bottom;

    const svg = d3.select('body').selectChild('div').selectChild('div').append('svg')
        .attr('width', width)
        .attr('height', height);

    if (dataField == "percent_coronary_heart_disease") {
        svg.attr("id", "map-overlay")
    } else {
        svg.attr("id", "map")
    }

    svg.append('rect')
        .attr('class', 'map-background')
        .attr('width', width)
        .attr('height', height);

    projection = d3.geoAlbersUsa()
        .translate([width / 2.0 , height / 2.0])
        .scale(width);

    colorScale = d3.scaleLinear()
        .domain(d3.extent(data.objects.counties.geometries, datum => datum.properties[dataField]))
        .range(['#a1dcf6', '#ff4d4d'])
        .interpolate(d3.interpolate);

    path = d3.geoPath()
        .projection(projection);

    g = svg.append("g")
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
        .attr('width', widthWithMargin)
        .attr('height', heightWithMargin)

    counties = g.append("g")
        .selectAll("path")
        .data(topojson.feature(data, data.objects.counties).features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr('fill', datum => {
            if (datum.properties[dataField]) {
                return colorScale(datum.properties[dataField]);
            } else {
                return 'url(#lightstripe)';
            }
        });

    if (dataField == "percent_coronary_heart_disease") {
        counties.on('mousemove', (event, datum) => {
            console.log(datum)
            console.log(event)
            const dataValue = datum.properties[focusedDataField] ?
                (`${toPrettyString(focusedDataField)}: <strong>${datum.properties[focusedDataField]}</strong>.<br>` +
                    `${toPrettyString("percent_coronary_heart_disease")}: <strong>${datum.properties["percent_coronary_heart_disease"]}</strong>.`)
                : 'No data available'; 
            d3.select('#tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + 25) + 'px')   
                .style('top', (event.pageY + 25) + 'px')
                .html(`<div class="tooltip-title">${datum.properties.name}</div><div>${dataValue}</div>`);
            })
            .on('mouseleave', () => {
                d3.select('#tooltip').style('display', 'none');
            });
    }

    g.append("path")
        .datum(topojson.mesh(data, data.objects.states, function(a, b) { return a !== b; }))
        .attr("id", "state-borders")
        .attr("d", path);
}


function visualizeChart() {
    focusedVisualizationIsChart = true

    // Load data and draw scatter plot.

    Promise.all([ d3.csv('data/Population.csv'), d3.csv('data/NationalHealthDataset.csv') ]).then(data => {
        let populationData = data[0];
        let healthData = data[1];

        healthData.forEach(datum => { 
            datum.percent_coronary_heart_disease = +datum.percent_coronary_heart_disease
            datum[focusedDataField] = +datum[focusedDataField]

            for (rowIndex = 0; rowIndex < populationData.length; rowIndex += 1) {
                if (datum.cnty_fips == populationData[rowIndex].cnty_fips) {
                    datum.population = +populationData[rowIndex].Value;
                    break;
                }
            }
        });

        healthData = healthData.filter(datum => datum.percent_coronary_heart_disease > 0 && datum[focusedDataField] > 0 && datum.population > 0);

        // (Remove current visualization.)
        const visualizationContainer = document.getElementById("visualization-container");
        visualizationContainer.innerHTML = '';

        drawChart(healthData, "percent_coronary_heart_disease", focusedDataField);
    }).catch(error => {
        console.error('<Error> ' + error);
    });

    updateKey();
}


function drawChart(data, dataFieldX, dataFieldY) {
    const margin = { top: 48, right: 48, bottom: 48, left: 48 };
    const widthWithMargin = 900;
    const heightWithMargin = 500;
    const width = widthWithMargin - margin.left - margin.right;
    const height = heightWithMargin - margin.top - margin.bottom;

    const svg = d3.select('body').selectChild('div').selectChild('div')
        .append('svg')
            .attr('width', widthWithMargin)
            .attr('height', heightWithMargin)
        .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    let xScale = d3.scaleLinear()
        .domain(d3.extent(data, datum => datum[dataFieldX]))
        .range([ 0, width ])
    
    let yScale = d3.scaleLinear()
        .domain(d3.extent(data, datum => datum[dataFieldY]))
        .range([ height, 0 ])
    
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    let rScale = d3.scaleSqrt()
        .domain(d3.extent(data, datum => datum.population))
        .range([ 4.0, 40.0 ])

    let colorScale = d3.scaleLinear()
        .domain(d3.extent(data, datum => datum[dataFieldX]))
        .range(['#a1dcf6', '#ff4d4d'])
        .interpolate(d3.interpolate);

    svg.append("text")
        .attr("class", "chart-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2.0)
        .attr("y", heightWithMargin - 56)
        .text(toPrettyString(dataFieldX));

    svg.append("text")
        .attr("class", "chart-label")
        .attr("text-anchor", "middle")
        .attr("x", -1.0 * height / 2.0)
        .attr("dy", -34)
        .attr("transform", "rotate(-90)")
        .text(toPrettyString(dataFieldY));

    svg.append("g")
        .selectAll("dot")
        .data(data)
        .enter()
        .append('circle')
        .attr('cx', (datum) => xScale(datum[dataFieldX]))
        .attr('cy', (datum) => yScale(datum[dataFieldY]))
        .attr('r', (datum) => rScale(datum.population))
        .attr('fill', (datum) => colorScale(datum[dataFieldX]))
        .attr('stroke', '#000')
        
        .on('mousemove', (event, datum) => {
                console.log(datum)
                console.log(event)
                const dataValue = datum[focusedDataField] ?
                    (`${toPrettyString(focusedDataField)}: <strong>${datum[focusedDataField]}</strong>.<br>` +
                        `${toPrettyString("percent_coronary_heart_disease")}: <strong>${datum["percent_coronary_heart_disease"]}</strong>.`)
                    : 'No data available'; 
                d3.select('#tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + 8) + 'px')   
                    .style('top', (event.pageY + 8) + 'px')
                    .html(`<div class="tooltip-title">${datum.display_name.slice(1, -1)}</div><div>${dataValue}</div>`);
                })
                .on('mouseleave', () => {
                    d3.select('#tooltip').style('display', 'none');
                });
}


function toPrettyString(text) {
    return text.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}