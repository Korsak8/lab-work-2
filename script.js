// Глобальні змінні для калібрування та управління прогресом
let calibratedBaseTimes = {
    invertElements: null,
    invertMatrix: null
};
let progressInterval;
let lastUpdateTime = 0;

// Генерація випадкової матриці
function generateRandomMatrix(n) {
    return Array.from({ length: n }, () =>
        Array.from({ length: n }, () => Math.random() * 99 + 1)
    );
}

// Оцінка RTT (Round-Trip Time)
async function estimateRTT() {
    const testMatrix = generateRandomMatrix(1);
    const rttMeasurements = [];
    const data = JSON.stringify({
        matrix: testMatrix,
        operation: "invertElements",
    });

    for (let i = 0; i < 5; i++) {
        const start = performance.now();
        try {
            const response = await fetch("/matrix_operation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            });
            const end = performance.now();

            if (response.ok) {
                const responseData = await response.json();
                const processingTime = responseData.OperationTime;
                const pureRTT = (end - start) - processingTime;
                rttMeasurements.push(pureRTT);
            }
        } catch (error) {
            console.error("RTT measurement error:", error);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    rttMeasurements.sort((a, b) => a - b);
    const middleIndex = Math.floor(rttMeasurements.length / 2);
    return rttMeasurements.length % 2 === 0 ?
        (rttMeasurements[middleIndex - 1] + rttMeasurements[middleIndex]) / 2 :
        rttMeasurements[middleIndex];
}

// Калібрування базових часів виконання
async function calibrateBaseTimes() {
    const calibrationSize = 256;
    
    if (!calibratedBaseTimes.invertElements) {
        try {
            const testMatrix = generateRandomMatrix(calibrationSize);
            const data = JSON.stringify({ 
                matrix: testMatrix, 
                operation: "invertElements" 
            });
            
            const startTime = performance.now();
            const response = await fetch("/matrix_operation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            });
            
            const result = await response.json();
            calibratedBaseTimes.invertElements = result.OperationTime / 1000;
        } catch (error) {
            console.error("Calibration failed for invertElements:", error);
            calibratedBaseTimes.invertElements = 0.1;
        }
    }
    
    if (!calibratedBaseTimes.invertMatrix) {
        try {
            const testMatrix = generateRandomMatrix(calibrationSize);
            const data = JSON.stringify({ 
                matrix: testMatrix, 
                operation: "invertMatrix" 
            });
            
            const startTime = performance.now();
            const response = await fetch("/matrix_operation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
            });
            
            const result = await response.json();
            calibratedBaseTimes.invertMatrix = result.OperationTime / 1000;
        } catch (error) {
            console.error("Calibration failed for invertMatrix:", error);
            calibratedBaseTimes.invertMatrix = 15;
        }
    }
}

// Оцінка часу виконання операції
function estimateOperationTime(operation, size) {
    if (!calibratedBaseTimes[operation]) {
        const assumedBaseTime = operation === "invertElements" ? 0.1 : 15;
        const complexity = operation === "invertElements" ? 2 : 3;
        return assumedBaseTime * Math.pow(size / 256, complexity);
    }
    
    const baseTime = calibratedBaseTimes[operation];
    const complexity = operation === "invertElements" ? 2 : 3;
    const scaleFactor = Math.pow(size / 256, complexity);
    
    let additionalFactor = 1;
    if (size > 2048) {
        additionalFactor = Math.log10(size / 2048) * 0.5 + 1;
    }
    
    return baseTime * scaleFactor * additionalFactor;
}

// Форматування часу для відображення
function formatTime(seconds) {
    if (seconds > 3600) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }
    if (seconds > 60) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    }
    return `${seconds.toFixed(1)}s`;
}

// Запуск відстеження прогресу
function startProgressTracking(estimatedTime) {
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressBar.style.transition = 'width 0.5s ease-out';
    progressBar.style.backgroundColor = '#9b59b6';
    
    lastUpdateTime = performance.now();
    clearInterval(progressInterval);
    
    progressInterval = setInterval(() => {
        const currentTime = performance.now();
        const elapsed = (currentTime - lastUpdateTime) / 1000;
        const progress = Math.min(99, (elapsed / estimatedTime) * 100);
        
        progressBar.style.width = `${progress}%`;
        
        const colorProgress = progress / 100;
        const r = Math.floor(155 + (46 - 155) * colorProgress);
        const g = Math.floor(89 + (204 - 89) * colorProgress);
        const b = Math.floor(182 + (90 - 182) * colorProgress);
        progressBar.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }, 200);
}

// Зупинка відстеження прогресу
function stopProgressTracking() {
    clearInterval(progressInterval);
    const progressBar = document.getElementById('progressBar');
    
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = '#2ecc71';
    progressBar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease-out';
    
    setTimeout(() => {
        document.getElementById('progressContainer').style.display = 'none';
    }, 2000);
}

// Основна функція виконання операції
async function PerformOperation(operation, dataSize) {
    const timeEstimateElement = document.getElementById('timeEstimate');
    timeEstimateElement.style.color = '#6a3093';
    
    try {
        // Калібрування (якщо потрібно)
        if (!calibratedBaseTimes[operation]) {
            timeEstimateElement.textContent = `Calibrating performance for ${operation}...`;
            await calibrateBaseTimes();
        }

        // Оцінка часу виконання
        const estimatedTime = estimateOperationTime(operation, dataSize);
        timeEstimateElement.textContent = 
            `Processing ${operation === "invertElements" ? "element inversion" : "matrix inversion"} for ${dataSize}×${dataSize} matrix. Estimated time: ${formatTime(estimatedTime)}`;
        
        // Підготовка даних
        const requestData = generateRandomMatrix(dataSize);
        const data = JSON.stringify({ matrix: requestData, operation: operation });
        
        // Запуск прогресу
        startProgressTracking(estimatedTime);
        const startTime = performance.now();
        
        // Виконання запиту
        const response = await fetch(`/matrix_operation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
        });

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const endTransferTime = performance.now();
        const responseData = await response.json();
        const processingTime = responseData.OperationTime;
        const endTotalTime = performance.now();
        
        // Завершення - оновлення UI
        stopProgressTracking();
        timeEstimateElement.textContent = 
            `Operation completed in ${((endTotalTime - startTime)/1000).toFixed(2)}s (estimated: ${formatTime(estimatedTime)})`;
        timeEstimateElement.style.color = '#2ecc71';
        
        // Розрахунок метрик
        const transferTime = endTransferTime - startTime - processingTime;
        const summaryTime = transferTime + processingTime;
        const totalTime = endTotalTime - startTime;

        const rtt = await estimateRTT();
        const totalSizeBits = dataSize * dataSize * 64;
        const transferDelay = rtt / 2000;
        const tau = (transferTime - rtt) / 1000;
        const bandwidth = (totalSizeBits / Math.max(tau, 0.001)); // Уникнення ділення на 0
        const relativeDelay = transferDelay / Math.max(tau, 0.001);
        const channelEfficiency = 1 / (1 + 2 * relativeDelay);

        return {
            transfer_time: transferTime,
            processing_time: processingTime,
            summary_time: summaryTime,
            total_time: totalTime,
            transfer_delay: transferDelay,
            tau: tau,
            bandwidth: bandwidth,
            relative_delay: relativeDelay,
            channel_efficiency: channelEfficiency,
        };
    } catch (error) {
        stopProgressTracking();
        timeEstimateElement.textContent = 
            `Error during ${operation} for ${dataSize}×${dataSize} matrix: ${error.message}`;
        timeEstimateElement.style.color = '#e74c3c';
        console.error(`PerformOperation error (${operation}, ${dataSize}):`, error);
        throw error;
    }
}

// Функції для запуску тестів
async function runTests(operations, dataSizes) {
    const tablesContainer = document.getElementById("tablesContainer");
    const statusMessage = document.getElementById("statusMessage");
    const spinner = document.getElementById("spinner");

    tablesContainer.innerHTML = "";
    statusMessage.textContent = "Running tests...";
    spinner.style.display = "block";

    for (const operation of operations) {
        const tableContainer = document.createElement("div");
        tableContainer.classList.add("table-container");

        const heading = document.createElement("h2");
        heading.textContent = operation === "invertElements" ? "Invert Elements" : "Invert Matrix";
        tableContainer.appendChild(heading);

        const table = document.createElement("table");
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Data Size</th>
                    <th>Transmission Time (ms)</th>
                    <th>Processing Time (ms)</th>
                    <th>Total Time T′ (ms)</th>
                    <th>Measured Total Time T (ms)</th>
                    <th>Delay δ (s)</th>
                    <th>Transmission Delay τ (s)</th>
                    <th>Bandwidth (bit/s)</th>
                    <th>Relative Delay</th>
                    <th>Channel Efficiency η</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tableBody = table.querySelector("tbody");

        for (const dataSize of dataSizes) {
            if (operation === "invertMatrix" && dataSize > 2048) {
                continue; // Пропускаємо великі матриці для інвертування
            }

            try {
                const results = await PerformOperation(operation, dataSize);
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${dataSize}</td>
                    <td>${results.transfer_time.toFixed(2)}</td>
                    <td>${results.processing_time.toFixed(2)}</td>
                    <td>${results.summary_time.toFixed(2)}</td>
                    <td>${results.total_time.toFixed(2)}</td>
                    <td>${results.transfer_delay.toFixed(6)}</td>
                    <td>${results.tau.toFixed(6)}</td>
                    <td>${results.bandwidth.toExponential(2)}</td>
                    <td>${results.relative_delay.toFixed(4)}</td>
                    <td>${results.channel_efficiency.toFixed(4)}</td>
                `;
                tableBody.appendChild(tr);
            } catch (error) {
                console.error(`Test failed for ${operation} ${dataSize}:`, error);
            }
        }

        tableContainer.appendChild(table);
        tablesContainer.appendChild(tableContainer);
    }

    statusMessage.textContent = "Tests completed successfully!";
    spinner.style.display = "none";
}

async function fetchOperation(operation) {
    const dataSizes = [256, 512, 1024, 2048, 4096];
    await runTests([operation], operation === "invertMatrix" ? 
        dataSizes.filter(size => size <= 1024) : dataSizes);
}

async function fetchResults() {
    const dataSizes = [256, 512, 1024, 2048, 4096];
    const operations = ["invertElements", "invertMatrix"];
    await runTests(operations, dataSizes);
}