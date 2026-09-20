const BASE_URL = "http://127.0.0.1:8000";
const AI_API_BASE = "http://127.0.0.1:8000/api/v1";
const token = localStorage.getItem("token");
const isGuest = localStorage.getItem("loggedIn") === "true";

if (
    window.location.pathname.includes("dashboard.html") ||
    window.location.pathname.includes("childinfo.html") ||
    window.location.pathname.includes("test.html") ||
    window.location.pathname.includes("report.html")
) {
    if (!token && !isGuest && !getSignedInUser()) {
        window.location.href = "login.html";
    }
    if (isGuest && window.location.pathname.includes("dashboard.html")) {
        window.location.href = "index.html";
    }
}



function goToTest() {
    window.location.href = token || isGuest || getSignedInUser() ? "childinfo.html" : "login.html";
}

function getSignedInUser() {
    try { return JSON.parse(localStorage.getItem("neurayaSignedInUser") || "null"); }
    catch { return null; }
}

function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem("neurayaUsers") || "{}"); }
    catch { return {}; }
}

function scrollToWhy() {
    document.getElementById("why").scrollIntoView({behavior: "smooth"});
}

// SIGNIN
async function loginUser() {

    let email = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let errorMsg = document.getElementById("errorMsg");

    errorMsg.innerText = "";

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        errorMsg.innerText = "Please enter a valid email address.";
        return;
    }

    if (!password) {
        errorMsg.innerText = "Please enter password.";
        return;
    }

    const user = getLocalUsers()[email.toLowerCase()];
    if (!user || user.password !== password) {
        errorMsg.innerText = "Invalid email or password. Create an account first.";
        return;
    }
    localStorage.removeItem("loggedIn");
    localStorage.setItem("username", user.name);
    localStorage.setItem("neurayaSignedInUser", JSON.stringify({ email: email.toLowerCase(), name: user.name }));
    window.location.href = "dashboard.html";
}

// SIGNUP
async function signupUser() {
    let name = document.getElementById("signupName").value.trim();
    let email = document.getElementById("signupEmail").value.trim();
    let password = document.getElementById("signupPassword").value.trim();
    let msg = document.getElementById("signupMsg");

    msg.style.color = "red";
    msg.innerText = "";

    if (name.length < 2) {
        msg.innerText = "Please enter a name with at least 2 characters.";
        return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        msg.innerText = "Please enter a valid email address.";
        return;
    }

    if (!password) {
        msg.innerText = "Please create a password.";
        return;
    }

    if (password.length < 6) {
        msg.innerText = "Password must be at least 6 characters.";
        return;
    }

    const users = getLocalUsers();
    const userEmail = email.toLowerCase();
    if (users[userEmail]) { msg.innerText = "An account already exists for this email."; return; }
    users[userEmail] = { name, password };
    localStorage.setItem("neurayaUsers", JSON.stringify(users));
    msg.style.color = "green";
    msg.innerText = "Account created. You can now sign in.";
    setTimeout(() => { window.location.href = "login.html"; }, 900);
}

// GUEST
function continueGuest() {
    localStorage.setItem("username", "Guest");
    localStorage.setItem("loggedIn", "true");
    window.location.href = "childinfo.html";
 }


// LOGOUT
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("neurayaSignedInUser");
    localStorage.removeItem("username");
    window.location.href = "index.html";
}

// NAVBAR GREETING
document.addEventListener("DOMContentLoaded", function () {

    const userArea = document.getElementById("userArea");
    if (!userArea) return;

    const token = localStorage.getItem("token");

    if (token || getSignedInUser()) {
        userArea.innerHTML = `
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="logout()">Logout</button>
        `;
    }
    if (isGuest) {
        document.querySelectorAll('a[href="dashboard.html"]').forEach(link => link.closest("li")?.remove());
    }
});

function startScreening() {
    window.location.href = "test.html";
}

function goBackFromChild() {
    window.location.href = getSignedInUser() ? "dashboard.html" : "index.html";
    return false;
}

/* Small-scale local screening engine. It intentionally provides a screening
   estimate, never a diagnosis, and keeps guest information in this browser. */
