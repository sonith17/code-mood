function getMostActiveFile(totalTime, startTime) {
    let maxTime = 0;
    let mostActive = '';
    for (const file in totalTime) {
        const timeSpent = (totalTime[file]||0)
         + (startTime[file] ? (Date.now() - startTime[file]) : 0);
        if (timeSpent > maxTime) {
            maxTime = timeSpent;
            mostActive = file;
        }
    }
    return { mostActive, time: (maxTime / 60000).toFixed(2) };
}

function getProductivityScore(totalTime, startTime) {
    const times = Object.keys(totalTime).map(file => {
        return totalTime[file] + (startTime[file] ? (Date.now() - startTime[file]) : 0);
    });

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const stdDev = Math.sqrt(times.map(t => (t - avgTime) ** 2).reduce((a, b) => a + b, 0) / times.length);

    const score = 100 - Math.min(100, stdDev / 1000); // less fluctuation => higher score
    return score.toFixed(2);
}

function suggestMood(totalTime, startTime) {
    const total = Object.keys(totalTime).reduce((acc, file) => {
        return acc + totalTime[file] + (startTime[file] ? (Date.now() - startTime[file]) : 0);
    }, 0);

    if (total > 60 * 60 * 1000) return 'focused';
    else if (total > 30 * 60 * 1000) return 'calm';
    else return 'neutral';
}

function getChartData(totalTime, startTime) {
    const labels = [];
    const values = [];
    let files_set = new Set([...Object.keys(totalTime), ...Object.keys(startTime)]);
    let total = 0;
    let files = [...files_set.keys()];
    console.log("files:", files);
    for (const f in files) {
        const file = files[f];
        if (totalTime[file] && startTime[file]) {
            total = totalTime[file] + (startTime[file] ? (Date.now() - startTime[file]) : 0);
        } else if (totalTime[file]) {     
            total = totalTime[file];
        }
        else if (startTime[file]) {
            total = (startTime[file] ? (Date.now() - startTime[file]) : 0);
        }
        console.log("total:", total);
        console.log('startTime:', startTime[file]);
        console.log('totalTime:', totalTime[file]);
        labels.push(file.split("/").pop());
        values.push((total / 60000).toFixed(2)); // in minutes
    }
    console.log("labels:", labels);
    console.log("values:", values);
    return { labels, values, totalTime, startTime };
}

function getWebviewContent({ labels, values, totalTime, startTime }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>🧠 Code Mood - Time Pie Chart</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body {
                background-color: #1e1e1e;
                color: #fff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 2rem;
                text-align: center;
            }
            canvas {
                max-width: 600px;
                margin: auto;
            }
        </style>
    </head>
    <body>
        <h2>🕒 Coding Time Distribution</h2>
        <canvas id="pieChart"></canvas>
        <script>
            const ctx = document.getElementById('pieChart').getContext('2d');
            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ${JSON.stringify(labels)},
                    datasets: [{
                        data: ${JSON.stringify(values)},
                        backgroundColor: ${JSON.stringify(generateColorPalette(values.length))},
                        borderWidth: 1,
                        hoverOffset: 10
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            labels: {
                                color: 'white',
                                font: {
                                    size: 14
                                }
                            },
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ": " + context.raw + " min";
                                }
                            }
                        }
                    }
                }
            });
        </script>
        <h3>Most Active File: ${labels[0]}</h3>
        <h3>Productivity Score: ${getProductivityScore(totalTime, startTime)}</h3>
        <h3>Suggested Mood: ${suggestMood(totalTime, startTime)}</h3>
        <h3>Time Spent: ${values.reduce((a, b) => parseFloat(a) + parseFloat(b), 0)} min</h3>
        <footer>
            <p>Made with ❤️ by Code Mood</p>
        </footer>
        <style>
            footer {
                margin-top: 20px;
                font-size: 14px;
                color: #ccc;
            }
            footer p {
                margin: 0;
            }
            footer a {
                color: #6A9955;
                text-decoration: none;
            }
            footer a:hover {
                text-decoration: underline;
            }
        </style>
    </body>
    </html>
    `;
}

function generateColorPalette(n) {
    const palette = [];
    for (let i = 0; i < n; i++) {
        const hue = (i * 360 / n);
        palette.push('hsl(' + hue + ', 70%, 50%)');
    }
    return palette;
}

module.exports = {
    getMostActiveFile,
    getProductivityScore,
    suggestMood,
    getChartData,
    getWebviewContent
};