const MAX_ELIMINATED_TEAMS = 16;
const AUTO_FETCH_INTERVAL = 60000;
let animationIn = false;
let moving = false;
let lengthMoved = 0;
let teamData = [];
const sheetId = '1srwCRcCf_grbInfDSURVzXXRqIqxQ6_IIPG-4_gnSY8';
let sheetName = 'Game 1'; // Sheet name is now fixed

const query = 'SELECT W,Z,X';

// Helper functions
function e(id) {
    return document.getElementById(id);
}

function getCellValue(row, index) {
    const cell = row[index];
    return cell != null ? cell : "";
}

// Fetch data from Google Sheets
function getData() {
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent(query)}`;
    return fetch(baseUrl)
        .then(res => res.text())
        .then(text => {
            try {
                const json = JSON.parse(text.substr(47).slice(0, -2));
                const rows = json.table.rows.map(row => row.c.map(cell => (cell ? cell.v : "")));
                return [{ values: rows }];
            } catch (err) {
                console.error("Error parsing sheet data:", err);
                return [{ values: [] }];
            }
        });
}

// Main update logic
function runTemplateUpdate() {
    if (!moving) {
        if (teamData.length > 0) {
            removeGraphs().then(() => updateData().then(() => addGraphs()));
        } else {
            updateData().then(() => runAnimationIN());
        }
    }
}

// Intro animation using GSAP
function runAnimationIN() {
    if (teamData.length > 0 && !animationIn) {
        gsap.timeline({
            onComplete: () => {
                addGraphs();
                animationIn = true;
            }
        })
        .fromTo("#main", { opacity: 0 }, {
            delay: 0.1,
            duration: 1.7,
            opacity: 1,
            ease: "Power3.easeIn"
        })
        .to("#animation-layer", {
            height: 1080,
            duration: 4,
            ease: "Power3.easeIn"
        }, "-=0.5");
    }
}

// Add bar graphs
function addGraphs() {
    if (teamData.length === 0) return;

    const showLogo = true;
    const graphWrapper = document.querySelector("#graph-wrapper>div");
    if (!graphWrapper) {
        console.error("Graph wrapper inner div not found!");
        return;
    }

    graphWrapper.innerHTML = ""; // Clear old content

    const graphHeight = graphWrapper.offsetHeight || 500;
    const imageHeight = showLogo ? 80 : 0;
    const textHeight = 40;
    const divHeight = graphHeight - imageHeight - textHeight;

    const validKills = teamData.map(t => t.kills).filter(k => typeof k === 'number' && !isNaN(k));
    const highestKills = Math.max(...validKills, 1);

    // Build all team HTML first
    let html = "";
    teamData.forEach(({ tag, kills, logo }, index) => {
        html += `
            <div class="teamWrapper">
                <p id="tag_${index}" style="margin-bottom: -${textHeight}px">${tag}</p>
                ${showLogo ? `<img class="tagIMG" id="img_${index}" style="margin-bottom: -${imageHeight}px" src="${logo}" onerror="this.src='https://placehold.co/80x80/000000/FFF?text=${tag.toUpperCase()}'">` : ""}
                <div class="displayWrapper">
                    <div id="killDisplay_${index}" class="killsDisplay"><p>${kills}</p></div>
                </div>
            </div>
        `;
    });
    graphWrapper.innerHTML = html; // Set once

    // Now animate each team
    teamData.forEach(({ tag, kills, logo }, index) => {
        const tl = gsap.timeline();

        tl.to(`#tag_${index}`, { marginBottom: 0, duration: 1.6, ease: "linear" });

        if (showLogo) {
            tl.to(`#img_${index}`, { marginBottom: 0, duration: 0.8, ease: "linear" }, "-=0.1");
        }

        tl.to(`#killDisplay_${index}`, {
            height: `${divHeight * (kills / highestKills)}px`,
            duration: 1.5,
            ease: "linear"
        });

        tl.to(`#killDisplay_${index}>p`, {
            height: "auto",
            duration: 0.5,
            ease: "linear"
        });
    });

    lengthMoved = 0;
}

// Fade out and remove graphs
function removeGraphs() {
    return new Promise(resolve => {
        const graphWrapper = document.querySelector("#graph-wrapper>div");
        gsap.to(graphWrapper, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                graphWrapper.innerHTML = "";
                graphWrapper.style.opacity = 1;
                resolve();
            }
        });
    });
}

// Update and process data
function updateData() {
    return getData().then(data => {
        const values = data[0].values;

        console.log("Raw values from sheet:", values);

        teamData = values.map(row => {
            const teamName = getCellValue(row, 0);
            const kills = parseFloat(getCellValue(row, 1)) || 0;  // Directly parse kills as number
            const logoURL = getCellValue(row, 2);
            return {
                tag: teamName?.toLowerCase?.().trim() || "",
                kills,
                logo: logoURL || `team_logos/${teamName?.toLowerCase?.().trim()}.png`
            };
        });

        // Sort by kills from highest to lowest
        teamData = teamData
            .sort((a, b) => b.kills - a.kills)  // Sort by kills in descending order
            .slice(0, MAX_ELIMINATED_TEAMS);    // Limit to top 8 teams

        console.log("Processed teamData (Sorted):", teamData);
    });
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
    const dropdownButton = document.getElementById("dropdownButton");
    const dropdownMenu = document.getElementById("dropdownMenu");

    // Toggle the dropdown visibility on button click
    dropdownButton.addEventListener("click", () => {
        dropdownMenu.style.display = dropdownMenu.style.display === "none" ? "block" : "none";
    });

    // Populate dropdown menu with game options
    for (let i = 1; i <= 15; i++) {
        const opt = document.createElement("div");
        opt.textContent = `Game ${i}`;
        opt.classList.add("dropdown-item");
        opt.addEventListener("click", () => {
            sheetName = `Game ${i}`;
            console.log('Dropdown changed to: ', sheetName);
            runTemplateUpdate(); // Update data based on selected game
            dropdownMenu.style.display = "none"; // Hide menu after selection
        });
        dropdownMenu.appendChild(opt);
    }

    runTemplateUpdate(); // Initial update
    setInterval(() => {
        runTemplateUpdate(); // Auto update data at set intervals
    }, AUTO_FETCH_INTERVAL);
});