async function analyzeOpenEndedAnswers(answers) {
    const textAnswers = Object.fromEntries(Object.entries(answers || {}).filter(([, value]) => typeof value === "string" && value.trim()));
    if (!Object.keys(textAnswers).length) return null;
    try {
        const response = await fetch(`${AI_API_BASE}/analyze-text`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: textAnswers })
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

function createLocalScreeningReport(answers, textAnalysis = null) {
    const domains = ["Social connection", "Communication", "Sensory experiences", "Emotional regulation"];
    const totals = [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];
    let languageSignals = [0, 0, 0, 0];
    const languagePatterns = [
        /(?:no eye contact|does(?:n't| not) respond|avoids people|plays alone|does(?:n't| not) play)/gi,
        /(?:nonverbal|no words|not talking|does(?:n't| not) communicate|repeats? words)/gi,
        /(?:covers ears|loud sounds?|noise|texture|bright lights?|very sensitive)/gi,
        /(?:meltdown|panic|aggressive|change in routine|cannot calm|very upset)/gi
    ];

    if (textAnalysis?.domain_signals) {
        languageSignals = ["social", "communication", "sensory", "regulation"].map(domain => Math.min(4, Math.max(0, Number(textAnalysis.domain_signals[domain]) || 0)));
    }
    Object.entries(answers || {}).forEach(([key, value]) => {
        const section = Number(key.split("-")[0]);
        if (typeof value === "number" && section >= 0 && section < 4) {
            totals[section] += value;
            counts[section] += 1;
        }
        if (!textAnalysis?.domain_signals && typeof value === "string" && section >= 0 && section < 4) {
            languageSignals[section] += (value.match(languagePatterns[section]) || []).length;
        }
    });

    const section_breakdown = {};
    domains.forEach((domain, index) => {
        const questionnaireScore = counts[index] ? (totals[index] / (counts[index] * 3)) * 100 : 0;
        // Parent language is analysed per domain and contributes up to 25% of it.
        const languageScore = Math.min(100, languageSignals[index] * 25);
        section_breakdown[domain] = Math.round(questionnaireScore * 0.75 + languageScore * 0.25);
    });
    const probability = Math.round(Object.values(section_breakdown).reduce((sum, score) => sum + score, 0) / 4);
    const risk = probability < 34 ? "Low" : probability < 67 ? "Moderate" : "High";
    const child = JSON.parse(localStorage.getItem("guestChild") || localStorage.getItem("neurayaChild") || "{}");

    return {
        probability, risk, section_breakdown, languageSignals, languageAnalysisSource: textAnalysis?.source || "browser-fallback",
        child, createdAt: new Date().toISOString(),
        explanations: {
            "Social connection": "Includes questionnaire responses and relevant language in your observation.",
            "Communication": "Includes questionnaire responses and relevant language in your observation.",
            "Sensory experiences": "Includes questionnaire responses and relevant language in your observation.",
            "Emotional regulation": "Includes questionnaire responses and relevant language in your observation."
        }
    };
}

function saveLocalScreening(answers, textAnalysis = null) {
    const report = createLocalScreeningReport(answers, textAnalysis);
    const activeChildId = sessionStorage.getItem("neurayaActiveChildId");
    const user = getSignedInUser();
    const child = getChildren().find(item => item.id === activeChildId && item.userEmail === user?.email);
    if (!child) throw new Error("Choose a child from your dashboard before starting a screening.");
    report.child = child;
    report.childId = child.id;
    report.userEmail = user.email;
    localStorage.setItem("neurayaLatestReport", JSON.stringify(report));
    const history = JSON.parse(localStorage.getItem("neurayaScreeningHistory") || "[]");
    history.unshift(report);
    localStorage.setItem("neurayaScreeningHistory", JSON.stringify(history.slice(0, 10)));
    return report;
}

function getChildren() {
    try { return JSON.parse(localStorage.getItem("neurayaChildren") || "[]"); }
    catch { return []; }
}

// Overrides the legacy server-only profile flow with a complete small-scale
// signed-in experience. Duplicate names are allowed; each profile has its own ID.
function goNextStep() {
    const name = document.getElementById("childName").value.trim().replace(/\s+/g, " ");
    const dob = document.getElementById("childDOB").value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value || "";
    const relationship = document.getElementById("relationship").value;
    const familyHistory = document.querySelector('input[name="asd"]:checked')?.value || "Not provided";
    const birthDate = new Date(`${dob}T00:00:00`);
    if (name.length < 2 || !/^[\p{L} .'-]+$/u.test(name)) { alert("Enter a valid child name (at least 2 letters)."); return; }
    if (!dob || Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) { alert("Enter a valid date of birth in the past."); return; }
    if (!gender || !relationship) { alert("Please select gender and your relationship to the child."); return; }
    if (!document.getElementById("screeningConsent")?.checked) { alert("Please confirm consent before continuing."); return; }
    const profile = { name, dob, gender, relationship, familyHistory };

    if (localStorage.getItem("loggedIn") === "true") {
        sessionStorage.setItem("neurayaGuestChild", JSON.stringify(profile));
        window.location.href = "disclaimer.html";
        return;
    }
    const user = getSignedInUser();
    if (!user) { window.location.href = "login.html"; return; }
    const children = getChildren();
    const editId = sessionStorage.getItem("neurayaEditingChildId");
    if (editId) {
        const index = children.findIndex(child => child.id === editId && child.userEmail === user.email);
        if (index < 0) { alert("This child profile could not be found."); return; }
        children[index] = { ...children[index], ...profile };
        sessionStorage.removeItem("neurayaEditingChildId");
        localStorage.setItem("neurayaChildren", JSON.stringify(children));
        window.location.href = "dashboard.html";
        return;
    }
    const id = globalThis.crypto?.randomUUID?.() || `child-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    children.push({ id, userEmail: user.email, ...profile });
    localStorage.setItem("neurayaChildren", JSON.stringify(children));
    sessionStorage.setItem("neurayaActiveChildId", id);
    window.location.href = "disclaimer.html";
}

function prepareChildForm() {
    const user = getSignedInUser();
    const id = sessionStorage.getItem("neurayaEditingChildId");
    if (!user || !id || !document.getElementById("childName")) return;
    const child = getChildren().find(item => item.id === id && item.userEmail === user.email);
    if (!child) return;
    document.getElementById("childName").value = child.name;
    document.getElementById("childDOB").value = child.dob;
    document.querySelector(`input[name="gender"][value="${child.gender}"]`)?.click();
    document.getElementById("relationship").value = child.relationship || "";
    document.querySelector(`input[name="asd"][value="${child.familyHistory}"]`)?.click();
    document.getElementById("screeningConsent").checked = true;
    document.querySelector(".main-title").textContent = "Edit Child Information";
    document.querySelector(".continue-btn").textContent = "Save Changes";
}

document.addEventListener("DOMContentLoaded", prepareChildForm);
