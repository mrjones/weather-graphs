google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(fetchData);

function fetchData() {
    $.ajax({url: "/data", success: renderData});
}

function dygraphBackground(canvas, area, graph) {
    var min_time = graph.getValue(0,0);
    var max_time = graph.getValue(graph.numRows() - 1, 0);

    var dateCounter = 0;
    var lastStartTimestamp = null;
    var currentYyyymmdd = null;
    
    for (var i = 0; i < graph.numRows(); i++) {
        var currentTimestamp = graph.getValue(i, 0);
        var date = new Date(currentTimestamp);
        if (toYYYYMMDD(date) != currentYyyymmdd) {
            dateCounter++;
            if (lastStartTimestamp != null && dateCounter % 2 == 0) {
                var leftX = graph.toDomXCoord(lastStartTimestamp);
                var rightX = graph.toDomXCoord(currentTimestamp);
                canvas.fillStyle = "rgba(245, 245, 245, 1.0)";
                canvas.fillRect(
                    leftX, // X
                    area.y, // Y
                    (rightX - leftX), // W
                    area.h); // H
            }
            currentYyyymmdd = toYYYYMMDD(date);
            lastStartTimestamp = currentTimestamp;
        }
    }
}

function toYYYYMMDD(date) {
    return date.getFullYear() +
        ((1 + date.getMonth()) * 10000) +
        (date.getDate() * 1000000);
}

function renderData(dataString) {
    var data = JSON.parse(dataString);

    var tables = {
        temps: [],
        precip: [],
        dew_point: [],
        humidity: [],
        clouds: [],
        wind: [],
    };
    
    for (var i = 0; i < data.length; i++) {
        tables.temps.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].temperature,
        ]);
        tables.precip.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].precipitation_chance,
        ]);
        tables.dew_point.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].dew_point,
        ]);
        tables.humidity.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].relative_humidity,
        ]);
        tables.clouds.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].clouds,
        ]);
        tables.wind.push([
            new Date(1000 * data[i].unix_seconds),
            data[i].wind,
        ]);
    }

    var graphs = [
        new Dygraph(
            document.getElementById("temp"),
            tables.temps,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                ylabel: [ "Temperature (F)" ],
                labels: [ "Date", "Temperature (F)" ],
                strokeWidth: 3,
            }),
        new Dygraph(
            document.getElementById("precip"),
            tables.precip,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                valueRange: [0, 100],
                ylabel: [ "Precipitation Chance (%)" ],
                labels: [ "Date", "Precipitation Chance (%)" ],
                fillGraph: true,
                strokeWidth: 2,
            }),
        new Dygraph(
            document.getElementById("dew_point"),
            tables.dew_point,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                ylabel: [ "Dew Point (F)" ],
                labels: [ "Date", "Dew Point (F)" ],
                strokeWidth: 2,
            }),
        /*
        new Dygraph(
            document.getElementById("humidity"),
            tables.humidity,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                ylabel: [ "Humidity (%)" ],
                labels: [ "Date", "Humidity (%)" ],
            }),
        */
        new Dygraph(
            document.getElementById("clouds"),
            tables.clouds,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                ylabel: [ "Cloud Cover (%)" ],
                labels: [ "Date", "Cloud Cover (%)" ],
                fillGraph: true,
                strokeWidth: 2,
                color: "#333333",
            }),
        new Dygraph(
            document.getElementById("wind"),
            tables.wind,
            {
                underlayCallback: dygraphBackground,
                width: .9 * window.innerWidth,
                height: 150,
                ylabel: [ "Wind (Mph)" ],
                labels: [ "Date", "Wind (Mph)" ],
                strokeWidth: 2,
            }),
    ];
    Dygraph.synchronize(graphs, {zoom: false, selection: true, range: false});

    /*
    var table2 = new google.visualization.DataTable();
    table2.addColumn('datetime', 'Time');
    table2.addColumn('number', 'Dew Point (F)');
    table2.addColumn('number', 'Humidity (%)');

    for (var i = 0; i < data.length; i++) {
        table2.addRow([
            new Date(1000 * data[i].unix_seconds),
            data[i].dew_point,
            data[i].relative_humidity,
        ]);
    }

    var chart2 = new google.visualization.LineChart(document.getElementById('chart_div2'));
    var options = { };

    chart2.draw(table2, options);
*/

}
