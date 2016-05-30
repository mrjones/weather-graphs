google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(fetchData);

function fetchData() {
    $.ajax({url: "/data", success: renderData});
}

function renderData(dataString) {
    var data = JSON.parse(dataString);

    var table = new google.visualization.DataTable();
    table.addColumn('datetime', 'Time');
    table.addColumn('number', 'Temperature (F)');
    table.addColumn('number', 'Chance Precip (%)');

    for (var i = 0; i < data.length; i++) {
        table.addRow([
            new Date(1000 * data[i].unix_seconds),
            data[i].temperature,
            data[i].precipitation_chance,
        ]);
    }

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));
    var options = { };
    chart.draw(table, options);

    var table2 = new google.visualization.DataTable();
    table2.addColumn('datetime', 'Time');
    table2.addColumn('number', 'Dew Point (F)');
    table2.addColumn('number', 'Humidity (%)');
    table2.addColumn('number', 'PREDICTED Dew Point');

    for (var i = 0; i < data.length; i++) {
        table2.addRow([
            new Date(1000 * data[i].unix_seconds),
            data[i].dew_point,
            data[i].relative_humidity,
            (1.0 * data[i].temperature) * (data[i].relative_humidity / 100.0),
        ]);
    }

    var chart2 = new google.visualization.LineChart(document.getElementById('chart_div2'));
    var options = { };

    chart2.draw(table2, options);


}
