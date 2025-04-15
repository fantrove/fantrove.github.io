(async function () {
    const cacheKey = "u1v2w3";
    const cacheDuration = 300000; // 5 minutes
    const folderPath = "/assets/json/content/";

    // Character mapping for encoding
    const charMapping = {
        A: "!@#$", B: "%^&*", C: "()_+", D: "-=[]", E: "{}|;", F: ":',.", G: "<>?/", H: "~`12",
        I: "3456", J: "7890", K: "!@#$", L: "%^&*", M: "()_+", N: "-=[]", O: "{}|;", P: ":',.",
        Q: "<>?/", R: "~`12", S: "3456", T: "7890", U: "!@#$", V: "%^&*", W: "()_+", X: "-=[]",
        Y: "{}|;", Z: ":',.", a: "<>?/", b: "~`12", c: "3456", d: "7890", e: "!@#$", f: "%^&*",
        g: "()_+", h: "-=[]", i: "{}|;", j: ":',.", k: "<>?/", l: "~`12", m: "3456", n: "7890",
        o: "!@#$", p: "%^&*", q: "()_+", r: "-=[]", s: "{}|;", t: ":',.", u: "<>?/", v: "~`12",
        w: "3456", x: "7890", y: "!@#$", z: "%^&*",
    };

    // Pre-encoded values for authentication
    const requiredOutputName = ":',.!@#$%^&*%^&*!@#$"; // Output after encoding "jeffy"
    const requiredOutputKey = "7890!@#$7890:',.<>?/<>?/!@#$-=[]7890"; // Output after encoding "nontakorn"

    // Function to encode text using charMapping
    function encodeText(input) {
        return [...input].map(char => charMapping[char] || char).join('');
    }

    // Function to validate credentials by encoding input and comparing with pre-encoded outputs
    function validateCredentials(name, key) {
        const encodedName = encodeText(name);
        const encodedKey = encodeText(key);

        // Compare encoded inputs with required outputs
        return encodedName === requiredOutputName && encodedKey === requiredOutputKey;
    }

    // Function to switch to the editor UI upon successful authentication
    function switchToEditorUI() {
        document.getElementById("authForm").style.display = "none";
        document.getElementById("jsonEditorUI").style.display = "block";
    }

    // Function to load the list of files from the repository
    async function loadFileList() {
        const select = document.getElementById("fileList");
        try {
            const response = await fetch(`https://api.github.com/repos/fantrove-hub/fantrove-hub.github.io/contents${folderPath}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MY_GITHUB_TOKEN}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch file list: ${response.statusText}`);
            }

            const files = await response.json();
            files.forEach(file => {
                if (file.name.endsWith(".json")) {
                    const option = document.createElement("option");
                    option.value = file.name;
                    option.textContent = file.name;
                    select.appendChild(option);
                }
            });
        } catch (error) {
            document.getElementById("status").textContent = "Failed to load file list.";
        }
    }

    // Function to load the content of a selected file
    async function loadFileContent(fileName) {
        try {
            const response = await fetch(`https://api.github.com/repos/fantrove-hub/fantrove-hub.github.io/contents${folderPath}${fileName}`, {
                headers: {
                    Authorization: `Bearer ${process.env.MY_GITHUB_TOKEN}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch file content: ${response.statusText}`);
            }

            const fileData = await response.json();
            const content = atob(fileData.content); // Decode Base64 content
            document.getElementById("jsonEditor").value = JSON.stringify(JSON.parse(content), null, 4);
            document.getElementById("contentEditor").style.display = "block";
        } catch (error) {
            document.getElementById("status").textContent = "Failed to load file content.";
        }
    }

    // Function to create a new file
    async function createNewFile() {
        document.getElementById("jsonEditor").value = JSON.stringify([], null, 4);
        document.getElementById("contentEditor").style.display = "block";
    }

    // Function to commit changes to a file in the repository
    async function commitToGitHub(content, fileName) {
        try {
            const response = await fetch(`https://api.github.com/repos/fantrove-hub/fantrove-hub.github.io/contents${folderPath}${fileName}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${process.env.MY_GITHUB_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: `Update ${fileName}`,
                    content: btoa(content), // Encode to Base64
                    branch: "main",
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to commit file: ${response.statusText}`);
            }

            document.getElementById("status").textContent = "Successfully committed!";
        } catch (error) {
            document.getElementById("status").textContent = "Failed to commit changes.";
        }
    }

    // Event listener for the authentication form submission
    document.getElementById("authFormInput").addEventListener("submit", (event) => {
        event.preventDefault();
        const name = document.getElementById("devName").value;
        const key = document.getElementById("secretKey").value;
        if (validateCredentials(name, key)) {
            switchToEditorUI();
            loadFileList();
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now() }));
        } else {
            alert("Access Denied");
        }
    });

    // Event listener for loading a file
    document.getElementById("loadFile").addEventListener("click", () => {
        const fileName = document.getElementById("fileList").value;
        if (fileName) {
            loadFileContent(fileName);
        } else {
            alert("Please select a file.");
        }
    });

    // Event listener for creating a new file
    document.getElementById("createFile").addEventListener("click", () => {
        createNewFile();
    });

    // Event listener for committing changes
    document.getElementById("commitChanges").addEventListener("click", () => {
        const content = document.getElementById("jsonEditor").value;
        const fileName = document.getElementById("fileList").value || "new-file.json";
        commitToGitHub(content, fileName);
    });

    // Automatically switch to the editor UI if cached authentication exists
    const cached = localStorage.getItem(cacheKey);
    if (cached && Date.now() - JSON.parse(cached).timestamp < cacheDuration) {
        switchToEditorUI();
        loadFileList();
    }
})();