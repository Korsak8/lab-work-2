// Генерує випадкову матрицю заданого розміру
function generateRandomMatrix(n) {
    return Array.from({ length: n }, () =>
        Array.from({ length: n }, () => Math.random() * 99 + 1)
    );
}


    // Оцінює середню затримку RTT для подальших розрахунків
    async function estimateRTT() {
        const testMatrix = generateRandomMatrix(1); // Невелика матриця для тесту
        const rttMeasurements = [];

        const data = JSON.stringify({
            matrix: testMatrix,
            operation: "invertElements",
        });

        for (let i = 0; i < 10; i++) {
            const start = performance.now();

            try {
                const response = await fetch("/matrix_operation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: data,
                });
                const end = performance.now();

                if (response.ok) {
                    const responseData = await response.json(); // Отримати відповідь
                    const processingTime = responseData.OperationTime; // Час обробки на сервері
                    const pureRTT = (end - start) - processingTime; // Чистий RTT
                    rttMeasurements.push(pureRTT);
                } else {
                    console.error(`RTT request failed with status: ${response.status}`);
                }
            } catch (error) {
                console.error("Error during RTT request:", error);
            }

            // Коротка затримка між вимірюваннями
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Сортуємо та обчислюємо медіану
        rttMeasurements.sort((a, b) => a - b);
        const middleIndex = Math.floor(rttMeasurements.length / 2);
        const medianRTT =
            (rttMeasurements[middleIndex - 1] + rttMeasurements[middleIndex]) / 2;

        return medianRTT;
    }

            // Виконує обчислення метрик для переданої операції та розміру матриці
            async function PerformOperation(operation, dataSize) {
                const requestData = generateRandomMatrix(dataSize); // Генеруємо випадкову матрицю
                const data = JSON.stringify({ matrix: requestData, operation: operation });
                const start = performance.now();

                // Надсилаємо запит до сервера
                const response = await fetch(`/matrix_operation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: data,
                });

                const end_transfer = performance.now(); // Кінець передачі
                const responseData = await response.json(); // Отримуємо відповідь
                const processing_time = responseData.OperationTime; // Час обробки
                const end_total = performance.now(); // Кінець всього запиту

                // Обчислення метрик
                const transfer_time = end_transfer - start - processing_time;
                const summary_time = transfer_time + processing_time; // T′ — передача + обробка
                const total_time = end_total - start; // T — загальний час

                const rtt = await estimateRTT(); // Оцінка RTT (затримки)
                const total_size_bits = dataSize * dataSize * 64; // Кількість біт у матриці (double = 64 біт)
                const transfer_delay = rtt / 2000; // δ — затримка передачі (у секундах)
                const tau = (transfer_time - rtt) / 1000; // τ — затримка без RTT
                const bandwidth = (total_size_bits / tau); // Пропускна здатність
                const relative_delay = transfer_delay / tau; // Відносна затримка
                const channel_efficiency = 1 / (1 + 2 * relative_delay); // Ефективність каналу

                // Повертаємо результати
                return {
                    transfer_time,
                    processing_time,
                    summary_time,
                    total_time,
                    transfer_delay,
                    tau,
                    bandwidth,
                    relative_delay,
                    channel_efficiency,
                };
            }

                // Основна функція для запуску тестів з виводом результатів у таблиці
                async function runTests(operations, dataSizes) {
                    const tablesContainer = document.getElementById("tablesContainer");
                    const statusMessage = document.getElementById("statusMessage");
                    const spinner = document.getElementById("spinner");

                    // Очищення попередніх результатів
                    tablesContainer.innerHTML = "";
                    statusMessage.textContent = "Running tests..."; // Повідомлення про початок
                    spinner.style.display = "block"; // Показуємо індикатор завантаження

                    for (const operation of operations) {
                        // Створюємо контейнер для таблиці
                        const tableContainer = document.createElement("div");
                        tableContainer.classList.add("table-container");

                        const heading = document.createElement("h2");
                        heading.textContent = operation === "invertElements" ? "Invert Elements" : "Inverse Matrix";
                        tableContainer.appendChild(heading);

                        // Створюємо таблицю з заголовками
                        const table = document.createElement("table");
                        table.innerHTML = `
                            <thead>
                                <tr>
                                    <th>Data Size</th>
                                    <th>Transmission Time (ms)</th>
                                    <th>Processing Time (ms)</th>
                                    <th>Total Time T′ (ms)</th>
                                    <th>Measured Real Total Time T (ms)</th>
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

                        // Для кожного розміру даних виконуємо операцію і додаємо результат у таблицю
                        for (const dataSize of dataSizes) {
                            const {
                                transfer_time,
                                processing_time,
                                summary_time,
                                total_time,
                                transfer_delay,
                                tau,
                                bandwidth,
                                relative_delay,
                                channel_efficiency,
                            } = await PerformOperation(operation, dataSize);

                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td>${dataSize}</td>
                                <td>${transfer_time.toFixed(2)}</td>
                                <td>${processing_time.toFixed(2)}</td>
                                <td>${summary_time.toFixed(2)}</td>
                                <td>${total_time.toFixed(2)}</td>
                                <td>${transfer_delay.toFixed(4)}</td>
                                <td>${tau.toFixed(4)}</td>
                                <td>${bandwidth.toFixed(2)}</td>
                                <td>${relative_delay.toFixed(4)}</td>
                                <td>${channel_efficiency.toFixed(4)}</td>
                            `;
                            tableBody.appendChild(tr);
                        }

                        // Додаємо таблицю до контейнера на сторінці
                        tableContainer.appendChild(table);
                        tablesContainer.appendChild(tableContainer);
                    }

                    // Оновлюємо статус після завершення
                    statusMessage.textContent = "Tests completed successfully!";
                    spinner.style.display = "none";
                }

                    // Запускає тести тільки для однієї обраної операції
                    async function fetchOperation(operation) {
                        const dataSizes = [256, 512, 1024, 2048, 4096];
                        if (operation === "invertMatrix") {
                            // Для операції invertMatrix обмежуємо максимальний розмір матриці
                            await runTests([operation], dataSizes.filter(size => size <= 2048));
                        } else {
                            await runTests([operation], dataSizes);
                        }
                    }

                    async function fetchResults() {
                        const dataSizes = [256, 512, 1024, 2048, 4096]; // Розміри матриць
                        const operations = ["invertElements", "invertMatrix"]; // Доступні операції

                        await runTests(operations, dataSizes); // Виконати тести
                    }
