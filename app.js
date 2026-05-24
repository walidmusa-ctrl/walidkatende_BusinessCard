// ==========================================
// APP.JS (PRODUCTION SECURE UUID VERSION)
// ==========================================

const SUPABASE_URL = "https://rgfzodjtcfxnydgsuktn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZnpvZGp0Y2Z4bnlkZ3N1a3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI2NTcsImV4cCI6MjA4OTc1ODY1N30.3rXsRl4k6VmGk3gMCCPsI150NhelbI5SiRRE05cUIus";

let dbClient = null;

if (window.supabase) {
    dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase library not found!");
}

// Strictly tracking unique security ID parameter instead of easily guessable usernames
const params = new URLSearchParams(window.location.search);
const profileId = params.get("id");

const socialTypes = ["linkedin", "instagram", "twitter", "facebook", "youtube", "tiktok", "whatsapp", "website"];

const baseUrls = {
    linkedin: "https://linkedin.com/in/",
    instagram: "https://instagram.com/",
    twitter: "https://twitter.com/",
    facebook: "https://facebook.com/",
    youtube: "https://youtube.com/",
    tiktok: "https://tiktok.com/@",
    whatsapp: "https://wa.me/",
    website: "https://",
    email: "mailto:",
    portfolio: "",
    cv: "",
    address: ""
};

const namesMap = {
    linkedin: "LinkedIn",
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    youtube: "YouTube",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    website: "Website",
    email: "Email",
    portfolio: "Portfolio",
    cv: "CV",
    address: "Address",
    contact: "Save Contact"
};

const iconsMap = {
    linkedin: "fa-brands fa-linkedin",
    instagram: "fa-brands fa-instagram",
    twitter: "fa-brands fa-x-twitter",
    facebook: "fa-brands fa-facebook",
    youtube: "fa-brands fa-youtube",
    tiktok: "fa-brands fa-tiktok",
    whatsapp: "fa-brands fa-whatsapp",
    website: "fa-solid fa-globe",
    email: "fa-solid fa-envelope",
    portfolio: "fa-solid fa-briefcase",
    cv: "fa-solid fa-file",
    address: "fa-solid fa-location-dot",
    contact: "fa-solid fa-address-card"
};

async function fetchAndRenderProfile() {
    if (!dbClient) {
        revealCardContainer();
        return;
    }

    // LANDING PATH ROUTER: If there is no ID parameter, show the landing page
    if (!profileId) {
        showPlatformLandingPage();
        return;
    }

    try {
        const { data, error } = await dbClient
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single();

        if (error || !data) {
            showProfileNotFound();
            return;
        }

        // Unhide normal card elements and ensure landing structure is gone
        document.getElementById("landingPageHome").style.display = "none";
        document.getElementById("profileHeader").style.display = "flex";
        document.getElementById("bio").style.display = "block";
        document.getElementById("socialLinks").style.display = "flex";
        document.getElementById("contactLinks").style.display = "block";

        // Assign text nodes
        document.getElementById("name").textContent = data.name || "Digital Card";
        document.getElementById("workplace").textContent = data.workplace || "";
        document.getElementById("title").textContent = data.title || "";
        document.getElementById("bio").textContent = data.bio || "";

        if (data.profileImage) {
            document.getElementById("profileImage").src = data.profileImage;
        } else {
            document.getElementById("profileImage").src = "https://via.placeholder.com/150";
        }

        if (document.getElementById("editBtn")) {
            document.getElementById("editBtn").style.display = "flex";
            document.getElementById("editBtn").href = `edit.html?id=${profileId}`;
        }

        const socialContainer = document.getElementById("socialLinks");
        const contactContainer = document.getElementById("contactLinks");

        if (socialContainer) socialContainer.innerHTML = "";
        if (contactContainer) contactContainer.innerHTML = "";

        (data.links || []).forEach(link => {
            if (!link.value) return;

            const a = document.createElement("a");
            a.target = "_blank";

            if (link.type === "contact") {
                a.href = "javascript:void(0)";
                a.onclick = async (e) => {
                    e.preventDefault();
                    const vcf = await generateVCF(data, link.value);
                    downloadFile(vcf, (data.name || "profile") + ".vcf");
                };
            } else if (link.type === "address") {
                a.href = "http://maps.google.com/?q=" + encodeURIComponent(link.value);
            } else if (link.type === "portfolio" || link.type === "cv" || link.type === "email") {
                a.href = (link.type === "email" && !link.value.includes("mailto:")) ? "mailto:" + link.value : link.value;
            } else {
                a.href = link.value.startsWith("http") ? link.value : (baseUrls[link.type] + link.value);
            }

            if (socialTypes.includes(link.type)) {
                a.innerHTML = `<i class="${iconsMap[link.type]}"></i>`;
                if (socialContainer) socialContainer.appendChild(a);
            } else {
                a.innerHTML = `<span>${namesMap[link.type]}</span><i class="${iconsMap[link.type]}"></i>`;
                if (contactContainer) contactContainer.appendChild(a);
            }
        });

        const projectContainer = document.getElementById("projectContainer");
        const projectsSection = document.getElementById("projectsSection");

        if (projectContainer) {
            projectContainer.innerHTML = "";
            const validProjects = (data.projects || []).filter(p => p.image || p.title);

            if (validProjects.length === 0) {
                if (projectsSection) projectsSection.style.display = "none";
            } else {
                if (projectsSection) projectsSection.style.display = "block";
                validProjects.forEach(project => {
                    const div = document.createElement("div");
                    div.className = "project";
                    div.innerHTML = `
                        <img src="${project.image || 'https://via.placeholder.com/300'}" alt="project item">
                        <p>${project.title || ""}</p>
                    `;
                    projectContainer.appendChild(div);
                });
            }
        }
    } catch (err) {
        console.error("Profile view pipeline error:", err);
    } finally {
        revealCardContainer();
    }
}

