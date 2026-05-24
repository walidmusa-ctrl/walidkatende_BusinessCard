// ==========================================
// EDIT.JS (SECURE UUID EDITION)
// ==========================================

const SUPABASE_URL = "https://rgfzodjtcfxnydgsuktn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZnpvZGp0Y2Z4bnlkZ3N1a3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI2NTcsImV4cCI6MjA4OTc1ODY1N30.3rXsRl4k6VmGk3gMCCPsI150NhelbI5SiRRE05cUIus";

let dbClient = null;

if (window.supabase) {
    dbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.error("Supabase library not found!");
}

const params = new URLSearchParams(window.location.search);
const urlProfileId = params.get("id"); // Read unique ID parameter

let profileData = {
    name: "",
    workplace: "",
    title: "",
    bio: "",
    profileImage: "",
    links: [],
    projects: []
};

let projectsData = [];
const socialTypes = ["linkedin", "instagram", "twitter", "facebook", "youtube", "tiktok", "whatsapp", "website"];
const contactTypes = ["phone", "email", "whatsapp", "website", "address", "portfolio", "cv", "contact"];

let currentLoggedInUuid = null;

async function checkUserSession() {
    if (!dbClient) return;

    const { data: { session }, error } = await dbClient.auth.getSession();

    if (error || !session) {
        alert("Authentication required. Redirecting to login context...");
        window.location.href = "auth.html";
        return;
    }

    currentLoggedInUuid = session.user.id;

    if (urlProfileId && urlProfileId !== currentLoggedInUuid) {
        alert("Access Denied: You do not possess structural permissions to manage this profile parameter.");
        window.location.href = `edit.html?id=${currentLoggedInUuid}`;
        return;
    }

    document.getElementById("editPageBody").style.display = "block";
    await loadProfileData();
}

async function loadProfileData() {
    const targetId = urlProfileId || currentLoggedInUuid;
    if (!targetId || !dbClient) return;

    const { data, error = null } = await dbClient
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error("Failed to fetch cloud entity parameters:", error);
        return;
    }

    if (data) {
        profileData = data;
        projectsData = data.projects || [];

        document.getElementById("workplaceInput").value = data.workplace || "";
        document.getElementById("titleInput").value = data.title || "";
        document.getElementById("bioInput").value = data.bio || "";

        buildSocialEditor();
        buildContactEditor();
        buildProjectsEditor();
    }
}

function buildSocialEditor() {
    const container = document.getElementById("socialEditor");
    if (!container) return;
    container.innerHTML = "";

    socialTypes.forEach(type => {
        const existingLink = profileData.links?.find(l => l.type === type);
        const val = existingLink ? existingLink.value : "";

        const item = document.createElement("div");
        item.className = "form-group";
        item.style.marginBottom = "12px";
        item.innerHTML = `
            <label style="text-transform: capitalize; margin-top: 8px;">${type}</label>
            <input type="text" data-social="${type}" value="${val}" placeholder="Username or full URL mapping link">
        `;
        container.appendChild(item);
    });
}

function buildContactEditor() {
    const container = document.getElementById("contactEditor");
    if (!container) return;
    container.innerHTML = "";

    const functionalNonSocials = ["email", "address", "portfolio", "cv", "contact"];

    functionalNonSocials.forEach(type => {
        const existingLink = profileData.links?.find(l => l.type === type);
        const val = existingLink ? existingLink.value : "";

        let labelText = type.toUpperCase();
        if (type === "contact") labelText = "PHONE NUMBER (FOR VCARD SAVE)";

        const item = document.createElement("div");
        item.className = "form-group";
        item.style.marginBottom = "12px";

        // Check if field is file or text
        if (type === "cv" || type === "portfolio") {
            item.innerHTML = `
                <label style="margin-top: 8px;">${labelText} (Current Link: ${val ? 'Attached ✓' : 'None'})</label>
                <input type="file" onchange="handleFileUpload(event, '${type}')">
            `;
        } else {
            item.innerHTML = `
                <label style="margin-top: 8px;">${labelText}</label>
                <input type="text" data-contact="${type}" value="${val}" placeholder="Provide direct target input value data">
            `;
        }
        container.appendChild(item);
    });
}

