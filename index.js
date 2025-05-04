const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const math = require('mathjs')

const PORT = 3000;


function invertElements(matrix) {
    return matrix.map(row => row.map(value => 1 / value));
}

function invertMatrix(matrix) {
    return math.inv(matrix);
}


const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
        if (req.url === '/') {
            fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading HTML');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                }
            });
        } else if (req.url === '/script.js') {
            fs.readFile(path.join(__dirname, 'script.js'), (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading JS');
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    } else if (req.method === 'POST' && req.url === '/matrix_operation') {
        let body = "";
        req.on("data", (chunk) => body += chunk.toString());
        req.on("end", () => {
            
            try {
                const { matrix, operation } = JSON.parse(body);
                let result;
                const startOperationTime = performance.now(); // Start timing
    
                if (operation === "invertElements") {
                    result = invertElements(matrix);
                } else if (operation === "invertMatrix") {
                    result = invertMatrix(matrix);
                }
    
                const endOperationTime = performance.now(); // End timing
                const OperationTime = endOperationTime - startOperationTime;
    
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ result, OperationTime }));
            } catch (error) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } 
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
