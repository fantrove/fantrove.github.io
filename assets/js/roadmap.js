document.addEventListener("DOMContentLoaded", async function () {
    const STORAGE_KEY = "feature_data";

    // โหลดข้อมูลจากที่เก็บถาวร ถ้ามี
    let storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        storedData = JSON.parse(storedData);
        displayFeatures(storedData.current_stage, storedData.stages);
    }

    // ดึงข้อมูลล่าสุดจากไฟล์ JSON
    try {
        const response = await fetch('https://jeffy2600ii.github.io/FanTrove/assets/json/current-stage.json');
        const data = await response.json();

        // ตรวจสอบว่าข้อมูลในที่เก็บถาวรต่างจาก JSON หรือไม่
        if (!storedData || JSON.stringify(storedData) !== JSON.stringify(data)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            displayFeatures(data.current_stage, data.stages);
        }
    } catch (error) {
        console.error('Error loading stage data:', error);
    }

    // ฟังก์ชันแสดงข้อมูล
    function displayFeatures(currentStage, stages) {
        const featureList = document.getElementById('feature-list');
        featureList.innerHTML = '';

        stages.forEach(stage => {
            const stageNumber = stage.stage_number;
            const features = stage.features;

            features.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.feature} - Version ${stage.version}`;

                if (stageNumber < currentStage) {
                    li.classList.add('past-feature');
                } else if (stageNumber === currentStage) {
                    li.classList.add('new-feature');
                    const smallText = document.createElement('small');
                    smallText.textContent = 'This feature is in the current version.';
                    li.appendChild(smallText);
                } else if (stageNumber === currentStage + 1) {
                    li.classList.add('upcoming-feature');
                    const smallText = document.createElement('small');
                    smallText.textContent = 'This feature will be added in the next version.';
                    li.appendChild(smallText);
                } else {
                    li.classList.add('not-feature');
                    li.textContent = `??? - Version ${stage.version}`;
                }

                featureList.appendChild(li);
            });
        });
    }
});