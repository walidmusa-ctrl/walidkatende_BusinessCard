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
const urlProfileId = params.get("id");

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
let finalCroppedFileInstance = null;

async function checkUserSession() {
    if (!dbClient) return;

    const { data: { session }, error } = await dbClient.auth.getSession();

    // Alert blocks completely removed here - forwards instantly without interruptions
    if (error || !session) {
        window.location.href = "auth.html";
        return;
    }

    currentLoggedInUuid = session.user.id;

    if (urlProfileId && urlProfileId !== currentLoggedInUuid) {
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

        const previewCircle = document.getElementById("cropPreviewCircle");
        if (previewCircle && data.profileImage) {
            previewCircle.style.backgroundImage = `url('${data.profileImage}')`;
        }

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
        item.innerHTML = `
            <label style="text-transform: capitalize;">${type}</label>
            <div class="input-icon">
                <i class="fa-slate-icon fa-solid fa-link"></i>
                <input type="text" data-social="${type}" value="${val}" placeholder="Username or full URL link">
            </div>
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

        if (type === "cv" || type === "portfolio") {
            item.innerHTML = `
                <label>${labelText} ${val ? '<span style="color: #00dfca; font-size: 11px; margin-left:6px;">(Attached ✓)</span>' : ''}</label>
                <div class="file-upload-wrapper">
                    <input type="file" onchange="handleFileUpload(event, '${type}')">
                </div>
            `;
        } else {
            item.innerHTML = `
                <label>${labelText}</label>
                <div class="input-icon">
                    <i class="fa-slate-icon fa-solid fa-pen-to-square"></i>
                    <input type="text" data-contact="${type}" value="${val}" placeholder="Provide direct target input value">
                </div>
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
        item.style.border = "1px solid rgba(255, 255, 255, 0.06)";
        item.style.padding = "16px";
        item.style.borderRadius = "16px";
        item.style.marginBottom = "16px";
        item.style.background = "rgba(0, 0, 0, 0.2)";

        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <span style="font-size:13px; font-weight:600; color: #919eab;">Project #${index + 1}</span>
                <button type="button" onclick="removeProject(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:13px; font-weight:500; display:flex; align-items:center; gap:4px;"><i class="fa-solid fa-trash-can"></i> Delete</button>
            </div>

            <div class="form-group">
                <label>Project Title</label>
                <input type="text" class="project-title-input" data-index="${index}" value="${project.title || ''}" placeholder="e.g., Trailer Chassis Design">
            </div>

            <div class="form-group" style="margin-top: 12px;">
                <label>Project Image Media File</label>
                <input type="file" onchange="uploadProjectImage(${index}, this)">
                <div id="project-preview-wrapper-${index}">
                    ${project.image ? `<img src="${project.image}" style="width:100%; height:140px; object-fit:cover; border-radius:12px; margin-top:12px; border:1px solid rgba(255,255,255,0.08);">` : ''}
                </div>
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

async function handleProfileImageUpload(readyFile) {
    const file = readyFile;
    if (!file || !dbClient || !currentLoggedInUuid) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`;

    const { error: uploadError } = await dbClient.storage
        .from('files')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Storage upload details failure log:", uploadError);
        return;
    }

    const { data: { publicUrl } } = dbClient.storage
        .from('files')
        .getPublicUrl(filePath);

    profileData.profileImage = publicUrl;
}

async function handleFileUpload(e, type) {
    const file = e.target.files[0];
    if (!file || !dbClient || !currentLoggedInUuid) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`;

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

    if (!profileData.links) profileData.links = [];
    profileData.links = profileData.links.filter(l => l.type !== type);
    profileData.links.push({ type: type, value: publicUrl });

    alert(`${type.toUpperCase()} uploaded successfully! Remember to save changes.`);
    buildContactEditor();
}

async function uploadProjectImage(index, inputElement) {
    const file = inputElement.files[0];
    if (!file || !dbClient || !currentLoggedInUuid) return;

    syncProjectsDataTitles();

    if (!projectsData[index]) {
        projectsData[index] = { title: "", image: "" };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `project-${index}-${Date.now()}.${fileExt}`;
    const filePath = `${currentLoggedInUuid}/${fileName}`;

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
            wrapper.innerHTML = `<img src="${publicUrl}" style="width:100%; height:140px; object-fit:cover; border-radius:12px; margin-top:12px; border:1px solid rgba(255,255,255,0.08);">`;
        }
    } catch (err) {
        console.error("Upload handler operational exception error:", err);
    }
}

async function saveProfile() {
    if (!dbClient || !currentLoggedInUuid) return;

    syncProjectsDataTitles();

    if (finalCroppedFileInstance) {
        await handleProfileImageUpload(finalCroppedFileInstance);
    }

    profileData.workplace = document.getElementById("workplaceInput").value;
    profileData.title = document.getElementById("titleInput").value;
    profileData.bio = document.getElementById("bioInput").value;

    const dynamicLinksList = [];

    if (profileData.links) {
        const existingDocs = profileData.links.filter(l => l.type === "cv" || l.type === "portfolio");
        dynamicLinksList.push(...existingDocs);
    }

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

function initCropperEngine() {
    const imageInput = document.getElementById("imageInput");
    const cropperModal = document.getElementById("cropperModal");
    const cropCanvas = document.getElementById("cropCanvas");
    if (!imageInput || !cropperModal || !cropCanvas) return;

    const ctx = cropCanvas.getContext("2d");
    const cancelCropBtn = document.getElementById("cancelCropBtn");
    const confirmCropBtn = document.getElementById("confirmCropBtn");
    const previewCircle = document.getElementById("cropPreviewCircle");

    let sourceImage = new Image();
    let cropBox = { x: 50, y: 50, size: 200 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let originalFileName = "avatar.jpg";

    imageInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        originalFileName = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            sourceImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    sourceImage.onload = () => {
        cropCanvas.width = 400;
        cropCanvas.height = 400;
        cropBox.size = 220;
        cropBox.x = (cropCanvas.width - cropBox.size) / 2;
        cropBox.y = (cropCanvas.height - cropBox.size) / 2;

        cropperModal.style.display = "flex";
        drawCanvas();
    };

    function drawCanvas() {
        ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);

        const scale = Math.min(cropCanvas.width / sourceImage.width, cropCanvas.height / sourceImage.height);
        const nw = sourceImage.width * scale;
        const nh = sourceImage.height * scale;
        const nx = (cropCanvas.width - nw) / 2;
        const ny = (cropCanvas.height - nh) / 2;

        ctx.drawImage(sourceImage, nx, ny, nw, nh);

        ctx.fillStyle = "rgba(5, 7, 9, 0.65)";
        ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

        ctx.save();
        ctx.beginPath();
        ctx.arc(cropBox.x + cropBox.size / 2, cropBox.y + cropBox.size / 2, cropBox.size / 2, 0, Math.PI * 2);
        ctx.clip();

        ctx.drawImage(sourceImage, nx, ny, nw, nh);
        ctx.restore();

        ctx.strokeStyle = "#00dfca";
        ctx.lineWidth = 2;
        ctx.strokeRect(cropBox.x, cropBox.y, cropBox.size, cropBox.size);
    }

    cropCanvas.addEventListener("mousedown", (e) => {
        const rect = cropCanvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * cropCanvas.width;
        const mouseY = ((e.clientY - rect.top) / rect.height) * cropCanvas.height;

        if (mouseX >= cropBox.x && mouseX <= cropBox.x + cropBox.size &&
            mouseY >= cropBox.y && mouseY <= cropBox.y + cropBox.size) {
            isDragging = true;
            dragStart.x = mouseX - cropBox.x;
            dragStart.y = mouseY - cropBox.y;
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const rect = cropCanvas.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * cropCanvas.width;
        const mouseY = ((e.clientY - rect.top) / rect.height) * cropCanvas.height;

        let newX = mouseX - dragStart.x;
        let newY = mouseY - dragStart.y;

        newX = Math.max(0, Math.min(newX, cropCanvas.width - cropBox.size));
        newY = Math.max(0, Math.min(newY, cropCanvas.height - cropBox.size));

        cropBox.x = newX;
        cropBox.y = newY;
        drawCanvas();
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    cancelCropBtn.addEventListener("click", () => {
        cropperModal.style.display = "none";
        imageInput.value = "";
    });

    confirmCropBtn.addEventListener("click", () => {
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = 300;
        outputCanvas.height = 300;
        const oCtx = outputCanvas.getContext("2d");

        const scale = Math.min(cropCanvas.width / sourceImage.width, cropCanvas.height / sourceImage.height);
        const nw = sourceImage.width * scale;
        const nh = sourceImage.height * scale;
        const nx = (cropCanvas.width - nw) / 2;
        const ny = (cropCanvas.height - nh) / 2;

        const sourceCropX = (cropBox.x - nx) / scale;
        const sourceCropY = (cropBox.y - ny) / scale;
        const sourceCropSize = cropBox.size / scale;

        oCtx.drawImage(
            sourceImage,
            sourceCropX, sourceCropY, sourceCropSize, sourceCropSize,
            0, 0, 300, 300
        );

        outputCanvas.toBlob((blob) => {
            if (!blob) return;
            finalCroppedFileInstance = new File([blob], originalFileName, { type: "image/jpeg" });

            const previewUrl = URL.createObjectURL(blob);
            if (previewCircle) {
                previewCircle.style.backgroundImage = `url('${previewUrl}')`;
            }
            cropperModal.style.display = "none";
        }, "image/jpeg", 0.9);
    });
}

window.addProject = addProject;
window.removeProject = removeProject;
window.saveProfile = saveProfile;
window.cancelEdit = cancelEdit;
window.handleLogout = handleLogout;
window.handleFileUpload = handleFileUpload;
window.uploadProjectImage = uploadProjectImage;

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("addProjectBtn");
    if (btn) {
        btn.removeAttribute("onclick");
        btn.addEventListener("click", addProject);
    }

    initCropperEngine();
    checkUserSession();
});