function buildProjectsEditor() {
    const container = document.getElementById("projectsEditor");
    if (!container) return;
    container.innerHTML = "";

    projectsData.forEach((project, index) => {
        const item = document.createElement("div");
        item.className = "project-edit-item";
        item.style.border = "1px solid #333";
        item.style.padding = "15px";
        item.style.borderRadius = "10px";
        item.style.marginBottom = "15px";
        item.style.background = "#161616";

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <span style="font-size:14px; font-weight:bold; color:#aaa;">Project #${index + 1}</span>
                <button type="button" onclick="removeProject(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
            <label style="margin-top:5px;">Project Title</label>
            <input type="text" class="project-title-input" data-index="${index}" value="${project.title || ''}">

            <label style="margin-top:10px;">Project Image</label>
            <input type="file" onchange="uploadProjectImage(${index}, this)">
            <div id="project-preview-wrapper-${index}">
                ${project.image ? `<img src="${project.image}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-top:10px; border:1px solid #222;">` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

function addProject() {
    syncProjectsDataTitles();
    projectsData.push({ title: "", image: "" });
    buildProjectsEditor();
}

function removeProject(index) {
    syncProjectsDataTitles();
    projectsData.splice(index, 1);
    buildProjectsEditor();
}

function syncProjectsDataTitles() {
    const inputs = document.querySelectorAll(".project-title-input");
    inputs.forEach(input => {
        const idx = parseInt(input.getAttribute("data-index"), 10);
        if (projectsData[idx]) {
            projectsData[idx].title = input.value;
        }
    });
}

// FIXED: Now accurately directs profile images to your specific user folder inside 'files' bucket
async function handleProfileImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !dbClient || !currentLoggedInUuid) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`; // Dynamic User Folder Isolation

    const { error: uploadError } = await dbClient.storage
        .from('files')
        .upload(filePath, file);

    if (uploadError) {
        alert("Image deployment to server storage failed: " + uploadError.message);
        return;
    }

    const { data: { publicUrl } } = dbClient.storage
        .from('files')
        .getPublicUrl(filePath);

    profileData.profileImage = publicUrl;
    alert("Profile picture loaded successfully! Remember to save changes.");
}

// FIXED: Handles structural CV/Portfolio PDF or Doc uploads inside 'files' bucket
async function handleFileUpload(e, type) {
    const file = e.target.files[0];
    if (!file || !dbClient || !currentLoggedInUuid) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`; // Dynamic User Folder Isolation

    const { error: uploadError } = await dbClient.storage
        .from('files')
        .upload(filePath, file, { upsert: true });

    if (uploadError) {
        alert(`Uploading your ${type.toUpperCase()} failed: ` + uploadError.message);
        return;
    }

    const { data: { publicUrl } } = dbClient.storage
        .from('files')
        .getPublicUrl(filePath);

    // Remove old matching types if they exist, then append new clean cloud URL mapping reference
    profileData.links = profileData.links.filter(l => l.type !== type);
    profileData.links.push({ type: type, value: publicUrl });

    alert(`${type.toUpperCase()} uploaded successfully! Remember to save changes.`);
}

// FIXED: Now accurately directs project images into 'files' bucket using user isolated folders
async function uploadProjectImage(index, inputElement) {
    const file = inputElement.files[0];
    if (!file || !dbClient || !currentLoggedInUuid) return;

    syncProjectsDataTitles();

    if (!projectsData[index]) {
        projectsData[index] = { title: "", image: "" };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `project-${index}-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`; // Dynamic User Folder Isolation

    try {
        const { error: uploadError } = await dbClient.storage
            .from('files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error("Storage upload details failure log:", uploadError);
            alert("Project image deployment failed: " + uploadError.message);
            return;
        }

        const { data: { publicUrl } } = dbClient.storage
            .from('files')
            .getPublicUrl(filePath);

        projectsData[index].image = publicUrl;

        const wrapper = document.getElementById(`project-preview-wrapper-${index}`);
        if (wrapper) {
            wrapper.innerHTML = `<img src="${publicUrl}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-top:10px; border:1px solid #222;">`;
        }
    } catch (err) {
        console.error("Upload handler operational exception error:", err);
    }
}

async function saveProfile() {
    if (!dbClient || !currentLoggedInUuid) return;

    syncProjectsDataTitles();

    profileData.workplace = document.getElementById("workplaceInput").value;
    profileData.title = document.getElementById("titleInput").value;
    profileData.bio = document.getElementById("bioInput").value;

    const dynamicLinksList = [];

    // Keep already uploaded documents (cv/portfolio links)
    const existingDocs = profileData.links.filter(l => l.type === "cv" || l.type === "portfolio");
    dynamicLinksList.push(...existingDocs);

    const socialInputs = document.querySelectorAll("[data-social]");
    socialInputs.forEach(input => {
        const type = input.getAttribute("data-social");
        if (input.value.trim()) {
            dynamicLinksList.push({ type: type, value: input.value.trim() });
        }
    });

    const contactInputs = document.querySelectorAll("[data-contact]");
    contactInputs.forEach(input => {
        const type = input.getAttribute("data-contact");
        if (input.value.trim()) {
            dynamicLinksList.push({ type: type, value: input.value.trim() });
        }
    });

    profileData.links = dynamicLinksList;
    profileData.projects = projectsData;

    const { error } = await dbClient
        .from('profiles')
        .upsert({
            id: currentLoggedInUuid,
            username: profileData.username,
            name: profileData.name || "User",
            workplace: profileData.workplace,
            title: profileData.title,
            bio: profileData.bio,
            profileImage: profileData.profileImage,
            links: profileData.links,
            projects: profileData.projects
        });

    if (error) {
        console.error("Save failed:", error);
        alert("Error saving records.");
    } else {
        alert("Saved to Cloud successfully! ✓");
        window.location.href = `index.html?id=${currentLoggedInUuid}`;
    }
}

function cancelEdit() {
    const targetId = urlProfileId || currentLoggedInUuid;
    if (targetId) {
        window.location.href = `index.html?id=${targetId}`;
    } else {
        window.location.href = "index.html";
    }
}

async function handleLogout() {
    if (!dbClient) return;

    const activeProfileId = urlProfileId || currentLoggedInUuid;

    try {
        await dbClient.auth.signOut();
    } catch (err) {
        console.error("Signout sequence log execution error:", err);
    } finally {
        if (activeProfileId) {
            window.location.href = `index.html?id=${activeProfileId}`;
        } else {
            window.location.href = "index.html";
        }
    }
}

// Global scope window bindings
window.addProject = addProject;
window.removeProject = removeProject;
window.saveProfile = saveProfile;
window.cancelEdit = cancelEdit;
window.handleLogout = handleLogout;
window.handleFileUpload = handleFileUpload;
window.uploadProjectImage = uploadProjectImage;

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("addProjectBtn");
    if (btn) btn.addEventListener("click", addProject);

    const imgInput = document.getElementById("imageInput");
    if (imgInput) imgInput.addEventListener("change", handleProfileImageUpload);

    checkUserSession();
});