function showPlatformLandingPage() {
    document.getElementById("landingPageHome").style.display = "block";

    // Shut down regular identity containers safely
    document.getElementById("profileHeader").style.display = "none";
    document.getElementById("bio").style.display = "none";
    document.getElementById("socialLinks").style.display = "none";
    document.getElementById("contactLinks").style.display = "none";
    if (document.getElementById("projectsSection")) {
        document.getElementById("projectsSection").style.display = "none";
    }
    if (document.getElementById("editBtn")) {
        document.getElementById("editBtn").style.display = "none";
    }
    revealCardContainer();
}

// APPEARS ONLY ON BROKEN PARAMETER DEVIATIONS
function showProfileNotFound() {
    document.getElementById("landingPageHome").style.display = "none";
    document.getElementById("profileHeader").style.display = "flex";
    document.getElementById("bio").style.display = "block";

    document.getElementById("name").textContent = "Profile Inactive";
    document.getElementById("workplace").textContent = "";
    document.getElementById("title").textContent = "Invalid Identification ID";
    document.getElementById("bio").textContent = "This digital profile link string is incorrect or the user account is awaiting activation approval.";
    document.getElementById("profileImage").src = "https://via.placeholder.com/150";

    if (document.getElementById("projectsSection")) document.getElementById("projectsSection").style.display = "none";
    if (document.getElementById("editBtn")) document.getElementById("editBtn").style.display = "none";
    revealCardContainer();
}

// CROSS-FADE OPACITY ENGINE TRIGGER
function revealCardContainer() {
    const mask = document.getElementById("loadingScreen");
    const container = document.getElementById("mainCardContainer");
    if (mask && container) {
        mask.style.opacity = "0";
        setTimeout(() => {
            mask.style.display = "none";
            container.style.opacity = "1";
            container.style.transform = "translateY(0)";
        }, 300);
    }
}

async function generateVCF(data, phone) {
    let vcf = `BEGIN:VCARD\r\nVERSION:3.0\r\n`;
    const displayName = data.name || "User";
    vcf += `FN:${displayName}\r\n`;
    vcf += `N:${displayName};;;;\r\n`;

    if (phone) vcf += `TEL;TYPE=CELL:${phone}\r\n`;

    const email = data.links?.find(l => l.type === "email")?.value;
    if (email) vcf += `EMAIL:${email}\r\n`;
    if (data.workplace) vcf += `ORG:${data.workplace}\r\n`;
    if (data.title) vcf += `TITLE:${data.title}\r\n`;

    const website = data.links?.find(l => l.type === "website")?.value;
    if (website) vcf += `URL:${website}\r\n`;

    const address = data.links?.find(l => l.type === "address")?.value;
    if (address) vcf += `ADR:;;${address};;;;\r\n`;

    if (data.profileImage) {
        const base64 = await getBase64Image(data.profileImage);
        if (base64) vcf += `PHOTO;ENCODING=b;TYPE=JPEG:${base64}\r\n`;
    }

    vcf += `END:VCARD`;
    return vcf;
}

async function getBase64Image(url) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.readAsDataURL(blob);
        });
    } catch {
        return "";
    }
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function scrollProjects(direction) {
    const container = document.getElementById("projectContainer");
    if (!container) return;
    container.scrollBy({
        left: direction * container.clientWidth,
        behavior: "smooth"
    });
}

window.scrollProjects = scrollProjects;
document.addEventListener("DOMContentLoaded", fetchAndRenderProfile);